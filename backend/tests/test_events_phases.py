"""
Unit tests for Events and Training Phases.

Tests cover:
- Event CRUD operations
- Event queries (upcoming, next, by priority)
- Phase detection
- Phase auto-generation
- Phase templates
"""

import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock
from app.services.event_service import EventService
from app.services.phase_service import (
    PhaseService,
    detect_phase_for_event,
    generate_phases_for_event,
    get_phase_name,
    PHASE_TEMPLATES,
)


class TestGetPhaseName:
    """Test phase name display function."""

    def test_known_phase_names(self):
        """Test all known phase types return proper names."""
        assert get_phase_name("base") == "Base Training"
        assert get_phase_name("build") == "Build Phase"
        assert get_phase_name("peak") == "Peak Phase"
        assert get_phase_name("taper") == "Taper"
        assert get_phase_name("recovery") == "Recovery"

    def test_unknown_phase_name(self):
        """Unknown phase types return title case."""
        assert get_phase_name("unknown") == "Unknown"
        assert get_phase_name("custom_phase") == "Custom_Phase"


class TestPhaseTemplates:
    """Test phase template configurations."""

    def test_hyrox_template_structure(self):
        """Hyrox template has all required phases."""
        template = PHASE_TEMPLATES["hyrox"]
        assert "base" in template
        assert "build" in template
        assert "peak" in template
        assert "taper" in template

    def test_triathlon_half_template(self):
        """Triathlon half template has correct week ranges."""
        template = PHASE_TEMPLATES["triathlon_half"]
        # Taper: 0-2 weeks
        assert template["taper"] == (0, 2)
        # Peak: 2-4 weeks
        assert template["peak"] == (2, 4)
        # Build: 4-10 weeks
        assert template["build"] == (4, 10)
        # Base: 10+ weeks (None means unlimited)
        assert template["base"] == (10, None)

    def test_all_templates_have_required_phases(self):
        """All templates have the four main phases."""
        for event_type, template in PHASE_TEMPLATES.items():
            assert "base" in template, f"{event_type} missing base"
            assert "build" in template, f"{event_type} missing build"
            assert "peak" in template, f"{event_type} missing peak"
            assert "taper" in template, f"{event_type} missing taper"


class TestDetectPhaseForEvent:
    """Test phase detection based on event date."""

    def create_mock_event(self, event_date, event_type="hyrox", priority="A"):
        """Helper to create mock event."""
        event = MagicMock()
        event.event_date = event_date
        event.event_type = event_type
        event.priority = priority
        event.name = "Test Event"
        return event

    def test_past_event_returns_none(self):
        """Events in the past return None."""
        today = date(2026, 2, 1)
        past_event = self.create_mock_event(date(2026, 1, 1))
        result = detect_phase_for_event(past_event, today)
        assert result is None

    def test_hyrox_taper_phase(self):
        """Hyrox event 0.5 weeks out is in taper."""
        today = date(2026, 3, 1)
        event_date = today + timedelta(days=3)  # ~0.4 weeks
        event = self.create_mock_event(event_date, "hyrox")
        result = detect_phase_for_event(event, today)
        assert result["phase"] == "taper"
        assert result["phase_name"] == "Taper"

    def test_hyrox_peak_phase(self):
        """Hyrox event 2 weeks out is in peak."""
        today = date(2026, 3, 1)
        event_date = today + timedelta(weeks=2)
        event = self.create_mock_event(event_date, "hyrox")
        result = detect_phase_for_event(event, today)
        assert result["phase"] == "peak"
        assert result["phase_name"] == "Peak Phase"

    def test_hyrox_build_phase(self):
        """Hyrox event 5 weeks out is in build."""
        today = date(2026, 3, 1)
        event_date = today + timedelta(weeks=5)
        event = self.create_mock_event(event_date, "hyrox")
        result = detect_phase_for_event(event, today)
        assert result["phase"] == "build"
        assert result["phase_name"] == "Build Phase"

    def test_hyrox_base_phase(self):
        """Hyrox event 10 weeks out is in base."""
        today = date(2026, 3, 1)
        event_date = today + timedelta(weeks=10)
        event = self.create_mock_event(event_date, "hyrox")
        result = detect_phase_for_event(event, today)
        assert result["phase"] == "base"
        assert result["phase_name"] == "Base Training"

    def test_weeks_out_calculation(self):
        """Weeks out is calculated correctly."""
        today = date(2026, 3, 1)
        event_date = today + timedelta(weeks=6, days=3)  # 6.4 weeks
        event = self.create_mock_event(event_date, "hyrox")
        result = detect_phase_for_event(event, today)
        assert abs(result["weeks_out"] - 6.4) < 0.1

    def test_event_included_in_result(self):
        """Event object is included in result."""
        today = date(2026, 3, 1)
        event = self.create_mock_event(today + timedelta(weeks=4))
        result = detect_phase_for_event(event, today)
        assert result["event"] == event


