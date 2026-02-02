"""
Sport-Specific Readiness Evaluation

Evaluates readiness for different sports and intensity levels based on:
- Overall readiness score
- Fatigue by body system (upper, lower, cardio, cns)
- ACWR ratio
"""

from typing import Dict, List, Any


SPORT_REQUIREMENTS = {
    "easy_run": {
        "min_readiness": 40,
        "fatigue_limits": {"lower": 0.8, "cardio": 0.8},
        "acwr_max": 2.5,
    },
    "moderate_run": {
        "min_readiness": 55,
        "fatigue_limits": {"lower": 0.6, "cardio": 0.7},
        "acwr_max": 1.8,
    },
    "hard_run": {
        "min_readiness": 70,
        "fatigue_limits": {"lower": 0.5, "cardio": 0.5, "cns": 0.6},
        "acwr_max": 1.5,
    },
    "easy_bike": {
        "min_readiness": 35,
        "fatigue_limits": {"lower": 0.85, "cardio": 0.85},
        "acwr_max": 2.5,
    },
    "moderate_bike": {
        "min_readiness": 50,
        "fatigue_limits": {"lower": 0.7, "cardio": 0.75},
        "acwr_max": 2.0,
    },
    "hyrox_intervals": {
        "min_readiness": 75,
        "fatigue_limits": {"lower": 0.4, "upper": 0.5, "cardio": 0.5, "cns": 0.5},
        "acwr_max": 1.4,
    },
    "strength_heavy": {
        "min_readiness": 65,
        "fatigue_limits": {"upper": 0.5, "lower": 0.5, "cns": 0.4},
        "acwr_max": 1.6,
    },
    "strength_light": {
        "min_readiness": 45,
        "fatigue_limits": {"upper": 0.7, "lower": 0.7, "cns": 0.6},
        "acwr_max": 2.0,
    },
    "swim": {
        "min_readiness": 40,
        "fatigue_limits": {"upper": 0.7, "cardio": 0.75},
        "acwr_max": 2.0,
    },
}


def evaluate_sport_readiness(
    readiness_score: int, fatigue: Dict[str, float], acwr: float
) -> Dict[str, Dict[str, Any]]:
    """
    Evaluate readiness for each sport/intensity combination.

    Args:
        readiness_score: Overall readiness (0-100)
        fatigue: Dict with keys 'upper', 'lower', 'cardio', 'cns' (0.0-1.0)
        acwr: Acute:Chronic Workload Ratio

    Returns:
        Dict mapping sport names to {"status": str, "blockers": List[str]}
    """
    results = {}

    for sport, requirements in SPORT_REQUIREMENTS.items():
        status = "ready"
        blockers = []

        # Check overall readiness
        if readiness_score < requirements["min_readiness"]:
            status = "not_ready"
            blockers.append(
                f"Readiness {readiness_score} < {requirements['min_readiness']}"
            )

        # Check fatigue limits
        for dimension, limit in requirements["fatigue_limits"].items():
            fatigue_value = fatigue.get(dimension, 0)
            if fatigue_value > limit:
                if fatigue_value > limit + 0.1:
                    status = "not_ready"
                else:
                    status = "caution" if status == "ready" else status
                blockers.append(
                    f"{dimension} fatigue {fatigue_value:.0%} > {limit:.0%}"
                )

        # Check ACWR
        if acwr > requirements["acwr_max"]:
            if acwr > requirements["acwr_max"] + 0.3:
                status = "not_ready"
            else:
                status = "caution" if status == "ready" else status
            blockers.append(f"ACWR {acwr:.2f} > {requirements['acwr_max']}")

        results[sport] = {
            "status": status,
            "blockers": blockers,
        }

    return results


def get_sport_display_name(sport_key: str) -> str:
    """Convert sport key to display name."""
    display_names = {
        "easy_run": "Easy Run",
        "moderate_run": "Moderate Run",
        "hard_run": "Hard Run",
        "easy_bike": "Easy Bike",
        "moderate_bike": "Moderate Bike",
        "hyrox_intervals": "Hyrox Intervals",
        "strength_heavy": "Heavy Strength",
        "strength_light": "Light Strength",
        "swim": "Swim",
    }
    return display_names.get(sport_key, sport_key.replace("_", " ").title())


def categorize_sports(
    sport_readiness: Dict[str, Dict[str, Any]],
) -> Dict[str, List[str]]:
    """
    Categorize sports by readiness status.

    Returns:
        Dict with keys 'ready', 'caution', 'not_ready' containing sport keys
    """
    categories = {"ready": [], "caution": [], "not_ready": []}

    for sport, data in sport_readiness.items():
        status = data["status"]
        if status in categories:
            categories[status].append(sport)

    return categories
