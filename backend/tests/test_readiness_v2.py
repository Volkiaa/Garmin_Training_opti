"""
Unit tests for Readiness V2 algorithm.

Tests cover:
- EWMA calculation
- ACWR penalty calculation
- Sleep trend component
- Event proximity modifier
- Full readiness V2 calculation
"""

import pytest
from datetime import datetime, timedelta
from app.core.readiness_v2 import (
    ewma,
    calculate_acwr_ewma,
    calculate_acwr_penalty,
    get_acwr_status,
    calculate_sleep_trend_component,
    calculate_event_proximity_modifier,
    calculate_recent_training_fatigue_v2,
    get_readiness_category_v2,
)


class TestEWMA:
    """Test EWMA (Exponentially Weighted Moving Average) calculation."""

    def test_ewma_single_value(self):
        """EWMA of single value returns that value."""
        result = ewma([10.0], decay_days=7)
        assert result == 10.0

    def test_ewma_multiple_values(self):
        """EWMA gives more weight to recent values."""
        # With 7-day decay, recent values have more impact
        loads = [10.0, 10.0, 10.0, 20.0]  # Recent increase
        result = ewma(loads, decay_days=7)
        # Result should be between 10 and 20, closer to recent values
        assert 12.0 < result < 18.0

    def test_ewma_empty_list(self):
        """EWMA of empty list returns 0."""
        result = ewma([], decay_days=7)
        assert result == 0.0


class TestACWR:
    """Test ACWR (Acute:Chronic Workload Ratio) calculation."""

    def test_acwr_insufficient_data(self):
        """ACWR returns 1.0 when insufficient data (< 7 days)."""
        loads = [10.0, 20.0, 30.0]  # Only 3 days
        result = calculate_acwr_ewma(loads)
        assert result == 1.0

    def test_acwr_optimal_zone(self):
        """ACWR around 1.0 indicates optimal training load."""
        # Steady training load
        loads = [100.0] * 28  # 28 days of consistent load
        result = calculate_acwr_ewma(loads)
        # Should be very close to 1.0
        assert 0.95 <= result <= 1.05

    def test_acwr_high_load(self):
        """ACWR > 1.5 indicates danger zone."""
        # Increasing load over 28 days
        loads = list(range(50, 78))  # 50 to 77 (28 days, increasing)
        result = calculate_acwr_ewma(loads)
        # Should be > 1.5 (acute higher than chronic)
        assert result > 1.5

    def test_acwr_low_load(self):
        """ACWR < 0.8 indicates undertraining."""
        # Decreasing load over 28 days
        loads = list(range(100, 72, -1))  # 100 to 73 (decreasing)
        result = calculate_acwr_ewma(loads)
        # Should be < 0.8 (acute lower than chronic)
        assert result < 0.8


class TestACWRPenalty:
    """Test ACWR penalty calculation."""

    def test_acwr_penalty_undertrained(self):
        """Undertrained (< 0.8) gets small penalty."""
        result = calculate_acwr_penalty(0.7)
        assert result == 5.0

    def test_acwr_penalty_optimal(self):
        """Optimal zone (0.8 - 1.3) has no penalty."""
        assert calculate_acwr_penalty(0.8) == 0.0
        assert calculate_acwr_penalty(1.0) == 0.0
        assert calculate_acwr_penalty(1.3) == 0.0

    def test_acwr_penalty_caution(self):
        """Caution zone (1.3 - 1.5) has moderate penalty."""
        result_13 = calculate_acwr_penalty(1.3)
        result_14 = calculate_acwr_penalty(1.4)
        result_15 = calculate_acwr_penalty(1.5)

        assert result_13 == 0.0  # At boundary
        assert 0 < result_14 < 10  # In the middle
        assert result_15 == 10.0  # At boundary

    def test_acwr_penalty_danger(self):
        """Danger zone (1.5 - 2.0) has significant penalty."""
        result_15 = calculate_acwr_penalty(1.5)
        result_175 = calculate_acwr_penalty(1.75)
        result_20 = calculate_acwr_penalty(2.0)

        assert result_15 == 10.0
        assert 10 < result_175 < 20
        assert result_20 == 20.0

    def test_acwr_penalty_high_risk(self):
        """High risk (> 2.0) has major penalty capped at 25."""
        result_20 = calculate_acwr_penalty(2.0)
        result_25 = calculate_acwr_penalty(2.5)
        result_30 = calculate_acwr_penalty(3.0)

        assert result_20 == 20.0
        assert 20 < result_25 <= 25
        assert result_30 == 25.0  # Capped


class TestACWRStatus:
    """Test ACWR status classification."""

    def test_acwr_status_zones(self):
        """Test all ACWR status zones."""
        assert get_acwr_status(0.7) == "undertrained"
        assert get_acwr_status(1.0) == "optimal"
        assert get_acwr_status(1.4) == "caution"
        assert get_acwr_status(1.8) == "danger"
        assert get_acwr_status(2.5) == "high_risk"