class TestGeneratePhasesForEvent:
    """Test phase auto-generation."""

    def create_mock_event(self, event_date, event_type="hyrox"):
        """Helper to create mock event."""
        event = MagicMock()
        event.event_date = event_date
        event.event_type = event_type
        event.id = 1
        event.name = "Test Event"
        return event

    def test_generates_all_phases(self):
        """Phase generation creates all 4 phases."""
        event = self.create_mock_event(date(2026, 6, 1), "hyrox")
        phases = generate_phases_for_event(event)
        phase_types = {p["phase_type"] for p in phases}
        assert phase_types == {"base", "build", "peak", "taper"}

    def test_phase_dates_are_sequential(self):
        """Phase dates don't overlap and are sequential."""
        event = self.create_mock_event(date(2026, 6, 1), "hyrox")
        phases = generate_phases_for_event(event)
        # Sort by start date
        sorted_phases = sorted(phases, key=lambda p: p["start_date"])
        for i in range(len(sorted_phases) - 1):
            # End date of one should align with start of next
            assert sorted_phases[i]["end_date"] == sorted_phases[i + 1]["start_date"]

    def test_taper_ends_on_event_date(self):
        """Taper phase ends on the event date."""
        event_date = date(2026, 6, 1)
        event = self.create_mock_event(event_date, "hyrox")
        phases = generate_phases_for_event(event)
        taper = next(p for p in phases if p["phase_type"] == "taper")
        assert taper["end_date"] == event_date

    def test_base_phase_is_longest(self):
        """Base phase has the longest duration."""
        event = self.create_mock_event(date(2026, 6, 1), "hyrox")
        phases = generate_phases_for_event(event)
        base = next(p for p in phases if p["phase_type"] == "base")
        base_duration = (base["end_date"] - base["start_date"]).days
        for phase in phases:
            if phase["phase_type"] != "base":
                duration = (phase["end_date"] - phase["start_date"]).days
                assert base_duration > duration

    def test_phase_names_include_event_name(self):
        """Generated phase names include event name."""
        event = self.create_mock_event(date(2026, 6, 1), "hyrox")
        event.name = "Hyrox Paris"
        phases = generate_phases_for_event(event)
        for phase in phases:
            assert "Hyrox Paris" in phase["name"]

    def test_target_event_id_set(self):
        """All phases reference the target event."""
        event = self.create_mock_event(date(2026, 6, 1), "hyrox")
        phases = generate_phases_for_event(event)
        for phase in phases:
            assert phase["target_event_id"] == event.id


@pytest.mark.asyncio
class TestEventService:
    """Test EventService CRUD operations."""

    async def test_create_event(self):
        """Test event creation."""
        mock_db = AsyncMock()
        service = EventService(mock_db)

        event = await service.create_event(
            name="Hyrox Paris",
            event_date=date(2026, 6, 1),
            event_type="hyrox",
            priority="A",
        )

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    async def test_get_event_found(self):
        """Test getting existing event."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_event = MagicMock()
        mock_event.id = 1
        mock_result.scalar_one_or_none.return_value = mock_event
        mock_db.execute.return_value = mock_result

        service = EventService(mock_db)
        event = await service.get_event(1)

        assert event is not None
        assert event.id == 1

    async def test_get_event_not_found(self):
        """Test getting non-existent event returns None."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        service = EventService(mock_db)
        event = await service.get_event(999)

        assert event is None

    async def test_delete_event_success(self):
        """Test successful event deletion."""
        mock_db = AsyncMock()
        mock_event = MagicMock()

        # Mock get_event to return the event
        service = EventService(mock_db)
        service.get_event = AsyncMock(return_value=mock_event)

        result = await service.delete_event(1)

        assert result is True
        mock_db.delete.assert_called_once_with(mock_event)
        mock_db.commit.assert_called_once()

    async def test_delete_event_not_found(self):
        """Test deletion of non-existent event returns False."""
        mock_db = AsyncMock()

        service = EventService(mock_db)
        service.get_event = AsyncMock(return_value=None)

        result = await service.delete_event(999)

        assert result is False

    async def test_get_events_for_readiness_with_event(self):
        """Test getting days to event when event exists."""
        mock_db = AsyncMock()
        mock_event = MagicMock()
        mock_event.event_date = date(2026, 6, 15)
        mock_event.priority = "A"

        service = EventService(mock_db)
        service.get_next_event = AsyncMock(return_value=mock_event)

        days, priority = await service.get_events_for_readiness(date(2026, 6, 1))

        assert days == 14
        assert priority == "A"

    async def test_get_events_for_readiness_no_event(self):
        """Test getting days when no upcoming event."""
        mock_db = AsyncMock()

        service = EventService(mock_db)
        service.get_next_event = AsyncMock(return_value=None)

        days, priority = await service.get_events_for_readiness(date(2026, 6, 1))

        assert days is None
        assert priority is None


@pytest.mark.asyncio
class TestPhaseService:
    """Test PhaseService operations."""

    async def test_get_current_phase_no_events(self):
        """When no events, returns base phase."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        service = PhaseService(mock_db)
        phase = await service.get_current_phase(date(2026, 3, 1))

        assert phase["phase"] == "base"
        assert phase["phase_name"] == "Base Training"
        assert phase["event"] is None

    async def test_delete_phases_for_event(self):
        """Test deleting phases for an event."""
        mock_db = AsyncMock()
        mock_phases = [MagicMock(), MagicMock(), MagicMock()]

        service = PhaseService(mock_db)
        service.list_phases = AsyncMock(return_value=mock_phases)

        count = await service.delete_phases_for_event(1)

        assert count == 3
        assert mock_db.delete.call_count == 3
        mock_db.commit.assert_called_once()
