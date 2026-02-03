import enum
from sqlalchemy import Column, Integer, DateTime, Text, String
from sqlalchemy.sql import func
from app.database import Base


class SyncStatusEnum(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class TriggeredByEnum(str, enum.Enum):
    manual = "manual"
    hourly = "hourly"
    daily = "daily"


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    activities_found = Column(Integer, nullable=True)
    activities_synced = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    triggered_by = Column(String(20), nullable=False)
    next_scheduled_run = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
