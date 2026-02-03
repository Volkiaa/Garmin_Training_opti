"""Worker jobs module."""

import asyncio
import aiohttp
import sys
import os
from datetime import datetime, date, timedelta
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from worker.config import settings
from app.database import AsyncSessionLocal
from app.core.sync_lock import acquire_sync_lock, release_sync_lock
from app.models import SyncJob, SyncStatusEnum, TriggeredByEnum
from app.services.garmin_sync import get_sync_service
from app.services.activity_service import ActivityService, HealthService, MetricsService
from app.core.classifiers import (
    classify_discipline,
    infer_intensity_zone,
    infer_body_regions,
)
from sqlalchemy import select


async def hourly_sync_job():
    """
    Hourly job to check for new activities.
    Runs at the start of each hour.
    """
    if not settings.auto_sync_enabled:
        print(
            f"[{datetime.now().isoformat()}] Auto-sync disabled, skipping hourly sync"
        )
        return

    print(f"[{datetime.now().isoformat()}] Starting hourly sync...")

    async with AsyncSessionLocal() as db:
        lock_acquired = False
        sync_job = None

        try:
            # Acquire advisory lock
            lock_acquired = await acquire_sync_lock(db)
            if not lock_acquired:
                print(
                    f"[{datetime.now().isoformat()}] Sync already in progress, skipping hourly sync"
                )
                return

            # Create sync job record
            sync_job = SyncJob(
                started_at=datetime.now(),
                status=SyncStatusEnum.running,
                triggered_by=TriggeredByEnum.hourly,
            )
            db.add(sync_job)
            await db.flush()

            # Initialize services
            sync_service = get_sync_service()
            activity_service = ActivityService(db)

            # Authenticate with Garmin
            if not sync_service.authenticate():
                raise Exception("Failed to authenticate with Garmin")

            # Calculate date range (last 2 hours to catch edge cases)
            end_date = date.today()
            start_date = end_date - timedelta(
                days=1
            )  # Check last 24 hours for new activities

            # Fetch activities
            activities = sync_service.get_activities_by_date(start_date, end_date)
            activities_found = len(activities)
            activities_synced = 0

            # Sync new activities
            for activity_summary in activities:
                activity_id = activity_summary.get("activityId")
                if not activity_id:
                    continue

                # Check if already exists
                existing = await activity_service.get_by_garmin_id(str(activity_id))
                if existing:
                    continue

                # Parse and create activity
                parsed = sync_service.parse_activity_data(activity_summary)

                # Get user settings for classification
                from app.models import UserSettings

                settings_result = await db.execute(select(UserSettings))
                user_settings = settings_result.scalar_one_or_none()
                max_hr = user_settings.max_hr if user_settings else 185

                # Classify activity
                discipline = classify_discipline(parsed)
                intensity = infer_intensity_zone(parsed, max_hr)
                body_regions = infer_body_regions(discipline)

                parsed["discipline"] = discipline
                parsed["intensity_zone"] = intensity
                parsed["body_regions"] = body_regions

                # Calculate training load if not present
                if not parsed.get("training_load"):
                    from app.core.training_load import calculate_load

                    parsed["training_load"] = calculate_load(parsed, max_hr)

                await activity_service.create(parsed)
                activities_synced += 1

            # Update sync job
            sync_job.status = SyncStatusEnum.completed
            sync_job.completed_at = datetime.now()
            sync_job.activities_found = activities_found
            sync_job.activities_synced = activities_synced
            await db.commit()

            print(
                f"[{datetime.now().isoformat()}] Hourly sync completed: {activities_synced} new activities"
            )

            # Notify backend if new activities found
            if activities_synced > 0:
                await notify_backend("new_activities", activities_synced, 0)

        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Hourly sync failed: {e}")
            if sync_job:
                sync_job.status = SyncStatusEnum.failed
                sync_job.completed_at = datetime.now()
                sync_job.error_message = str(e)
                await db.commit()
            raise
        finally:
            if lock_acquired:
                await release_sync_lock(db)


