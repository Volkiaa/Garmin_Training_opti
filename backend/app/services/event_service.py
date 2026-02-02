"""
Events Service - CRUD operations and queries
"""

from datetime import date
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Event


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_event(
        self,
        name: str,
        event_date: date,
        event_type: str,
        distance: Optional[str] = None,
        priority: str = "B",
        notes: Optional[str] = None,
    ) -> Event:
        """Create a new event."""
        event = Event(
            name=name,
            event_date=event_date,
            event_type=event_type,
            distance=distance,
            priority=priority,
            notes=notes,
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_event(self, event_id: int) -> Optional[Event]:
        """Get a single event by ID."""
        result = await self.db.execute(select(Event).where(Event.id == event_id))
        return result.scalar_one_or_none()

    async def list_events(
        self, upcoming_only: bool = False, include_past: bool = True
    ) -> List[Event]:
        """List all events."""
        query = select(Event)

        if upcoming_only:
            query = query.where(Event.event_date >= date.today())
        elif not include_past:
            query = query.where(Event.event_date >= date.today())

        query = query.order_by(Event.event_date)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_upcoming_events(
        self, days_ahead: int = 365, priority: Optional[str] = None
    ) -> List[Event]:
        """Get upcoming events within timeframe."""
        today = date.today()
        future = today + __import__("datetime").timedelta(days=days_ahead)

        query = select(Event).where(
            and_(Event.event_date >= today, Event.event_date <= future)
        )

        if priority:
            query = query.where(Event.priority == priority)

        query = query.order_by(Event.event_date)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_next_event(self, priority: Optional[str] = None) -> Optional[Event]:
        """Get the next upcoming event."""
        today = date.today()

        query = select(Event).where(Event.event_date >= today)

        if priority:
            query = query.where(Event.priority == priority)
        else:
            query = query.where(Event.priority.in_(["A", "B"]))

        query = query.order_by(Event.event_date).limit(1)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_event(
        self,
        event_id: int,
        name: Optional[str] = None,
        event_date: Optional[date] = None,
        event_type: Optional[str] = None,
        distance: Optional[str] = None,
        priority: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[Event]:
        """Update an existing event."""
        event = await self.get_event(event_id)
        if not event:
            return None

        if name is not None:
            event.name = name
        if event_date is not None:
            event.event_date = event_date
        if event_type is not None:
            event.event_type = event_type
        if distance is not None:
            event.distance = distance
        if priority is not None:
            event.priority = priority
        if notes is not None:
            event.notes = notes

        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def delete_event(self, event_id: int) -> bool:
        """Delete an event. Returns True if deleted, False if not found."""
        event = await self.get_event(event_id)
        if not event:
            return False

        await self.db.delete(event)
        await self.db.commit()
        return True

    async def get_events_for_readiness(
        self, today: date
    ) -> tuple[Optional[int], Optional[str]]:
        """
        Get days to next event and its priority for readiness calculation.

        Returns:
            (days_to_event, priority) or (None, None) if no upcoming events
        """
        event = await self.get_next_event()
        if not event:
            return None, None

        days_to_event = (event.event_date - today).days
        return days_to_event, event.priority
