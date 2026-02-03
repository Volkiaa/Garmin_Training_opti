from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List

from app.database import get_db
from app.models import Activity as ActivityModel, UserSettings as UserSettingsModel
from app.services.activity_service import (
    ActivityService,
    HealthService,
    MetricsService,
    SettingsService,
)
from app.services.garmin_sync import get_sync_service
from app.core.classifiers import (
    classify_discipline,
    infer_intensity_zone,
    infer_body_regions,
)
from app.schemas.activity import Activity, ActivityList, ActivityUpdate, ActivityDetail
from app.schemas.health import DailyHealth, HealthMetricsList, HealthTrends
from app.schemas.dashboard import Dashboard
from app.schemas.common import Settings, SettingsUpdate, SyncStatus, SyncTrigger
from app.core.fatigue import calculate_activity_fatigue_impact
from app.core.classifiers import extract_hr_zones
from app.core.sync_lock import acquire_sync_lock, release_sync_lock
from app.models import SyncJob, SyncStatusEnum, TriggeredByEnum
from app.api.websocket import websocket_sync_endpoint, manager
from pydantic import BaseModel

app = FastAPI(title="Training Optimizer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/dashboard", response_model=Dashboard)
async def get_dashboard(
    version: Optional[str] = Query(
        None, description="Readiness algorithm version: v1 or v2"
    ),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    metrics_service = MetricsService(db)
    activity_service = ActivityService(db)
    health_service = HealthService(db)
    settings_service = SettingsService(db)

    metrics = await metrics_service.compute_daily_metrics(today)
    recent_activities = await activity_service.get_recent_activities(days=5)
    health = await health_service.get_by_date(today)
    settings = await settings_service.get_settings()

    week_start = today - timedelta(
        days=today.weekday()
    )  # Start of current week (Monday)
    activities_result = await db.execute(
        select(ActivityModel).where(
            ActivityModel.started_at
            >= datetime.combine(week_start, datetime.min.time()),
            ActivityModel.started_at <= datetime.combine(today, datetime.max.time()),
        )
    )
    week_activities = list(activities_result.scalars().all())

    total_hours = sum(a.duration_minutes or 0 for a in week_activities) / 60

    by_discipline = {
        "hyrox": 0,
        "strength": 0,
        "run": 0,
        "bike": 0,
        "swim": 0,
        "other": 0,
    }
    for activity in week_activities:
        by_discipline[activity.discipline] = (
            by_discipline.get(activity.discipline, 0)
            + (activity.duration_minutes or 0) / 60
        )

    intensity_dist = {"easy": 0, "moderate": 0, "hard": 0, "max": 0}
    total_duration = sum(a.duration_minutes or 0 for a in week_activities)
    for activity in week_activities:
        intensity_dist[activity.intensity_zone] = intensity_dist.get(
            activity.intensity_zone, 0
        ) + (activity.duration_minutes or 0)

    if total_duration > 0:
        for intensity in intensity_dist:
            intensity_dist[intensity] = round(
                intensity_dist[intensity] / total_duration, 2
            )

    recent_activities_data = [
        {
            "id": a.id,
            "garmin_id": a.garmin_id,
            "started_at": a.started_at,
            "discipline": a.discipline,
            "intensity_zone": a.intensity_zone,
            "duration_minutes": a.duration_minutes,
            "activity_name": a.activity_name,
            "training_load": a.training_load,
        }
        for a in recent_activities[:5]
    ]

    from app.core.fatigue import generate_guidance
    from app.core.sport_readiness import evaluate_sport_readiness
    from app.core.readiness import calculate_readiness, get_readiness_category
    from app.core.readiness_v2 import (
        calculate_readiness_v2,
        calculate_acwr_penalty,
        get_acwr_status,
    )

    fatigue = {
        "upper": float(metrics.fatigue_upper or 0),
        "lower": float(metrics.fatigue_lower or 0),
        "cardio": float(metrics.fatigue_cardio or 0),
        "cns": float(metrics.fatigue_cns or 0),
    }

    # Get health data for readiness calculation
    hrv_today = health.hrv_status if health else None
    hrv_7day_avg = health.hrv_7day_avg if health else settings.hrv_baseline
    sleep_hours = health.sleep_duration_hours if health else None
    sleep_score = health.sleep_score if health else None
    body_battery = health.body_battery_morning if health else None

    # Get recent activities for readiness calculation
    recent_for_readiness = []
    for a in recent_activities_data:
        if a.get("started_at"):
            started_at = a["started_at"]
            # Handle both string and datetime objects
            if isinstance(started_at, str):
                activity_date = datetime.fromisoformat(
                    started_at.replace("Z", "+00:00")
                )
            else:
                # Already a datetime object
                activity_date = started_at
            if (datetime.now(timezone.utc) - activity_date).days <= 5:
                recent_for_readiness.append(a)

    # Calculate readiness based on version
    if version == "v1":
        readiness_result = calculate_readiness(
            hrv_today=hrv_today,
            hrv_7day_avg=hrv_7day_avg,
            sleep_hours=sleep_hours,
            sleep_target=settings.sleep_target_hours,
            sleep_score=sleep_score,
            body_battery_morning=body_battery,
            recent_activities=recent_for_readiness,
            avg_readiness_3_days=70,
            today=datetime.now(),
        )
        readiness_score = readiness_result["score"]
        readiness_category = readiness_result["category"]
        readiness_factors = readiness_result["factors"]
    else:
        # V2: Calculate readiness using the V2 algorithm
        # Get sleep hours for last 3 days for V2 algorithm
        sleep_hours_3_days = []
        for i in range(3):
            check_date = today - timedelta(days=i)
            day_health = await health_service.get_by_date(check_date)
            if day_health and day_health.sleep_duration_hours:
                sleep_hours_3_days.append(float(day_health.sleep_duration_hours))

        readiness_result = calculate_readiness_v2(
            hrv_today=hrv_today,
            hrv_7day_avg=hrv_7day_avg,
            sleep_hours=sleep_hours,
            sleep_target=settings.sleep_target_hours,
            sleep_score=sleep_score,
            sleep_hours_3_days=sleep_hours_3_days,
            body_battery_morning=body_battery,
            recent_activities=recent_for_readiness,
            avg_readiness_3_days=70,
            today=datetime.now(),
            acwr=float(metrics.acwr or 1.0),
        )
        readiness_score = readiness_result["score"]
        readiness_category = readiness_result["category"]
        readiness_factors = readiness_result["factors"]

    # Generate guidance based on readiness score (not just fatigue)
    guidance = generate_guidance(fatigue, readiness_score=int(readiness_score))

    sport_readiness = evaluate_sport_readiness(
        readiness_score=int(readiness_score),
        fatigue=fatigue,
        acwr=float(metrics.acwr or 1.0),
    )

    return {
        "date": today,
        "readiness": {
            "score": readiness_score,
            "category": readiness_category,
            "trend": "stable",
            "factors": readiness_factors,
            "guidance": guidance,
            "sport_specific": sport_readiness,
        },
        "training_load": {
            "acute": metrics.acute_load or 0,
            "chronic": metrics.chronic_load or 0,
            "acwr": metrics.acwr or 1.0,
            "acwr_status": metrics.acwr_status or "optimal",
            "chart_data": [],
        },
        "fatigue": fatigue,
        "health": {
            "hrv": health.hrv_status if health else None,
            "hrv_baseline": health.hrv_7day_avg if health else settings.hrv_baseline,
            "resting_hr": health.resting_hr if health else None,
            "sleep_hours": health.sleep_duration_hours if health else None,
            "sleep_score": health.sleep_score if health else None,
            "body_battery": health.body_battery_morning if health else None,
        },
        "recent_activities": recent_activities_data,
        "week_summary": {
            "total_hours": round(total_hours, 1),
            "by_discipline": by_discipline,
            "intensity_distribution": intensity_dist,
        },
    }


@app.get("/api/v1/activities", response_model=ActivityList)
async def list_activities(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    discipline: Optional[str] = None,
    disciplines: Optional[List[str]] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query("desc"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = ActivityService(db)

    discipline_list = []
    if discipline:
        discipline_list.append(discipline)
    if disciplines:
        discipline_list.extend(disciplines)
    discipline_list = list(dict.fromkeys(discipline_list)) if discipline_list else None

    activities, total = await service.get_activities(
        start_date, end_date, discipline_list, limit, offset, sort_by, sort_order
    )

    return {"total": total, "limit": limit, "offset": offset, "activities": activities}


@app.get("/api/v1/activities/{activity_id}", response_model=ActivityDetail)
async def get_activity(activity_id: int, db: AsyncSession = Depends(get_db)):
    service = ActivityService(db)
    activity = await service.get_by_id(activity_id)

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    hr_zones = {
        "zone1": activity.hr_zone_1_minutes or 0,
        "zone2": activity.hr_zone_2_minutes or 0,
        "zone3": activity.hr_zone_3_minutes or 0,
        "zone4": activity.hr_zone_4_minutes or 0,
        "zone5": activity.hr_zone_5_minutes or 0,
    }

    activity_dict = {
        "id": activity.id,
        "garmin_id": activity.garmin_id,
        "started_at": activity.started_at,
        "duration_minutes": activity.duration_minutes,
        "activity_type": activity.activity_type,
        "activity_name": activity.activity_name,
        "discipline": activity.discipline,
        "intensity_zone": activity.intensity_zone,
        "body_regions": activity.body_regions or [],
        "training_load": activity.training_load,
        "calories": activity.calories,
        "avg_hr": activity.avg_hr,
        "max_hr": activity.max_hr,
        "distance_meters": activity.distance_meters,
        "notes": activity.notes,
        "created_at": activity.created_at,
        "hr_zones": hr_zones,
        "fatigue_impact": calculate_activity_fatigue_impact(
            {
                "intensity_zone": activity.intensity_zone,
                "discipline": activity.discipline,
                "duration_minutes": activity.duration_minutes,
            }
        ),
        "raw_data": activity.raw_data,
    }

    return activity_dict


@app.patch("/api/v1/activities/{activity_id}", response_model=Activity)
async def update_activity(
    activity_id: int, update: ActivityUpdate, db: AsyncSession = Depends(get_db)
):
    service = ActivityService(db)
    activity = await service.get_by_id(activity_id)

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    update_data = update.dict(exclude_unset=True)
    updated = await service.update(activity, update_data)
    await db.commit()

    return updated


@app.get("/api/v1/activities/{activity_id}/gps")
async def get_activity_gps(activity_id: int, db: AsyncSession = Depends(get_db)):
    """Get GPS coordinates for an activity.

    Fetches from cache if available, otherwise fetches from Garmin API
    and caches the result.
    """
    from app.services.activity_service import ActivityService
    from app.services.garmin_sync import GarminSyncService
    from datetime import datetime, timezone

    service = ActivityService(db)
    activity = await service.get_by_id(activity_id)

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Check if we have cached GPS data
    if activity.gps_polyline and activity.gps_fetched_at:
        return {"coordinates": activity.gps_polyline}

    # Fetch from Garmin if we have a garmin_id
    if not activity.garmin_id:
        raise HTTPException(
            status_code=404, detail="No Garmin data available for this activity"
        )

    sync_service = GarminSyncService()
    gps_data = sync_service.get_activity_gps(activity.garmin_id)

    if not gps_data:
        raise HTTPException(status_code=404, detail="GPS data not available")

    # Cache the GPS data
    activity.gps_polyline = gps_data
    activity.gps_fetched_at = datetime.now(timezone.utc)
    await db.commit()

    return {"coordinates": gps_data}


@app.get("/api/v1/activities/{activity_id}/hr")
async def get_activity_hr(activity_id: int, db: AsyncSession = Depends(get_db)):
    """Get heart rate time-series data for an activity."""
    from app.services.activity_service import ActivityService

    service = ActivityService(db)
    activity = await service.get_by_id(activity_id)

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    if not activity.raw_data:
        raise HTTPException(status_code=404, detail="No detailed data available")

    # Extract HR samples from raw_data
    # Garmin Connect API stores HR in "samples" or "heartRate" field
    hr_samples = []

    # Try different possible locations in raw_data
    if "samples" in activity.raw_data:
        samples = activity.raw_data["samples"]
        for sample in samples:
            if "heartRate" in sample or "hr" in sample:
                hr_samples.append(
                    {
                        "timestamp": sample.get("timestamp") or sample.get("time"),
                        "hr": sample.get("heartRate") or sample.get("hr"),
                    }
                )
    elif "heartRate" in activity.raw_data:
        # Alternative format
        hr_data = activity.raw_data["heartRate"]
        if isinstance(hr_data, list):
            hr_samples = hr_data

    if not hr_samples:
        raise HTTPException(status_code=404, detail="Heart rate data not available")

    return {"samples": hr_samples}


@app.get("/api/v1/health/daily", response_model=HealthMetricsList)
async def get_health_daily(
    start_date: date, end_date: date, db: AsyncSession = Depends(get_db)
):
    service = HealthService(db)
    metrics = await service.get_metrics_range(start_date, end_date)

    return {"metrics": metrics}


@app.post("/api/v1/sync/trigger")
async def trigger_sync(trigger: SyncTrigger, db: AsyncSession = Depends(get_db)):
    # Acquire advisory lock to prevent concurrent syncs
    lock_acquired = await acquire_sync_lock(db)
    if not lock_acquired:
        raise HTTPException(status_code=409, detail="Sync already in progress")

    sync_job = None
    try:
        # Create sync job record
        from datetime import datetime

        sync_job = SyncJob(
            started_at=datetime.now(),
            status=SyncStatusEnum.running,
            triggered_by=TriggeredByEnum.manual,
        )
        db.add(sync_job)
        await db.flush()

        sync_service = get_sync_service()

        if not sync_service.authenticate():
            sync_job.status = SyncStatusEnum.failed
            sync_job.error_message = "Failed to authenticate with Garmin"
            await db.commit()
            raise HTTPException(
                status_code=401, detail="Failed to authenticate with Garmin"
            )

        end_date = date.today()

        if trigger.full_sync:
            start_date = date(2000, 1, 1)
            health_days = 365
        else:
            start_date = end_date - timedelta(days=trigger.days)
            health_days = trigger.days

        activities = sync_service.get_activities_by_date(start_date, end_date)

        activity_service = ActivityService(db)
        health_service = HealthService(db)
        metrics_service = MetricsService(db)

        activities_synced = 0
        activities_found = len(activities)

        for activity_summary in activities:
            activity_id = activity_summary.get("activityId")
            if not activity_id:
                continue

            existing = await activity_service.get_by_garmin_id(str(activity_id))
            if existing:
                continue

            parsed = sync_service.parse_activity_data(activity_summary)

            settings_result = await db.execute(select(UserSettingsModel))
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

        for day_offset in range(health_days + 1):
            current_date = end_date - timedelta(days=day_offset)

            health_data = sync_service.get_health_data(current_date)
            if health_data:
                parsed_health = sync_service.parse_health_data(health_data)

                avgs = await health_service.calculate_7day_averages(current_date)
                parsed_health.update(avgs)

                await health_service.upsert(parsed_health)

        await metrics_service.recompute_metrics(start_date, end_date)

        # Update sync job on success
        sync_job.status = SyncStatusEnum.completed
        sync_job.completed_at = datetime.now()
        sync_job.activities_found = activities_found
        sync_job.activities_synced = activities_synced
        await db.commit()

        return {
            "status": "completed",
            "job_id": f"sync_{sync_job.id}",
            "activities_synced": activities_synced,
            "health_days_synced": health_days + 1,
            "full_sync": trigger.full_sync,
        }

    except Exception as e:
        # Update sync job on failure
        if sync_job:
            sync_job.status = SyncStatusEnum.failed
            sync_job.completed_at = datetime.now()
            sync_job.error_message = str(e)
            await db.commit()
        raise

    finally:
        # Always release the lock
        await release_sync_lock(db)


@app.get("/api/v1/sync/status", response_model=SyncStatus)
async def get_sync_status(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    result = await db.execute(
        select(SyncJob)
        .where(SyncJob.status == SyncStatusEnum.completed)
        .order_by(SyncJob.completed_at.desc())
        .limit(1)
    )
    latest_job = result.scalar_one_or_none()

    if latest_job:
        return {
            "last_sync": latest_job.completed_at,
            "status": "completed",
            "activities_synced": latest_job.activities_synced or 0,
            "health_days_synced": 0,
            "errors": [],
        }
    else:
        return {
            "last_sync": None,
            "status": "unknown",
            "activities_synced": 0,
            "health_days_synced": 0,
            "errors": [],
        }


@app.get("/api/v1/garmin/profile")
async def get_garmin_profile(db: AsyncSession = Depends(get_db)):
    sync_service = get_sync_service()

    if not sync_service.authenticate():
        raise HTTPException(
            status_code=401, detail="Failed to authenticate with Garmin"
        )

    from datetime import date

    today_str = date.today().strftime("%Y-%m-%d")

    profile_data = {
        "user_profile": {},
        "max_metrics": {},
        "stats": {},
        "user_settings": {},
        "max_hr_from_activities": None,
        "hrv_baseline": None,
        "sleep_target": None,
    }

    if sync_service.client:
        try:
            profile_data["user_profile"] = {
                "full_name": sync_service.client.get_full_name(),
                "unit_system": sync_service.client.get_unit_system(),
            }
        except:
            pass

        try:
            profile_data["max_metrics"] = sync_service.client.get_max_metrics(today_str)
        except:
            pass

        try:
            profile_data["stats"] = sync_service.client.get_stats(today_str)
        except:
            pass

        try:
            user_settings = sync_service.client.get_userprofile_settings()
            profile_data["user_settings"] = user_settings
            if user_settings and isinstance(user_settings, dict):
                sleep_goal = user_settings.get("sleepGoal")
                if sleep_goal:
                    profile_data["sleep_target"] = float(sleep_goal) / 3600
        except:
            pass

        try:
            hrv_data = sync_service.client.get_hrv_data(today_str)
            if hrv_data and isinstance(hrv_data, dict):
                hrv_summary = hrv_data.get("hrvSummary", {})
                if hrv_summary and isinstance(hrv_summary, dict):
                    profile_data["hrv_baseline"] = hrv_summary.get(
                        "weeklyAvg"
                    ) or hrv_summary.get("lastNightAvg")
        except:
            pass

    try:
        from sqlalchemy import func
        from app.models import Activity

        result = await db.execute(
            select(func.max(Activity.max_hr)).where(Activity.max_hr.isnot(None))
        )
        max_hr = result.scalar()
        if max_hr:
            profile_data["max_hr_from_activities"] = max_hr
    except:
        pass

    return profile_data


@app.get("/api/v1/settings", response_model=Settings)
async def get_settings(db: AsyncSession = Depends(get_db)):
    service = SettingsService(db)
    settings = await service.get_settings()

    return {
        "max_hr": settings.max_hr or 185,
        "resting_hr_baseline": settings.resting_hr_baseline or 50,
        "hrv_baseline": settings.hrv_baseline or 55.0,
        "sleep_target_hours": settings.sleep_target_hours or 7.5,
        "disciplines_enabled": settings.disciplines_enabled
        or ["hyrox", "strength", "run", "bike", "swim"],
        "weekly_volume_targets": settings.weekly_volume_targets
        or {"hyrox": 3, "strength": 4, "run": 2, "bike": 1, "swim": 1},
    }


@app.patch("/api/v1/settings", response_model=Settings)
async def update_settings(update: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    service = SettingsService(db)
    updated = await service.update_settings(update.dict(exclude_unset=True))
    await db.commit()

    return {
        "max_hr": updated.max_hr or 185,
        "resting_hr_baseline": updated.resting_hr_baseline or 50,
        "hrv_baseline": updated.hrv_baseline or 55.0,
        "sleep_target_hours": updated.sleep_target_hours or 7.5,
        "disciplines_enabled": updated.disciplines_enabled
        or ["hyrox", "strength", "run", "bike", "swim"],
        "weekly_volume_targets": updated.weekly_volume_targets
        or {"hyrox": 3, "strength": 4, "run": 2, "bike": 1, "swim": 1},
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/v1/events")
async def list_events(upcoming_only: bool = False, db: AsyncSession = Depends(get_db)):
    from app.services.event_service import EventService

    service = EventService(db)
    events = await service.list_events(upcoming_only=upcoming_only)
    return events


@app.post("/api/v1/events")
async def create_event(
    name: str,
    event_date: date,
    event_type: str,
    distance: Optional[str] = None,
    priority: str = "B",
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    from app.services.event_service import EventService
    from app.services.phase_service import PhaseService

    event_service = EventService(db)
    phase_service = PhaseService(db)

    event = await event_service.create_event(
        name=name,
        event_date=event_date,
        event_type=event_type,
        distance=distance,
        priority=priority,
        notes=notes,
    )

    await phase_service.create_phases_for_event(event.id)

    return event


@app.put("/api/v1/events/{event_id}")
async def update_event(
    event_id: int,
    name: Optional[str] = None,
    event_date: Optional[date] = None,
    event_type: Optional[str] = None,
    distance: Optional[str] = None,
    priority: Optional[str] = None,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    from app.services.event_service import EventService

    service = EventService(db)

    event = await service.update_event(
        event_id=event_id,
        name=name,
        event_date=event_date,
        event_type=event_type,
        distance=distance,
        priority=priority,
        notes=notes,
    )

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


@app.delete("/api/v1/events/{event_id}")
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db)):
    from app.services.event_service import EventService
    from app.services.phase_service import PhaseService

    phase_service = PhaseService(db)
    await phase_service.delete_phases_for_event(event_id)

    event_service = EventService(db)
    deleted = await event_service.delete_event(event_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")

    return {"deleted": True}


@app.get("/api/v1/phases/current")
async def get_current_phase(db: AsyncSession = Depends(get_db)):
    from app.services.phase_service import PhaseService

    service = PhaseService(db)
    phase = await service.get_current_phase()
    return phase


@app.get("/api/v1/trends/weekly")
async def get_weekly_trends(weeks: int = 12, db: AsyncSession = Depends(get_db)):
    from app.services.trends_service import TrendsService

    service = TrendsService(db)
    trends = await service.get_weekly_trends(weeks=weeks)
    return {"weeks": trends}


@app.get("/api/v1/trends/daily")
async def get_daily_trends(
    start_date: date, end_date: date, db: AsyncSession = Depends(get_db)
):
    from app.services.trends_service import TrendsService

    service = TrendsService(db)
    trends = await service.get_daily_trends(start_date, end_date)
    return {"days": trends}


@app.post("/api/v1/trends/aggregate")
async def trigger_aggregation(db: AsyncSession = Depends(get_db)):
    from app.services.trends_service import TrendsService

    service = TrendsService(db)
    results = await service.backfill_weeks(weeks=12)
    return {
        "aggregated": len(results),
        "weeks": [r.week_start.isoformat() for r in results],
    }


@app.get("/api/v1/trends/comparison")
async def compare_periods(
    period1_start: date,
    period1_end: date,
    period2_start: date,
    period2_end: date,
    db: AsyncSession = Depends(get_db),
):
    from app.services.trends_service import TrendsService

    service = TrendsService(db)
    comparison = await service.compare_periods(
        period1_start, period1_end, period2_start, period2_end
    )
    return comparison


@app.get("/api/v1/trends/pmc")
async def get_pmc_data(
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
):
    from app.services.trends_service import TrendsService

    service = TrendsService(db)
    pmc_data = await service.get_pmc_data(days)

    return {
        "dates": [d["date"] for d in pmc_data],
        "ctl": [d["ctl"] for d in pmc_data],
        "atl": [d["atl"] for d in pmc_data],
        "tsb": [d["tsb"] for d in pmc_data],
        "tss": [d["tss"] for d in pmc_data],
    }


@app.get("/api/v1/features")
async def get_features(db: AsyncSession = Depends(get_db)):
    from app.services.feature_flag_service import FeatureFlagService

    service = FeatureFlagService(db)
    features = await service.get_all_features()
    return {"features": features}


@app.post("/api/v1/features/{feature_name}/use")
async def record_feature_use(feature_name: str, db: AsyncSession = Depends(get_db)):
    from app.services.feature_flag_service import FeatureFlagService

    service = FeatureFlagService(db)
    status = await service.record_feature_use(feature_name)
    return status


@app.websocket("/api/v1/ws/sync")
async def sync_websocket(websocket: WebSocket):
    await websocket_sync_endpoint(websocket)


class SyncNotifyRequest(BaseModel):
    type: str
    sync_timestamp: str
    activities_synced: int = 0
    health_days: int = 0


@app.post("/api/v1/sync/notify")
async def sync_notify(request: SyncNotifyRequest):
    message = {
        "type": "sync_update",
        "update_type": request.type,
        "sync_timestamp": request.sync_timestamp,
        "activities_synced": request.activities_synced,
        "health_days": request.health_days,
    }

    await manager.broadcast(message)

    return {"status": "notified", "clients": manager.get_connection_count()}

    await manager.broadcast(message)

    return {"status": "notified", "clients": manager.get_connection_count()}