async def daily_sync_job():
    """
    Daily job to refresh all dashboard metrics.
    Runs at configured hour (default 6 AM).
    """
    if not settings.auto_sync_enabled:
        print(f"[{datetime.now().isoformat()}] Auto-sync disabled, skipping daily sync")
        return

    print(f"[{datetime.now().isoformat()}] Starting daily dashboard refresh...")

    async with AsyncSessionLocal() as db:
        lock_acquired = False
        sync_job = None

        try:
            # Acquire advisory lock
            lock_acquired = await acquire_sync_lock(db)
            if not lock_acquired:
                print(
                    f"[{datetime.now().isoformat()}] Sync already in progress, skipping daily sync"
                )
                return

            # Create sync job record
            sync_job = SyncJob(
                started_at=datetime.now(),
                status=SyncStatusEnum.running,
                triggered_by=TriggeredByEnum.daily,
            )
            db.add(sync_job)
            await db.flush()

            # Initialize services
            sync_service = get_sync_service()
            activity_service = ActivityService(db)
            health_service = HealthService(db)
            metrics_service = MetricsService(db)

            # Authenticate with Garmin
            if not sync_service.authenticate():
                raise Exception("Failed to authenticate with Garmin")

            # Calculate date ranges
            end_date = date.today()
            yesterday = end_date - timedelta(days=1)

            # Sync activities for yesterday and today
            activities = sync_service.get_activities_by_date(yesterday, end_date)
            activities_found = len(activities)
            activities_synced = 0

            for activity_summary in activities:
                activity_id = activity_summary.get("activityId")
                if not activity_id:
                    continue

                existing = await activity_service.get_by_garmin_id(str(activity_id))
                if existing:
                    continue

                parsed = sync_service.parse_activity_data(activity_summary)

                from app.models import UserSettings

                settings_result = await db.execute(select(UserSettings))
                user_settings = settings_result.scalar_one_or_none()
                max_hr = user_settings.max_hr if user_settings else 185

                discipline = classify_discipline(parsed)
                intensity = infer_intensity_zone(parsed, max_hr)
                body_regions = infer_body_regions(discipline)

                parsed["discipline"] = discipline
                parsed["intensity_zone"] = intensity
                parsed["body_regions"] = body_regions

                if not parsed.get("training_load"):
                    from app.core.training_load import calculate_load

                    parsed["training_load"] = calculate_load(parsed, max_hr)

                await activity_service.create(parsed)
                activities_synced += 1

            # Sync health data for yesterday and today
            health_days_synced = 0
            for target_date in [yesterday, end_date]:
                health_data = sync_service.get_health_data(target_date)
                if health_data:
                    parsed_health = sync_service.parse_health_data(health_data)
                    avgs = await health_service.calculate_7day_averages(target_date)
                    parsed_health.update(avgs)
                    await health_service.upsert(parsed_health)
                    health_days_synced += 1

            # Recompute metrics for last 7 days
            week_start = end_date - timedelta(days=6)
            await metrics_service.recompute_metrics(week_start, end_date)

            # Update sync job
            sync_job.status = SyncStatusEnum.completed
            sync_job.completed_at = datetime.now()
            sync_job.activities_found = activities_found
            sync_job.activities_synced = activities_synced
            await db.commit()

            print(
                f"[{datetime.now().isoformat()}] Daily sync completed: {activities_synced} activities, {health_days_synced} health days"
            )

            # Notify backend
            await notify_backend(
                "dashboard_updated", activities_synced, health_days_synced
            )

        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Daily sync failed: {e}")
            if sync_job:
                sync_job.status = SyncStatusEnum.failed
                sync_job.completed_at = datetime.now()
                sync_job.error_message = str(e)
                await db.commit()
            raise
        finally:
            if lock_acquired:
                await release_sync_lock(db)


async def notify_backend(
    update_type: str, activities_synced: int = 0, health_days: int = 0
):
    """
    Notify backend of sync completion via HTTP POST.
    Backend will then broadcast to WebSocket clients.
    """
    payload = {
        "type": update_type,
        "sync_timestamp": datetime.now().isoformat(),
        "activities_synced": activities_synced,
        "health_days": health_days,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{settings.backend_url}/api/v1/sync/notify", json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"[{datetime.now().isoformat()}] Backend notified: {result}")
                else:
                    print(
                        f"[{datetime.now().isoformat()}] Failed to notify backend: {response.status}"
                    )
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] Error notifying backend: {e}")
