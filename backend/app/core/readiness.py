from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import math


BASE_SCORE = 70

INTENSITY_IMPACT = {"easy": 5, "moderate": 15, "hard": 30, "max": 45}

DISCIPLINE_RECOVERY = {
    "strength": 0.45,
    "hyrox": 0.40,
    "run": 0.55,
    "bike": 0.60,
    "swim": 0.65,
    "other": 0.50,
}


def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(value, max_val))


def calculate_hrv_component(hrv_today: float, hrv_7day_avg: float) -> float:
    if hrv_7day_avg == 0:
        return 0
    hrv_deviation = (hrv_today - hrv_7day_avg) / hrv_7day_avg
    return clamp(hrv_deviation * 75, -15, 15)


def calculate_sleep_component(
    sleep_hours: float, sleep_target: float = 7.5, sleep_score: Optional[int] = None
) -> float:
    sleep_ratio = sleep_hours / sleep_target if sleep_target > 0 else 1
    sleep_component = clamp((sleep_ratio - 1) * 40, -20, 20)

    if sleep_score is not None:
        if sleep_score >= 80:
            sleep_component += 3
        elif sleep_score < 50:
            sleep_component -= 5

    return sleep_component


def calculate_body_battery_component(body_battery_morning: Optional[int]) -> float:
    if body_battery_morning is None:
        return 0
    bb_deviation = (body_battery_morning - 70) / 30
    return clamp(bb_deviation * 10, -10, 10)


def calculate_recent_training_fatigue(
    activities: List[Dict[str, Any]], today: datetime
) -> float:
    total_fatigue = 0

    for activity in activities:
        activity_date = activity.get("started_at")
        if not activity_date:
            continue

        if isinstance(activity_date, str):
            activity_date = datetime.fromisoformat(activity_date.replace("Z", "+00:00"))

        # Normalize both datetimes to naive for comparison
        if activity_date.tzinfo is not None:
            activity_date = activity_date.replace(tzinfo=None)
        if today.tzinfo is not None:
            today = today.replace(tzinfo=None)

        days_ago = (today - activity_date).days
        if days_ago <= 0 or days_ago > 3:
            continue

        intensity = activity.get("intensity_zone", "moderate")
        base_impact = INTENSITY_IMPACT.get(intensity, 15)

        discipline = activity.get("discipline", "other")
        discipline_modifier = DISCIPLINE_RECOVERY.get(discipline, 0.50)

        decay = discipline_modifier**days_ago
        fatigue_contribution = base_impact * decay

        total_fatigue += fatigue_contribution

    return clamp(total_fatigue, 0, 40)


def calculate_trend_adjustment(avg_readiness_3_days: float) -> float:
    if avg_readiness_3_days < 50:
        return -5
    elif avg_readiness_3_days > 75:
        return 3
    return 0


def get_readiness_category(score: int) -> str:
    if score >= 85:
        return "high"
    elif score >= 70:
        return "moderate"
    elif score >= 55:
        return "low"
    elif score >= 40:
        return "recovery"
    else:
        return "rest"


def calculate_readiness(
    hrv_today: Optional[float],
    hrv_7day_avg: Optional[float],
    sleep_hours: Optional[float],
    sleep_target: float,
    sleep_score: Optional[int],
    body_battery_morning: Optional[int],
    recent_activities: List[Dict[str, Any]],
    avg_readiness_3_days: float,
    today: datetime,
) -> Dict[str, Any]:
    score = BASE_SCORE
    factors = []

    if hrv_today is not None and hrv_7day_avg is not None and hrv_7day_avg > 0:
        hrv_component = calculate_hrv_component(hrv_today, hrv_7day_avg)
        score += hrv_component
        factors.append(
            {
                "name": "HRV",
                "value": f"{hrv_component:+.0f}",
                "detail": f"{hrv_today:.0f}ms vs {hrv_7day_avg:.0f}ms baseline",
                "status": "positive"
                if hrv_component > 0
                else "negative"
                if hrv_component < 0
                else "neutral",
            }
        )

    if sleep_hours is not None:
        sleep_component = calculate_sleep_component(
            sleep_hours, sleep_target, sleep_score
        )
        score += sleep_component
        factors.append(
            {
                "name": "Sleep",
                "value": f"{sleep_component:+.0f}",
                "detail": f"{sleep_hours:.1f}h vs {sleep_target:.1f}h target",
                "status": "positive"
                if sleep_component > 0
                else "negative"
                if sleep_component < 0
                else "neutral",
            }
        )

    if body_battery_morning is not None:
        bb_component = calculate_body_battery_component(body_battery_morning)
        score += bb_component
        factors.append(
            {
                "name": "Body Battery",
                "value": f"{bb_component:+.0f}",
                "detail": f"{body_battery_morning} morning reading",
                "status": "positive"
                if bb_component > 0
                else "negative"
                if bb_component < 0
                else "neutral",
            }
        )

    recent_fatigue = calculate_recent_training_fatigue(recent_activities, today)
    if recent_fatigue > 0:
        score -= recent_fatigue

        for activity in recent_activities:
            activity_date = activity.get("started_at")
            if activity_date:
                if isinstance(activity_date, str):
                    activity_date = datetime.fromisoformat(
                        activity_date.replace("Z", "+00:00")
                    )
                # Normalize both datetimes to naive for comparison
                if activity_date.tzinfo is not None:
                    activity_date = activity_date.replace(tzinfo=None)
                if today.tzinfo is not None:
                    today = today.replace(tzinfo=None)
                days_ago = (today - activity_date).days
                if 0 < days_ago <= 3:
                    discipline = activity.get("discipline", "activity").capitalize()
                    intensity = activity.get("intensity_zone", "moderate")
                    factors.append(
                        {
                            "name": f"{discipline} ({days_ago} day{'s' if days_ago > 1 else ''} ago)",
                            "value": f"-{recent_fatigue:.0f}",
                            "detail": f"{intensity.capitalize()} session",
                            "status": "negative",
                        }
                    )
                    break

    trend_adjustment = calculate_trend_adjustment(avg_readiness_3_days)
    score += trend_adjustment

    score = int(clamp(score, 0, 100))
    category = get_readiness_category(score)

    return {"score": score, "category": category, "factors": factors}
