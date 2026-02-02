from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Date,
    Float,
    JSON,
    ARRAY,
    Enum,
    create_engine,
)
from sqlalchemy.sql import func
from app.database import Base
import enum


class DisciplineEnum(str, enum.Enum):
    hyrox = "hyrox"
    strength = "strength"
    run = "run"
    bike = "bike"
    swim = "swim"
    other = "other"


class IntensityZoneEnum(str, enum.Enum):
    easy = "easy"
    moderate = "moderate"
    hard = "hard"
    max = "max"


class BodyRegionEnum(str, enum.Enum):
    upper = "upper"
    lower = "lower"
    core = "core"
    cardio = "cardio"


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    garmin_id = Column(String, unique=True, index=True)
    started_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Float)
    activity_type = Column(String)
    activity_name = Column(String)
    discipline = Column(String)
    intensity_zone = Column(String)
    body_regions = Column(ARRAY(String))
    training_load = Column(Float)
    calories = Column(Integer)
    avg_hr = Column(Integer)
    max_hr = Column(Integer)
    distance_meters = Column(Float)
    hr_zone_1_minutes = Column(Float)
    hr_zone_2_minutes = Column(Float)
    hr_zone_3_minutes = Column(Float)
    hr_zone_4_minutes = Column(Float)
    hr_zone_5_minutes = Column(Float)
    notes = Column(String)
    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class DailyHealth(Base):
    __tablename__ = "daily_health"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True)
    hrv_status = Column(Float)
    hrv_7day_avg = Column(Float)
    resting_hr = Column(Integer)
    resting_hr_7day_avg = Column(Float)
    sleep_duration_hours = Column(Float)
    sleep_score = Column(Integer)
    deep_sleep_minutes = Column(Integer)
    rem_sleep_minutes = Column(Integer)
    body_battery_morning = Column(Integer)
    body_battery_evening = Column(Integer)
    stress_avg = Column(Integer)
    steps = Column(Integer)
    active_calories = Column(Integer)
    vo2max_running = Column(Float)
    vo2max_cycling = Column(Float)
    training_status = Column(String)
    training_load_7day = Column(Float)
    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ComputedMetrics(Base):
    __tablename__ = "computed_metrics"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True)
    readiness_score = Column(Integer)
    readiness_factors = Column(JSON)
    acute_load = Column(Float)
    chronic_load = Column(Float)
    acwr = Column(Float)
    acwr_status = Column(String)
    fatigue_upper = Column(Float)
    fatigue_lower = Column(Float)
    fatigue_cardio = Column(Float)
    fatigue_cns = Column(Float)
    weekly_volume_by_discipline = Column(JSON)
    intensity_distribution = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    max_hr = Column(Integer, default=185)
    resting_hr_baseline = Column(Integer, default=50)
    hrv_baseline = Column(Float, default=55.0)
    sleep_target_hours = Column(Float, default=7.5)
    disciplines_enabled = Column(ARRAY(String), default=list)
    weekly_volume_targets = Column(JSON, default=dict)
    fatigue_decay_rates = Column(JSON, default=dict)
    override_garmin = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    event_date = Column(Date, nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    distance = Column(String(50), nullable=True)
    priority = Column(String(1), default="B", nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TrainingPhase(Base):
    __tablename__ = "training_phases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phase_type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    target_event_id = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WeeklyMetrics(Base):
    __tablename__ = "weekly_metrics"

    id = Column(Integer, primary_key=True, index=True)
    week_start = Column(Date, nullable=False, unique=True)
    week_end = Column(Date, nullable=False)
    total_volume_hours = Column(Float)
    total_load = Column(Float)
    volume_by_discipline = Column(JSON)
    intensity_distribution = Column(JSON)
    avg_readiness = Column(Float)
    avg_hrv = Column(Float)
    avg_sleep_hours = Column(Float)
    avg_acwr = Column(Float)
    activity_count = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
