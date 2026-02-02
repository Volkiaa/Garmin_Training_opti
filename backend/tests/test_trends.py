"""
Unit tests for Trends service.

Tests cover:
- Weekly metrics aggregation
- Daily trends retrieval
- Period comparison
- Week boundary calculations
"""

import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock
from app.services.trends_service import TrendsService, get_week_start


class TestGetWeekStart:
    """Test ISO week start calculation."""

    def test_monday_is_week_start(self):
        """Monday is always the week start."""
        monday = date(2026, 3, 2)  # A Monday
        result = get_week_start(monday)
        assert result == monday
        assert result.weekday() == 0  # Monday

    def test_sunday_returns_previous_monday(self):
        """Sunday returns the Monday of the same week."""
        sunday = date(2026, 3, 8)  # A Sunday
        result = get_week_start(sunday)
        expected_monday = date(2026, 3, 2)  # Previous Monday
        assert result == expected_monday
        assert result.weekday() == 0

    def test_wednesday_returns_week_monday(self):
        """Wednesday returns the Monday of the same week."""
        wednesday = date(2026, 3, 4)  # A Wednesday
        result = get_week_start(wednesday)
        expected_monday = date(2026, 3, 2)  # Same week Monday
        assert result == expected_monday

    def test_friday_returns_week_monday(self):
        """Friday returns the Monday of the same week."""
        friday = date(2026, 3, 6)  # A Friday
        result = get_week_start(friday)
        expected_monday = date(2026, 3, 2)  # Same week Monday
        assert result == expected_monday


