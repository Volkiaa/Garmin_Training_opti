from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import math


INTENSITY_MULTIPLIER = {"easy": 0.5, "moderate": 1.0, "hard": 1.8, "max": 2.5}


def calculate_trimp(
    duration_minutes: float, avg_hr: float, resting_hr: float, max_hr: float
) -> float:
    if max_hr <= resting_hr:
        return duration_minutes

    avg_hr_fraction = (avg_hr - resting_hr) / (max_hr - resting_hr)
    intensity_factor = 0.64 * math.exp(1.92 * avg_hr_fraction)

    return duration_minutes * avg_hr_fraction * intensity_factor


def calculate_load(
    activity: Dict[str, Any], user_max_hr: int = 185, user_resting_hr: int = 50
) -> float:
    garmin_load = activity.get("training_load")
    if garmin_load is not None:
        return float(garmin_load)

    avg_hr = activity.get("avg_hr")
    duration = activity.get("duration_minutes", 0)

    if avg_hr and user_max_hr and user_resting_hr:
        return calculate_trimp(duration, avg_hr, user_resting_hr, user_max_hr)

    intensity = activity.get("intensity_zone", "moderate")
    multiplier = INTENSITY_MULTIPLIER.get(intensity, 1.0)

    return duration * multiplier


def calculate_acute_load(
    activities: List[Dict[str, Any]], end_date: datetime, days: int = 7
) -> float:
    start_date = end_date - timedelta(days=days)
    total = 0

    for activity in activities:
        activity_date = activity.get("started_at")
        if not activity_date:
            continue

        if isinstance(activity_date, str):
            activity_date = datetime.fromisoformat(activity_date.replace("Z", "+00:00"))

        if activity_date.tzinfo is not None:
            activity_date = activity_date.replace(tzinfo=None)

        if start_date <= activity_date <= end_date:
            total += activity.get("training_load", 0) or 0

    return total


def calculate_chronic_load(
    activities: List[Dict[str, Any]], end_date: datetime, days: int = 28
) -> float:
    start_date = end_date - timedelta(days=days)
    total = 0

    for activity in activities:
        activity_date = activity.get("started_at")
        if not activity_date:
            continue

        if isinstance(activity_date, str):
            activity_date = datetime.fromisoformat(activity_date.replace("Z", "+00:00"))

        if activity_date.tzinfo is not None:
            activity_date = activity_date.replace(tzinfo=None)

        if start_date <= activity_date <= end_date:
            total += activity.get("training_load", 0) or 0

    return total / 4


def calculate_acwr(acute: float, chronic: float) -> float:
    if chronic <= 0:
        return 1.0
    return acute / chronic


def get_acwr_status(acwr: float) -> str:
    if acwr < 0.8:
        return "undertrained"
    elif acwr <= 1.3:
        return "optimal"
    elif acwr <= 1.5:
        return "caution"
    else:
        return "danger"


def get_weekly_volume_by_discipline(
    activities: List[Dict[str, Any]], end_date: datetime
) -> Dict[str, float]:
    start_date = end_date - timedelta(days=7)
    volumes = {"hyrox": 0, "strength": 0, "run": 0, "bike": 0, "swim": 0, "other": 0}

    for activity in activities:
        activity_date = activity.get("started_at")
        if not activity_date:
            continue

        if isinstance(activity_date, str):
            activity_date = datetime.fromisoformat(activity_date.replace("Z", "+00:00"))

        if activity_date.tzinfo is not None:
            activity_date = activity_date.replace(tzinfo=None)

        if start_date <= activity_date <= end_date:
            discipline = activity.get("discipline", "other")
            duration_hours = (activity.get("duration_minutes", 0) or 0) / 60
            volumes[discipline] = volumes.get(discipline, 0) + duration_hours

    return volumes


def get_intensity_distribution(
    activities: List[Dict[str, Any]], end_date: datetime
) -> Dict[str, float]:
    start_date = end_date - timedelta(days=7)
    distribution = {"easy": 0, "moderate": 0, "hard": 0, "max": 0}
    total_duration = 0

    for activity in activities:
        activity_date = activity.get("started_at")
        if not activity_date:
            continue

        if isinstance(activity_date, str):
            activity_date = datetime.fromisoformat(activity_date.replace("Z", "+00:00"))

        if activity_date.tzinfo is not None:
            activity_date = activity_date.replace(tzinfo=None)

        if start_date <= activity_date <= end_date:
            intensity = activity.get("intensity_zone", "moderate")
            duration = activity.get("duration_minutes", 0) or 0
            distribution[intensity] = distribution.get(intensity, 0) + duration
            total_duration += duration

    if total_duration > 0:
        for intensity in distribution:
            distribution[intensity] = round(distribution[intensity] / total_duration, 2)

    return distribution
