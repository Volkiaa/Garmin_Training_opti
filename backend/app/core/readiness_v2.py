"""
Readiness Algorithm V2 - Core Calculations

Implements the revised readiness algorithm with:
- EWMA-based ACWR calculation
- Sleep trend component (3-day debt/surplus)
- Event proximity modifier (taper/protection)
- Updated fatigue calculation (5-day window)
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import math


def ewma(loads: List[float], decay_days: int) -> float:
    """
    Exponentially weighted moving average.
    Uses full 28-day history with specified decay constant.

    Args:
        loads: Daily training loads (oldest to newest)
        decay_days: Decay constant (7 for acute, 28 for chronic)

    Returns:
        EWMA value
    """
    if not loads:
        return 0.0

    alpha = 2 / (decay_days + 1)
    ewma_value = loads[0]

    for load in loads[1:]:
        ewma_value = alpha * load + (1 - alpha) * ewma_value

    return ewma_value


def calculate_acwr_ewma(daily_loads: List[float]) -> float:
    """
    Calculate ACWR using EWMA method.
    Both acute and chronic use full 28-day history with different decay rates.
    """
    if len(daily_loads) < 7:
        return 1.0  # Default to optimal if insufficient data

    # Pad to 28 days if needed
    loads_28d = ([0.0] * (28 - len(daily_loads)) + daily_loads)[-28:]

    acute_load = ewma(loads_28d, decay_days=7)  # 7-day decay
    chronic_load = ewma(loads_28d, decay_days=28)  # 28-day decay

    if chronic_load < 1:  # Avoid division by zero
        return 1.0

    return acute_load / chronic_load


def calculate_acwr_penalty(acwr: float) -> float:
    """
    Calculate penalty based on ACWR injury risk zones.

    ACWR Zones:
    - < 0.8: Undertrained (minor penalty - you're deconditioned)
    - 0.8 - 1.3: Sweet spot (no penalty)
    - 1.3 - 1.5: Caution zone (moderate penalty)
    - 1.5 - 2.0: Danger zone (significant penalty)
    - > 2.0: High risk (major penalty)
    """
    if acwr < 0.8:
        # Undertrained - small penalty to encourage activity
        return 5.0
    elif acwr <= 1.3:
        # Optimal zone - no penalty
        return 0.0
    elif acwr <= 1.5:
        # Caution - linear increase from 0 to 10
        return (acwr - 1.3) / 0.2 * 10.0
    elif acwr <= 2.0:
        # Danger - linear increase from 10 to 20
        return 10.0 + (acwr - 1.5) / 0.5 * 10.0
    else:
        # High risk - cap at 25
        return min(25.0, 20.0 + (acwr - 2.0) * 5.0)


def get_acwr_status(acwr: float) -> str:
    """Get human-readable ACWR status."""
    if acwr < 0.8:
        return "undertrained"
    elif acwr <= 1.3:
        return "optimal"
    elif acwr <= 1.5:
        return "caution"
    elif acwr <= 2.0:
        return "danger"
    else:
        return "high_risk"


def calculate_sleep_trend_component(
    sleep_hours_3_days: List[float], sleep_target: float = 7.5
) -> float:
    """
    Calculate sleep trend component (±10 points).
    Evaluates sleep debt/surplus over 3 days.

    Args:
        sleep_hours_3_days: [2 days ago, yesterday, today]
        sleep_target: Target hours per night (default 7.5)

    Returns:
        Component value from -10 to +10
    """
    if len(sleep_hours_3_days) < 3:
        return 0.0

    total_sleep = sum(sleep_hours_3_days)
    total_target = sleep_target * 3
    sleep_debt = total_sleep - total_target

    # -3h debt = -10 points, +3h surplus = +10 points
    return max(-10.0, min(10.0, sleep_debt / 3.0 * 10.0))


def calculate_event_proximity_modifier(
    days_to_event: Optional[int], event_priority: str = "C"
) -> float:
    """
    Calculate event proximity modifier (±10 points).

    Near an A-race, we want conservative readiness (protect the athlete).

    Args:
        days_to_event: Days until next event, None if no event
        event_priority: "A" (key race), "B" (important), "C" (training race)

    Returns:
        Modifier from -5 to +10
    """
    if days_to_event is None:
        return 0.0

    if event_priority == "A":
        if days_to_event <= 3:
            return 10.0  # Taper boost - you should feel ready
        elif days_to_event <= 7:
            return 5.0  # Light taper period
        elif days_to_event <= 14:
            return -5.0  # Protect from overreaching
    elif event_priority == "B":
        if days_to_event <= 3:
            return 5.0

    return 0.0


def calculate_recent_training_fatigue_v2(
    activities: List[Dict[str, Any]], today: datetime, lookback_days: int = 5
) -> float:
    """
    Calculate recent training fatigue with 5-day lookback (updated from 3).

    Args:
        activities: List of activity dicts with intensity_zone and date
        today: Current date
        lookback_days: Days to look back (5 for V2)

    Returns:
        Fatigue score from 0 to 30 (reduced from 40)
    """
    INTENSITY_IMPACT = {"easy": 3, "moderate": 10, "hard": 20, "max": 30}

    total_fatigue = 0.0

    for day_offset in range(lookback_days):
        day = today - timedelta(days=day_offset)
        day_activities = [
            a
            for a in activities
            if a.get("started_at") and a["started_at"].date() == day.date()
        ]

        day_fatigue = 0.0
        for activity in day_activities:
            intensity = activity.get("intensity_zone", "easy")
            impact = INTENSITY_IMPACT.get(intensity, 3)
            day_fatigue += impact

        # Apply decay (more recent = more impact)
        decay = 1.0 - (day_offset * 0.15)  # 0.85, 0.70, 0.55, 0.40, 0.25
        total_fatigue += day_fatigue * max(0.25, decay)

    return min(30.0, total_fatigue)  # Cap at 30 (reduced from 40)
