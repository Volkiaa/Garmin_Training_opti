#!/usr/bin/env python3

import asyncio
import sys
import os
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.database import AsyncSessionLocal
from app.services.garmin_sync import get_sync_service
from app.services.activity_service import ActivityService, HealthService, MetricsService
from app.core.classifiers import (
    classify_discipline,
    infer_intensity_zone,
    infer_body_regions,
)


async def sync_garmin(days: int = 28):
    print(f"Syncing last {days} days from Garmin Connect...")

    sync_service = get_sync_service()

    if not sync_service.authenticate():
        print("Failed to authenticate with Garmin. Check your credentials in .env")
        return

    print("Authenticated successfully!")

    async with AsyncSessionLocal() as db:
        activity_service = ActivityService(db)
        health_service = HealthService(db)
        metrics_service = MetricsService(db)

        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        print(f"\nFetching activities from {start_date} to {end_date}...")
        activities = sync_service.get_activities_by_date(start_date, end_date)
        print(f"Found {len(activities)} activities")

        activities_synced = 0
        for activity_summary in activities:
            activity_id = activity_summary.get("activityId")
            if not activity_id:
                continue

            existing = await activity_service.get_by_garmin_id(str(activity_id))
            if existing:
                continue

            details = sync_service.get_activity_details(activity_id)
            if not details:
                continue

            parsed = sync_service.parse_activity_data(details)

            parsed["discipline"] = classify_discipline(parsed)
            parsed["intensity_zone"] = infer_intensity_zone(parsed)
            parsed["body_regions"] = infer_body_regions(parsed["discipline"])

            await activity_service.create(parsed)
            activities_synced += 1
            print(
                f"  ✓ Synced: {parsed.get('activity_name', 'Unknown')} ({parsed['discipline']})"
            )

        print(f"\nSyncing health metrics...")
        health_synced = 0
        for day_offset in range(days + 1):
            current_date = end_date - timedelta(days=day_offset)

            health_data = sync_service.get_health_data(current_date)
            if health_data:
                parsed_health = sync_service.parse_health_data(health_data)

                avgs = await health_service.calculate_7day_averages(current_date)
                parsed_health.update(avgs)

                await health_service.upsert(parsed_health)
                health_synced += 1

        print(f"Synced health data for {health_synced} days")

        print(f"\nRecomputing metrics...")
        await metrics_service.recompute_metrics(start_date, end_date)

        await db.commit()

        print(f"\n✅ Sync complete!")
        print(f"   Activities synced: {activities_synced}")
        print(f"   Health days synced: {health_synced}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Sync Garmin Connect data")
    parser.add_argument(
        "--days", type=int, default=28, help="Number of days to sync (default: 28)"
    )
    parser.add_argument(
        "--login", action="store_true", help="Authenticate and save tokens"
    )

    args = parser.parse_args()

    if args.login:
        sync_service = get_sync_service()
        if sync_service.authenticate():
            print("Login successful! Tokens saved.")
        else:
            print("Login failed.")
            sys.exit(1)
    else:
        asyncio.run(sync_garmin(args.days))


if __name__ == "__main__":
    main()
