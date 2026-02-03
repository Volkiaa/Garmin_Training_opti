from typing import Dict, List, Any, Optional
from datetime import datetime
import math


DISCIPLINE_IMPACT = {
    "strength": {"upper": 0.8, "lower": 0.8, "cardio": 0.2, "cns": 0.7},
    "hyrox": {"upper": 0.6, "lower": 0.9, "cardio": 0.9, "cns": 0.6},
    "run": {"upper": 0.1, "lower": 0.8, "cardio": 0.8, "cns": 0.3},
    "bike": {"upper": 0.1, "lower": 0.6, "cardio": 0.7, "cns": 0.2},
    "swim": {"upper": 0.7, "lower": 0.2, "cardio": 0.6, "cns": 0.2},
    "other": {"upper": 0.3, "lower": 0.3, "cardio": 0.5, "cns": 0.2},
}

INTENSITY_FATIGUE = {"easy": 0.1, "moderate": 0.25, "hard": 0.5, "max": 0.8}

DECAY_RATES = {"upper": 0.5, "lower": 0.45, "cardio": 0.6, "cns": 0.5}


def clamp(value: float, min_val: float = 0, max_val: float = 1) -> float:
    return max(min_val, min(value, max_val))


def calculate_fatigue(
    activities: List[Dict[str, Any]], today: datetime, lookback_days: int = 5
) -> Dict[str, float]:
    fatigue = {"upper": 0.0, "lower": 0.0, "cardio": 0.0, "cns": 0.0}

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
        if days_ago < 0 or days_ago > lookback_days:
            continue

        intensity = activity.get("intensity_zone", "moderate")
        base = INTENSITY_FATIGUE.get(intensity, 0.25)

        duration = activity.get("duration_minutes", 60)
        duration_factor = duration / 60

        discipline = activity.get("discipline", "other")
        impact = DISCIPLINE_IMPACT.get(discipline, DISCIPLINE_IMPACT["other"])

        for dimension in fatigue.keys():
            decay = DECAY_RATES[dimension] ** days_ago
            contribution = base * impact[dimension] * duration_factor * decay
            fatigue[dimension] += contribution

    for dimension in fatigue:
        fatigue[dimension] = clamp(fatigue[dimension])

    return fatigue


def generate_guidance(
    fatigue: Dict[str, float], readiness_score: int = 100
) -> Dict[str, Any]:
    """Generate training guidance based on readiness score and fatigue levels.

    Args:
        fatigue: Dict with fatigue levels for each body system
        readiness_score: Overall readiness score (0-100), default 100

    Returns:
        Dict with recommendation, avoid list, and suggested list
    """
    avoid = []
    suggested = []

    # PRIMARY: Use readiness score as the main factor for guidance
    # This ensures safety-first recommendations at low readiness
    if readiness_score >= 80:
        # High readiness - can handle intense training
        recommendation = "Ready to perform - High intensity training is appropriate"
        suggested = [
            "All training types",
            "Competition prep",
            "PR attempts",
            "Heavy lifting",
        ]

        # Even with high readiness, check for specific fatigue issues
        if fatigue["cns"] > 0.7:
            avoid.append("Max efforts")
            suggested.remove("PR attempts") if "PR attempts" in suggested else None
        if fatigue["lower"] > 0.7:
            avoid.extend(["Heavy squats/deadlifts"])
        if fatigue["cardio"] > 0.7:
            avoid.extend(["High-intensity intervals"])

    elif readiness_score >= 60:
        # Good readiness - moderate training
        recommendation = "Good readiness - Moderate training recommended"
        avoid = ["Max efforts", "Competition", "PR attempts"]
        suggested = [
            "Moderate intensity work",
            "Base building",
            "Skill practice",
            "Tempo runs",
        ]

        # Add fatigue-based adjustments
        if fatigue["lower"] > 0.6:
            avoid.extend(["Heavy lower body", "Running"])
            suggested.extend(["Upper body", "Swimming"])
        if fatigue["upper"] > 0.6:
            avoid.extend(["Upper body strength"])
            suggested.extend(["Lower body", "Cycling"])
        if fatigue["cardio"] > 0.6:
            avoid.extend(["Threshold work"])
            suggested.extend(["Easy Zone 2", "Strength work"])
        if fatigue["cns"] > 0.6:
            avoid.extend(["Complex movements", "Heavy lifting"])
            suggested.extend(["Technique work", "Mobility"])

    elif readiness_score >= 40:
        # Low readiness - easy training only
        recommendation = "Reduced readiness - Easy training only"
        avoid = [
            "High intensity",
            "Heavy lifting",
            "Long sessions",
            "Max efforts",
            "Competition",
        ]
        suggested = [
            "Easy cardio (Zone 1-2)",
            "Mobility work",
            "Light technique",
            "Recovery activities",
        ]

        # Even stricter with high fatigue
        if any(f > 0.7 for f in fatigue.values()):
            avoid.extend(["All structured training"])
            suggested = ["Complete rest", "Light walking", "Stretching"]

    else:
        # Poor readiness - rest and recovery
        recommendation = "Recovery needed - Prioritize rest and recovery"
        avoid = ["All training", "Any intensity", "Structured workouts"]
        suggested = [
            "Complete rest",
            "Light walking",
            "Stretching",
            "Sleep",
            "Hydration",
        ]

    # Clean up empty/default values
    if not avoid:
        avoid = []
    if not suggested:
        suggested = ["Follow your planned training"]

    return {
        "recommendation": recommendation,
        "avoid": list(set(avoid)),
        "suggested": list(set(suggested)),
    }


def get_recommendation_text(fatigue: Dict[str, float]) -> str:
    max_fatigue = max(fatigue.values())

    if max_fatigue < 0.4:
        return "Full send - high intensity training OK"
    elif max_fatigue < 0.6:
        return "Moderate intensity training OK"
    elif max_fatigue < 0.75:
        return "Easy training recommended"
    else:
        return "Recovery day - rest or active recovery only"


def calculate_activity_fatigue_impact(activity: Dict[str, Any]) -> Dict[str, float]:
    intensity = activity.get("intensity_zone", "moderate")
    base = INTENSITY_FATIGUE.get(intensity, 0.25)

    duration = activity.get("duration_minutes", 60)
    duration_factor = duration / 60

    discipline = activity.get("discipline", "other")
    impact = DISCIPLINE_IMPACT.get(discipline, DISCIPLINE_IMPACT["other"])

    return {
        dimension: clamp(base * impact[dimension] * duration_factor)
        for dimension in ["upper", "lower", "cardio", "cns"]
    }
