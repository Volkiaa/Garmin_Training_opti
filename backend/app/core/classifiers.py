from typing import Dict, Any, Optional


GARMIN_TYPE_TO_DISCIPLINE = {
    "running": "run",
    "treadmill_running": "run",
    "trail_running": "run",
    "track_running": "run",
    "cycling": "bike",
    "indoor_cycling": "bike",
    "mountain_biking": "bike",
    "gravel_cycling": "bike",
    "virtual_ride": "bike",
    "swimming": "swim",
    "lap_swimming": "swim",
    "open_water_swimming": "swim",
    "strength_training": "strength",
    "weight_training": "strength",
    "fitness_equipment": "strength",
    "functional_training": "hyrox",
    "hiit": "hyrox",
    "crossfit": "hyrox",
    "cardio": "other",
    "elliptical": "other",
    "rowing": "other",
    "other": "other",
}

HYROX_KEYWORDS = ["hyrox", "roxzone", "simulation", "sim", "functional"]


def is_likely_hyrox(activity: Dict[str, Any]) -> bool:
    name = (activity.get("activity_name") or "").lower()

    if any(kw in name for kw in HYROX_KEYWORDS):
        return True

    duration = activity.get("duration_minutes", 0)
    activity_type = activity.get("activity_type", "").lower()

    if activity_type in ["functional_training", "hiit"]:
        if 30 <= duration <= 120:
            return True

    return False


def classify_discipline(activity: Dict[str, Any]) -> str:
    activity_type = activity.get("activity_type", "").lower()

    if activity_type in ["functional_training", "hiit"]:
        if is_likely_hyrox(activity):
            return "hyrox"

    discipline = GARMIN_TYPE_TO_DISCIPLINE.get(activity_type)
    if discipline:
        return discipline

    if is_likely_hyrox(activity):
        return "hyrox"

    return "other"


def infer_body_regions(discipline: str) -> list:
    mapping = {
        "hyrox": ["upper", "lower", "cardio"],
        "strength": ["upper", "lower", "core"],
        "run": ["lower", "cardio"],
        "bike": ["lower", "cardio"],
        "swim": ["upper", "cardio"],
        "other": ["cardio"],
    }
    return mapping.get(discipline, ["cardio"])


def infer_intensity_zone(activity: Dict[str, Any], user_max_hr: int = 185) -> str:
    avg_hr = activity.get("avg_hr")

    if not avg_hr or not user_max_hr:
        training_effect = activity.get("aerobic_training_effect", 0)
        if training_effect == 0:
            training_effect = activity.get("activityTrainingEffect", 0)

        if training_effect < 2.0:
            return "easy"
        elif training_effect < 3.5:
            return "moderate"
        elif training_effect < 4.5:
            return "hard"
        else:
            return "max"

    hr_percent = avg_hr / user_max_hr

    if hr_percent < 0.65:
        return "easy"
    elif hr_percent < 0.80:
        return "moderate"
    elif hr_percent < 0.90:
        return "hard"
    else:
        return "max"


def extract_hr_zones(activity: Dict[str, Any]) -> Dict[str, float]:
    zones = activity.get("hr_zones", {})
    if zones:
        return zones

    summary = activity.get("summaryDTO", {})
    if not summary:
        summary = activity

    return {
        "zone1": summary.get("timeInZone1", 0)
        or summary.get("hr_zone_1_minutes", 0)
        or 0,
        "zone2": summary.get("timeInZone2", 0)
        or summary.get("hr_zone_2_minutes", 0)
        or 0,
        "zone3": summary.get("timeInZone3", 0)
        or summary.get("hr_zone_3_minutes", 0)
        or 0,
        "zone4": summary.get("timeInZone4", 0)
        or summary.get("hr_zone_4_minutes", 0)
        or 0,
        "zone5": summary.get("timeInZone5", 0)
        or summary.get("hr_zone_5_minutes", 0)
        or 0,
    }
