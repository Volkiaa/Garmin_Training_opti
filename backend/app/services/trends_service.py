"""
Trends Service - Weekly aggregation and analytics
"""

from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Activity, ComputedMetrics, WeeklyMetrics


def get_week_start(d: date) -> date:
    """Get Monday of the week for a given date (ISO week)."""
    return d - timedelta(days=d.weekday())


def get_week_end(d: date) -> date:
    """Get Sunday of the week for a given date."""
    return get_week_start(d) + timedelta(days=6)


class TrendsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def aggregate_week(self, week_start: date) -> Optional[WeeklyMetrics]:
        """
        Aggregate metrics for a specific week.

        Args:
            week_start: Monday of the week to aggregate

        Returns:
            WeeklyMetrics object or None if no data
        """
        week_end = get_week_end(week_start)

        # Get activities for the week
        activities_result = await self.db.execute(
            select(Activity).where(
                and_(Activity.started_at >= week_start, Activity.started_at <= week_end)
            )
        )
        activities = activities_result.scalars().all()

        if not activities:
            return None

        # Calculate volume metrics
        total_volume_hours = (
            sum(a.duration_minutes for a in activities if a.duration_minutes) / 60.0
        )

        total_load = sum(a.training_load for a in activities if a.training_load)

        # Volume by discipline
        volume_by_discipline: Dict[str, float] = {}
        for activity in activities:
            if activity.discipline and activity.duration_minutes:
                hours = activity.duration_minutes / 60.0
                volume_by_discipline[activity.discipline] = (
                    volume_by_discipline.get(activity.discipline, 0.0) + hours
                )

        # Intensity distribution
        intensity_distribution: Dict[str, float] = {}
        total_duration = sum(
            a.duration_minutes for a in activities if a.duration_minutes
        )

        if total_duration > 0:
            for zone in ["easy", "moderate", "hard", "max"]:
                zone_duration = sum(
                    a.duration_minutes
                    for a in activities
                    if a.intensity_zone == zone and a.duration_minutes
                )
                intensity_distribution[zone] = zone_duration / total_duration

        # Get daily metrics for averages
        daily_result = await self.db.execute(
            select(ComputedMetrics).where(
                and_(
                    ComputedMetrics.date >= week_start, ComputedMetrics.date <= week_end
                )
            )
        )
        daily_metrics = daily_result.scalars().all()

        # Calculate averages
        avg_readiness = self._avg(
            [m.readiness_score for m in daily_metrics if m.readiness_score]
        )
        avg_hrv = self._avg([m.hrv_status for m in daily_metrics if m.hrv_status])
        avg_sleep = self._avg(
            [m.sleep_duration_hours for m in daily_metrics if m.sleep_duration_hours]
        )
        avg_acwr = self._avg([m.acwr for m in daily_metrics if m.acwr])

        # Check if record exists
        existing_result = await self.db.execute(
            select(WeeklyMetrics).where(WeeklyMetrics.week_start == week_start)
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            # Update existing
            existing.total_volume_hours = total_volume_hours
            existing.total_load = total_load
            existing.volume_by_discipline = volume_by_discipline
            existing.intensity_distribution = intensity_distribution
            existing.avg_readiness = avg_readiness
            existing.avg_hrv = avg_hrv
            existing.avg_sleep_hours = avg_sleep
            existing.avg_acwr = avg_acwr
            existing.activity_count = len(activities)
            weekly_metrics = existing
        else:
            # Create new
            weekly_metrics = WeeklyMetrics(
                week_start=week_start,
                week_end=week_end,
                total_volume_hours=total_volume_hours,
                total_load=total_load,
                volume_by_discipline=volume_by_discipline,
                intensity_distribution=intensity_distribution,
                avg_readiness=avg_readiness,
                avg_hrv=avg_hrv,
                avg_sleep_hours=avg_sleep,
                avg_acwr=avg_acwr,
                activity_count=len(activities),
            )
            self.db.add(weekly_metrics)

        await self.db.commit()
        await self.db.refresh(weekly_metrics)
        return weekly_metrics

    def _avg(self, values: List[float]) -> Optional[float]:
        """Calculate average of non-null values."""
        if not values:
            return None
        return sum(values) / len(values)

    async def backfill_weeks(self, weeks: int = 12) -> List[WeeklyMetrics]:
        """
        Backfill weekly metrics for the last N weeks.

        Returns:
            List of created/updated WeeklyMetrics
        """
        today = date.today()
        results = []

        for i in range(weeks):
            week_start = get_week_start(today - timedelta(weeks=i))

            # Check if already exists and is recent
            existing_result = await self.db.execute(
                select(WeeklyMetrics).where(WeeklyMetrics.week_start == week_start)
            )
            existing = existing_result.scalar_one_or_none()

            # Only re-aggregate current week and previous week
            if existing and i > 1:
                results.append(existing)
                continue

            aggregated = await self.aggregate_week(week_start)
            if aggregated:
                results.append(aggregated)

        return results

    async def get_weekly_trends(self, weeks: int = 12) -> List[Dict[str, Any]]:
        """Get weekly metrics for the last N weeks."""
        today = date.today()
        start_week = get_week_start(today - timedelta(weeks=weeks))

        result = await self.db.execute(
            select(WeeklyMetrics)
            .where(WeeklyMetrics.week_start >= start_week)
            .order_by(WeeklyMetrics.week_start)
        )

        metrics = result.scalars().all()
        return [
            {
                "week_start": m.week_start.isoformat(),
                "week_end": m.week_end.isoformat(),
                "total_volume_hours": m.total_volume_hours,
                "total_load": m.total_load,
                "volume_by_discipline": m.volume_by_discipline,
                "intensity_distribution": m.intensity_distribution,
                "avg_readiness": m.avg_readiness,
                "avg_hrv": m.avg_hrv,
                "avg_sleep_hours": m.avg_sleep_hours,
                "avg_acwr": m.avg_acwr,
                "activity_count": m.activity_count,
            }
            for m in metrics
        ]

    async def get_daily_trends(
        self, start_date: date, end_date: date
    ) -> List[Dict[str, Any]]:
        """Get daily metrics for a date range."""
        result = await self.db.execute(
            select(ComputedMetrics)
            .where(
                and_(
                    ComputedMetrics.date >= start_date, ComputedMetrics.date <= end_date
                )
            )
            .order_by(ComputedMetrics.date)
        )

        metrics = result.scalars().all()
        return [
            {
                "date": m.date.isoformat() if m.date else None,
                "readiness_score": m.readiness_score,
                "acwr": m.acwr,
                "hrv_status": m.hrv_status,
                "sleep_duration_hours": m.sleep_duration_hours,
                "sleep_score": m.sleep_score,
                "resting_hr": m.resting_hr,
                "acute_load": m.acute_load,
                "chronic_load": m.chronic_load,
            }
            for m in metrics
        ]
