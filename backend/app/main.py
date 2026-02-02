from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, datetime, timedelta
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

app = FastAPI(title="Training Optimizer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/dashboard", response_model=Dashboard)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    today = date.today()
    metrics_service = MetricsService(db)
    activity_service = ActivityService(db)
    health_service = HealthService(db)
    settings_service = SettingsService(db)

    metrics = await metrics_service.compute_daily_metrics(today)
    recent_activities = await activity_service.get_recent_activities(days=5)
    health = await health_service.get_by_date(today)
    settings = await settings_service.get_settings()

    week_start = today - timedelta(days=7)
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

    readiness_factors = metrics.readiness_factors or []

    from app.core.fatigue import generate_guidance

    fatigue = {
        "upper": metrics.fatigue_upper or 0,
        "lower": metrics.fatigue_lower or 0,
        "cardio": metrics.fatigue_cardio or 0,
        "cns": metrics.fatigue_cns or 0,
    }
    guidance = generate_guidance(fatigue)

    return {
        "date": today,
        "readiness": {
            "score": metrics.readiness_score or 70,
            "category": "moderate",
            "trend": "stable",
            "factors": readiness_factors,
            "guidance": guidance,
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


@app.get("/api/v1/health/daily", response_model=HealthMetricsList)
async def get_health_daily(
    start_date: date, end_date: date, db: AsyncSession = Depends(get_db)
):
    service = HealthService(db)
    metrics = await service.get_metrics_range(start_date, end_date)

    return {"metrics": metrics}


@app.post("/api/v1/sync/trigger")
async def trigger_sync(trigger: SyncTrigger, db: AsyncSession = Depends(get_db)):
    sync_service = get_sync_service()

    if not sync_service.authenticate():
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
    await db.commit()

    return {
        "status": "completed",
        "job_id": f"sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "activities_synced": activities_synced,
        "health_days_synced": health_days + 1,
        "full_sync": trigger.full_sync,
    }


@app.get("/api/v1/sync/status", response_model=SyncStatus)
async def get_sync_status():
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
