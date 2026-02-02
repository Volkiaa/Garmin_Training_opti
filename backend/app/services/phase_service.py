"""
Training Phases Service - Phase detection and auto-generation
"""

from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Event, TrainingPhase


# Phase templates by event type (weeks before event)
PHASE_TEMPLATES = {
    "hyrox": {
        "taper": (0, 1),  # 0-1 weeks out
        "peak": (1, 3),  # 1-3 weeks out
        "build": (3, 8),  # 3-8 weeks out
        "base": (8, None),  # 8+ weeks out
    },
    "triathlon_half": {
        "taper": (0, 2),
        "peak": (2, 4),
        "build": (4, 10),
        "base": (10, None),
    },
    "triathlon_full": {
        "taper": (0, 2),
        "peak": (2, 4),
        "build": (4, 12),
        "base": (12, None),
    },
    "marathon": {
        "taper": (0, 2),
        "peak": (2, 4),
        "build": (4, 10),
        "base": (10, None),
    },
    "other": {
        "taper": (0, 1),
        "peak": (1, 2),
        "build": (2, 6),
        "base": (6, None),
    },
}


def get_phase_name(phase_type: str) -> str:
    """Get display name for phase type."""
    names = {
        "base": "Base Training",
        "build": "Build Phase",
        "peak": "Peak Phase",
        "taper": "Taper",
        "recovery": "Recovery",
    }
    return names.get(phase_type, phase_type.title())


def detect_phase_for_event(event: Event, today: date) -> Optional[Dict[str, Any]]:
    """
    Determine current training phase for an event.

    Returns:
        Dict with phase_type, weeks_out, or None if event is in the past
    """
    if event.event_date < today:
        return None

    weeks_out = (event.event_date - today).days / 7
    template = PHASE_TEMPLATES.get(event.event_type, PHASE_TEMPLATES["other"])

    for phase_name, (min_weeks, max_weeks) in template.items():
        if max_weeks is None:
            if weeks_out >= min_weeks:
                return {
                    "phase": phase_name,
                    "phase_name": get_phase_name(phase_name),
                    "weeks_out": weeks_out,
                    "event": event,
                }
        elif min_weeks <= weeks_out < max_weeks:
            return {
                "phase": phase_name,
                "phase_name": get_phase_name(phase_name),
                "weeks_out": weeks_out,
                "event": event,
            }

    return {
        "phase": "base",
        "phase_name": get_phase_name("base"),
        "weeks_out": weeks_out,
        "event": event,
    }


def generate_phases_for_event(event: Event) -> List[Dict[str, Any]]:
    """
    Auto-generate training phases for an event.

    Returns:
        List of phase dicts with name, phase_type, start_date, end_date
    """
    template = PHASE_TEMPLATES.get(event.event_type, PHASE_TEMPLATES["other"])
    phases = []

    for phase_type, (min_weeks, max_weeks) in template.items():
        # Calculate dates backwards from event date
        if max_weeks is None:
            # Base phase extends to 365 days before
            end_date = event.event_date - timedelta(weeks=min_weeks)
            start_date = end_date - timedelta(days=365)
        else:
            end_date = event.event_date - timedelta(weeks=min_weeks)
            start_date = event.event_date - timedelta(weeks=max_weeks)

        phases.append(
            {
                "name": f"{get_phase_name(phase_type)} - {event.name}",
                "phase_type": phase_type,
                "start_date": start_date,
                "end_date": end_date,
                "target_event_id": event.id,
            }
        )

    return phases


class PhaseService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_current_phase(
        self, today: Optional[date] = None
    ) -> Optional[Dict[str, Any]]:
        """Get the current training phase based on upcoming events."""
        if today is None:
            today = date.today()

        # Find next A or B priority event
        result = await self.db.execute(
            select(Event)
            .where(Event.event_date >= today, Event.priority.in_(["A", "B"]))
            .order_by(Event.event_date)
            .limit(1)
        )
        next_event = result.scalar_one_or_none()

        if not next_event:
            return {
                "phase": "base",
                "phase_name": "Base Training",
                "event": None,
                "weeks_out": None,
            }

        return detect_phase_for_event(next_event, today)

    async def create_phases_for_event(self, event_id: int) -> List[TrainingPhase]:
        """Auto-generate and save training phases for an event."""
        result = await self.db.execute(select(Event).where(Event.id == event_id))
        event = result.scalar_one_or_none()

        if not event:
            return []

        phase_data = generate_phases_for_event(event)
        phases = []

        for data in phase_data:
            phase = TrainingPhase(**data)
            self.db.add(phase)
            phases.append(phase)

        await self.db.commit()
        for phase in phases:
            await self.db.refresh(phase)

        return phases

    async def list_phases(
        self, event_id: Optional[int] = None, active_only: bool = False
    ) -> List[TrainingPhase]:
        """List training phases."""
        query = select(TrainingPhase)

        if event_id:
            query = query.where(TrainingPhase.target_event_id == event_id)

        if active_only:
            today = date.today()
            query = query.where(
                TrainingPhase.start_date <= today, TrainingPhase.end_date >= today
            )

        query = query.order_by(TrainingPhase.start_date)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_phase(self, phase_id: int) -> Optional[TrainingPhase]:
        """Get a single phase by ID."""
        result = await self.db.execute(
            select(TrainingPhase).where(TrainingPhase.id == phase_id)
        )
        return result.scalar_one_or_none()

    async def delete_phases_for_event(self, event_id: int) -> int:
        """Delete all phases for an event. Returns count deleted."""
        phases = await self.list_phases(event_id=event_id)
        for phase in phases:
            await self.db.delete(phase)
        await self.db.commit()
        return len(phases)