@pytest.mark.asyncio
class TestTrendsService:
    """Test TrendsService operations."""

    async def test_get_week_start_helper(self):
        """Test that get_week_start returns correct Monday."""
        test_date = date(2026, 3, 5)  # Thursday
        week_start = get_week_start(test_date)
        assert week_start.weekday() == 0  # Monday
        assert week_start <= test_date
        assert (test_date - week_start).days < 7

    async def test_compare_periods_calculates_averages(self):
        """Period comparison calculates correct averages."""
        mock_db = AsyncMock()
        service = TrendsService(mock_db)

        # Create mock metrics for period 1
        mock_metrics_1 = []
        for i in range(7):  # 7 days
            m = MagicMock()
            m.readiness_score = 70 + i
            m.acwr = 1.2 + (i * 0.1)
            m.hrv_status = 50 + i
            m.sleep_duration_hours = 7.0 + (i * 0.1)
            m.acute_load = 100 + i * 10
            mock_metrics_1.append(m)

        # Create mock metrics for period 2 (lower values)
        mock_metrics_2 = []
        for i in range(7):
            m = MagicMock()
            m.readiness_score = 60 + i
            m.acwr = 1.0 + (i * 0.05)
            m.hrv_status = 45 + i
            m.sleep_duration_hours = 6.5 + (i * 0.1)
            m.acute_load = 80 + i * 5
            mock_metrics_2.append(m)

        # Mock execute to return different results for each call
        mock_result_1 = MagicMock()
        mock_result_1.scalars.return_value.all.return_value = mock_metrics_1

        mock_result_2 = MagicMock()
        mock_result_2.scalars.return_value.all.return_value = mock_metrics_2

        mock_db.execute.side_effect = [mock_result_1, mock_result_2]

        result = await service.compare_periods(
            date(2026, 3, 1), date(2026, 3, 7), date(2026, 3, 8), date(2026, 3, 14)
        )

        # Verify period 1 metrics
        assert result["period1"]["metrics"]["days_count"] == 7
        assert result["period1"]["metrics"]["avg_readiness"] > 70

        # Verify period 2 metrics
        assert result["period2"]["metrics"]["days_count"] == 7
        assert result["period2"]["metrics"]["avg_readiness"] > 60

        # Verify delta shows improvement in period 1
        assert result["delta"]["readiness"]["absolute"] > 0
        assert result["delta"]["readiness"]["percent"] > 0

    async def test_compare_periods_empty_period(self):
        """Period comparison handles empty periods."""
        mock_db = AsyncMock()
        service = TrendsService(mock_db)

        # Both periods empty
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        result = await service.compare_periods(
            date(2026, 3, 1), date(2026, 3, 7), date(2026, 3, 8), date(2026, 3, 14)
        )

        assert result["period1"]["metrics"]["days_count"] == 0
        assert result["period2"]["metrics"]["days_count"] == 0
        assert result["period1"]["metrics"]["avg_readiness"] == 0

    async def test_compare_periods_calculates_percent_change(self):
        """Percent change is calculated correctly."""
        mock_db = AsyncMock()
        service = TrendsService(mock_db)

        # Period 1: readiness = 80
        mock_metrics_1 = [MagicMock()]
        mock_metrics_1[0].readiness_score = 80
        mock_metrics_1[0].acwr = 1.2
        mock_metrics_1[0].hrv_status = 50
        mock_metrics_1[0].sleep_duration_hours = 7.5
        mock_metrics_1[0].acute_load = 100

        # Period 2: readiness = 60 (25% decrease)
        mock_metrics_2 = [MagicMock()]
        mock_metrics_2[0].readiness_score = 60
        mock_metrics_2[0].acwr = 1.0
        mock_metrics_2[0].hrv_status = 45
        mock_metrics_2[0].sleep_duration_hours = 6.5
        mock_metrics_2[0].acute_load = 80

        mock_result_1 = MagicMock()
        mock_result_1.scalars.return_value.all.return_value = mock_metrics_1

        mock_result_2 = MagicMock()
        mock_result_2.scalars.return_value.all.return_value = mock_metrics_2

        mock_db.execute.side_effect = [mock_result_1, mock_result_2]

        result = await service.compare_periods(
            date(2026, 3, 1), date(2026, 3, 7), date(2026, 3, 8), date(2026, 3, 14)
        )

        # 80 vs 60 = +20 absolute, +33.3% change
        assert result["delta"]["readiness"]["absolute"] == 20
        assert abs(result["delta"]["readiness"]["percent"] - 33.3) < 0.1

    async def test_compare_periods_same_periods_no_change(self):
        """Same periods show zero change."""
        mock_db = AsyncMock()
        service = TrendsService(mock_db)

        # Both periods identical
        mock_metrics = [MagicMock()]
        mock_metrics[0].readiness_score = 70
        mock_metrics[0].acwr = 1.2
        mock_metrics[0].hrv_status = 50
        mock_metrics[0].sleep_duration_hours = 7.0
        mock_metrics[0].acute_load = 100

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_metrics
        mock_db.execute.return_value = mock_result

        result = await service.compare_periods(
            date(2026, 3, 1), date(2026, 3, 7), date(2026, 3, 1), date(2026, 3, 7)
        )

        assert result["delta"]["readiness"]["absolute"] == 0
        assert result["delta"]["readiness"]["percent"] == 0


class TestTrendsCalculations:
    """Test trend calculation utilities."""

    def test_week_boundary_crossing(self):
        """Week boundaries are handled correctly."""
        # Friday to next Monday
        friday = date(2026, 3, 6)
        next_monday = date(2026, 3, 9)

        friday_week = get_week_start(friday)
        monday_week = get_week_start(next_monday)

        # Friday should be in the same week as Monday before it
        assert friday_week == date(2026, 3, 2)
        # Next Monday should be start of new week
        assert monday_week == date(2026, 3, 9)

    def test_year_boundary_weeks(self):
        """Week calculations work across year boundaries."""
        # December 29, 2025 (Monday)
        dec_29 = date(2025, 12, 29)
        result = get_week_start(dec_29)
        assert result == dec_29

        # January 1, 2026 (Thursday)
        jan_1 = date(2026, 1, 1)
        result = get_week_start(jan_1)
        assert result == dec_29  # Same week

    def test_leap_year_weeks(self):
        """Week calculations work in leap years."""
        # February 29, 2024 (leap year, Thursday)
        feb_29 = date(2024, 2, 29)
        result = get_week_start(feb_29)
        expected_monday = date(2024, 2, 26)
        assert result == expected_monday
