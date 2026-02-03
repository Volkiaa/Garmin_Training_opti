from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.models import Activity, DailyHealth, ComputedMetrics, UserSettings
from app.core.classifiers import (
    classify_discipline,
    infer_intensity_zone,
    infer_body_regions,
)
from app.core.training_load import calculate_load
from app.core.readiness import calculate_readiness
from app.core.fatigue import calculate_fatigue, generate_guidance
from app.core.training_load import (
    calculate_acute_load,
    calculate_chronic_load,
    calculate_acwr,
    get_acwr_status,
    get_weekly_volume_by_discipline,
    get_intensity_distribution,
)


class ActivityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_garmin_id(self, garmin_id: str) -> Optional[Activity]:
        result = await self.db.execute(
            select(Activity).where(Activity.garmin_id == garmin_id)
        )
        return result.scalar_one_or_none()

    async def create(self, activity_data: Dict[str, Any]) -> Activity:
        activity = Activity(**activity_data)
        self.db.add(activity)
        await self.db.flush()
        return activity

    async def get_activities(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        disciplines: Optional[List[str]] = None,
        limit: int = 50,
        offset: int = 0,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Activity], int]:
        query = select(Activity)

        if start_date:
            query = query.where(
                Activity.started_at >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date:
            query = query.where(
                Activity.started_at <= datetime.combine(end_date, datetime.max.time())
            )
        if disciplines:
            if len(disciplines) == 1:
                query = query.where(Activity.discipline == disciplines[0])
            else:
                query = query.where(Activity.discipline.in_(disciplines))

        count_query = select(Activity).with_only_columns(Activity.id)
        if start_date:
            count_query = count_query.where(
                Activity.started_at >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date:
            count_query = count_query.where(
                Activity.started_at <= datetime.combine(end_date, datetime.max.time())
            )
        if disciplines:
            if len(disciplines) == 1:
                count_query = count_query.where(Activity.discipline == disciplines[0])
            else:
                count_query = count_query.where(Activity.discipline.in_(disciplines))

        total_result = await self.db.execute(count_query)
        total = len(total_result.scalars().all())

        sort_column = Activity.started_at
        if sort_by == "duration":
            sort_column = Activity.duration_minutes
        elif sort_by == "training_load":
            sort_column = Activity.training_load

        if sort_order == "asc":
            query = query.order_by(sort_column)
        else:
            query = query.order_by(desc(sort_column))

        query = query.limit(limit).offset(offset)
        result = await self.db.execute(query)
        activities = result.scalars().all()

        return list(activities), total

    async def get_by_id(self, activity_id: int) -> Optional[Activity]:
        result = await self.db.execute(
            select(Activity).where(Activity.id == activity_id)
        )
        return result.scalar_one_or_none()

    async def update(self, activity: Activity, update_data: Dict[str, Any]) -> Activity:
        for key, value in update_data.items():
            if hasattr(activity, key) and value is not None:
                setattr(activity, key, value)
        await self.db.flush()
        return activity

    async def get_recent_activities(self, days: int = 5) -> List[Activity]:
        start_date = datetime.now() - timedelta(days=days)
        result = await self.db.execute(
            select(Activity)
            .where(Activity.started_at >= start_date)
            .order_by(desc(Activity.started_at))
            .limit(10)
        )
        return list(result.scalars().all())


class HealthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_date(self, target_date: date) -> Optional[DailyHealth]:
        result = await self.db.execute(
            select(DailyHealth).where(DailyHealth.date == target_date)
        )
        return result.scalar_one_or_none()

    async def upsert(self, health_data: Dict[str, Any]) -> DailyHealth:
        target_date = health_data.get("date")
        existing = await self.get_by_date(target_date)

        if existing:
            for key, value in health_data.items():
                if hasattr(existing, key) and value is not None:
                    setattr(existing, key, value)
            await self.db.flush()
            return existing
        else:
            health = DailyHealth(**health_data)
            self.db.add(health)
            await self.db.flush()
            return health

    async def get_metrics_range(
        self, start_date: date, end_date: date
    ) -> List[DailyHealth]:
        result = await self.db.execute(
            select(DailyHealth)
            .where(and_(DailyHealth.date >= start_date, DailyHealth.date <= end_date))
            .order_by(DailyHealth.date)
        )
        return list(result.scalars().all())

    async def calculate_7day_averages(self, target_date: date) -> Dict[str, float]:
        start_date = target_date - timedelta(days=6)
        metrics = await self.get_metrics_range(start_date, target_date)

        hrv_values = [m.hrv_status for m in metrics if m.hrv_status]
        rhr_values = [m.resting_hr for m in metrics if m.resting_hr]

        return {
            "hrv_7day_avg": sum(hrv_values) / len(hrv_values) if hrv_values else 0,
            "resting_hr_7day_avg": sum(rhr_values) / len(rhr_values)
            if rhr_values
            else 0,
        }


class MetricsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_service = ActivityService(db)
        self.health_service = HealthService(db)

    async def recompute_metrics(self, start_date: date, end_date: date):
        current_date = start_date

        while current_date <= end_date:
            await self.compute_daily_metrics(current_date)
            current_date += timedelta(days=1)

        await self.db.commit()

    async def compute_daily_metrics(self, target_date: date) -> ComputedMetrics:
        activities_result = await self.db.execute(
            select(Activity).where(
                Activity.started_at
                >= datetime.combine(
                    target_date - timedelta(days=28), datetime.min.time()
                ),
                Activity.started_at
                <= datetime.combine(target_date, datetime.max.time()),
            )
        )
        activities = list(activities_result.scalars().all())

        health = await self.health_service.get_by_date(target_date)
        settings_result = await self.db.execute(select(UserSettings))
        user_settings = settings_result.scalar_one_or_none()

        if not user_settings:
            user_settings = UserSettings()

        activities_data = [
            {
                "started_at": a.started_at,
                "intensity_zone": a.intensity_zone,
                "discipline": a.discipline,
                "duration_minutes": a.duration_minutes,
                "training_load": a.training_load
                or calculate_load(
                    {
                        "avg_hr": a.avg_hr,
                        "duration_minutes": a.duration_minutes,
                        "intensity_zone": a.intensity_zone,
                    },
                    user_settings.max_hr,
                    user_settings.resting_hr_baseline,
                ),
            }
            for a in activities
        ]

        end_datetime = datetime.combine(target_date, datetime.max.time())

        acute = calculate_acute_load(activities_data, end_datetime)
        chronic = calculate_chronic_load(activities_data, end_datetime)
        acwr = calculate_acwr(acute, chronic)

        fatigue = calculate_fatigue(activities_data, end_datetime)

        weekly_volume = get_weekly_volume_by_discipline(activities_data, end_datetime)
        intensity_dist = get_intensity_distribution(activities_data, end_datetime)

        hrv_today = health.hrv_status if health else None
        hrv_7day_avg = health.hrv_7day_avg if health else None
        sleep_hours = health.sleep_duration_hours if health else None
        sleep_score = health.sleep_score if health else None
        body_battery = health.body_battery_morning if health else None

        if health and not hrv_7day_avg:
            avgs = await self.health_service.calculate_7day_averages(target_date)
            hrv_7day_avg = avgs.get("hrv_7day_avg")

        recent_for_readiness = []
        for a in activities_data:
            if a["started_at"]:
                activity_date = a["started_at"]
                # Normalize both datetimes to naive for comparison
                if activity_date.tzinfo is not None:
                    activity_date = activity_date.replace(tzinfo=None)
                comparison_end = end_datetime
                if comparison_end.tzinfo is not None:
                    comparison_end = comparison_end.replace(tzinfo=None)
                if (comparison_end - activity_date).days <= 3:
                    recent_for_readiness.append(a)

        readiness_result = calculate_readiness(
            hrv_today=hrv_today,
            hrv_7day_avg=hrv_7day_avg or user_settings.hrv_baseline,
            sleep_hours=sleep_hours,
            sleep_target=user_settings.sleep_target_hours,
            sleep_score=sleep_score,
            body_battery_morning=body_battery,
            recent_activities=recent_for_readiness,
            avg_readiness_3_days=70,
            today=end_datetime,
        )

        # Generate guidance based on readiness score (not just fatigue)
        guidance = generate_guidance(fatigue, readiness_score=readiness_result["score"])

        existing = await self.db.execute(
            select(ComputedMetrics).where(ComputedMetrics.date == target_date)
        )
        existing = existing.scalar_one_or_none()

        metrics_data = {
            "date": target_date,
            "readiness_score": readiness_result["score"],
            "readiness_factors": readiness_result["factors"],
            "acute_load": acute,
            "chronic_load": chronic,
            "acwr": acwr,
            "acwr_status": get_acwr_status(acwr),
            "fatigue_upper": fatigue["upper"],
            "fatigue_lower": fatigue["lower"],
            "fatigue_cardio": fatigue["cardio"],
            "fatigue_cns": fatigue["cns"],
            "weekly_volume_by_discipline": weekly_volume,
            "intensity_distribution": intensity_dist,
        }

        if existing:
            for key, value in metrics_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            await self.db.flush()
            return existing
        else:
            metrics = ComputedMetrics(**metrics_data)
            self.db.add(metrics)
            await self.db.flush()
            return metrics

    async def get_metrics_by_date(self, target_date: date) -> Optional[ComputedMetrics]:
        result = await self.db.execute(
            select(ComputedMetrics).where(ComputedMetrics.date == target_date)
        )
        return result.scalar_one_or_none()


class SettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self) -> UserSettings:
        result = await self.db.execute(select(UserSettings))
        settings = result.scalar_one_or_none()

        if not settings:
            settings = UserSettings()
            self.db.add(settings)
            await self.db.flush()

        return settings

    async def update_settings(self, update_data: Dict[str, Any]) -> UserSettings:
        settings = await self.get_settings()

        for key, value in update_data.items():
            if hasattr(settings, key) and value is not None:
                setattr(settings, key, value)

        await self.db.flush()
        return settings