class TestSleepTrend:
    """Test sleep trend component calculation."""

    def test_sleep_trend_no_data(self):
        """Insufficient data returns 0."""
        result = calculate_sleep_trend_component([7.0, 7.0], sleep_target=7.5)
        assert result == 0.0

    def test_sleep_trend_optimal(self):
        """Optimal sleep (meets target) returns 0."""
        result = calculate_sleep_trend_component([7.5, 7.5, 7.5], sleep_target=7.5)
        assert result == 0.0

    def test_sleep_trend_deficit(self):
        """Sleep debt reduces score."""
        # 3 nights of 6h when target is 7.5h = 4.5h deficit
        result = calculate_sleep_trend_component([6.0, 6.0, 6.0], sleep_target=7.5)
        # -4.5h / 3 * 10 = -15, clamped to -10
        assert result < 0
        assert result >= -10

    def test_sleep_trend_surplus(self):
        """Sleep surplus increases score."""
        # 3 nights of 9h when target is 7.5h = 4.5h surplus
        result = calculate_sleep_trend_component([9.0, 9.0, 9.0], sleep_target=7.5)
        # 4.5h / 3 * 10 = 15, clamped to 10
        assert result > 0
        assert result <= 10

    def test_sleep_trend_capped(self):
        """Sleep trend is capped at ±10."""
        extreme_deficit = calculate_sleep_trend_component(
            [4.0, 4.0, 4.0], sleep_target=7.5
        )
        extreme_surplus = calculate_sleep_trend_component(
            [10.0, 10.0, 10.0], sleep_target=7.5
        )

        assert extreme_deficit == -10.0
        assert extreme_surplus == 10.0


class TestEventProximity:
    """Test event proximity modifier calculation."""

    def test_no_event(self):
        """No upcoming event returns 0."""
        result = calculate_event_proximity_modifier(None, "A")
        assert result == 0.0

    def test_a_race_taper(self):
        """A-race within 3 days gets taper boost."""
        assert calculate_event_proximity_modifier(3, "A") == 10.0
        assert calculate_event_proximity_modifier(1, "A") == 10.0

    def test_a_race_light_taper(self):
        """A-race within 7 days gets light taper."""
        assert calculate_event_proximity_modifier(7, "A") == 5.0
        assert calculate_event_proximity_modifier(5, "A") == 5.0

    def test_a_race_protection(self):
        """A-race 8-14 days out triggers protection."""
        assert calculate_event_proximity_modifier(14, "A") == -5.0
        assert calculate_event_proximity_modifier(10, "A") == -5.0

    def test_a_race_far_out(self):
        """A-race > 14 days has no effect."""
        assert calculate_event_proximity_modifier(15, "A") == 0.0
        assert calculate_event_proximity_modifier(30, "A") == 0.0

    def test_b_race_taper(self):
        """B-race within 3 days gets small boost."""
        assert calculate_event_proximity_modifier(3, "B") == 5.0
        assert calculate_event_proximity_modifier(1, "B") == 5.0

    def test_b_race_no_effect(self):
        """B-race > 3 days has no effect."""
        assert calculate_event_proximity_modifier(4, "B") == 0.0
        assert calculate_event_proximity_modifier(10, "B") == 0.0

    def test_c_race_no_effect(self):
        """C-race never affects readiness."""
        assert calculate_event_proximity_modifier(1, "C") == 0.0
        assert calculate_event_proximity_modifier(10, "C") == 0.0


class TestReadinessCategoryV2:
    """Test V2 readiness category thresholds."""

    def test_readiness_categories(self):
        """Test updated V2 category thresholds."""
        assert get_readiness_category_v2(85) == "high"
        assert get_readiness_category_v2(80) == "high"
        assert get_readiness_category_v2(70) == "moderate"
        assert get_readiness_category_v2(65) == "moderate"
        assert get_readiness_category_v2(55) == "low"
        assert get_readiness_category_v2(50) == "low"
        assert get_readiness_category_v2(40) == "recovery"
        assert get_readiness_category_v2(35) == "recovery"
        assert get_readiness_category_v2(30) == "rest"
        assert get_readiness_category_v2(0) == "rest"


class TestRecentTrainingFatigueV2:
    """Test V2 recent training fatigue calculation."""

    def test_no_activities(self):
        """No activities means no fatigue."""
        result = calculate_recent_training_fatigue_v2([], datetime.now())
        assert result == 0.0

    def test_single_easy_activity(self):
        """Single easy activity has minimal fatigue."""
        today = datetime.now()
        activities = [
            {"started_at": today, "intensity_zone": "easy"},
        ]
        result = calculate_recent_training_fatigue_v2(activities, today)
        # Easy = 3 impact, no decay for today
        assert result == 3.0

    def test_single_max_activity(self):
        """Single max activity has high fatigue."""
        today = datetime.now()
        activities = [
            {"started_at": today, "intensity_zone": "max"},
        ]
        result = calculate_recent_training_fatigue_v2(activities, today)
        # Max = 30 impact
        assert result == 30.0

    def test_fatigue_capped(self):
        """Fatigue is capped at 30."""
        today = datetime.now()
        # Multiple max sessions would exceed cap
        activities = [
            {"started_at": today, "intensity_zone": "max"},
            {"started_at": today, "intensity_zone": "max"},
        ]
        result = calculate_recent_training_fatigue_v2(activities, today)
        assert result == 30.0  # Capped

    def test_decay_applied(self):
        """Older activities contribute less fatigue."""
        today = datetime.now()
        yesterday = today - timedelta(days=1)

        # Same intensity, different days
        today_activity = [{"started_at": today, "intensity_zone": "moderate"}]
        yesterday_activity = [{"started_at": yesterday, "intensity_zone": "moderate"}]

        today_fatigue = calculate_recent_training_fatigue_v2(today_activity, today)
        yesterday_fatigue = calculate_recent_training_fatigue_v2(
            yesterday_activity, today
        )

        # Today's activity has full impact (10), yesterday has decay (10 * 0.85 = 8.5)
        assert today_fatigue > yesterday_fatigue
