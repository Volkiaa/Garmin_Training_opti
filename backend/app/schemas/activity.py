from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class ActivityBase(BaseModel):
    garmin_id: str
    started_at: datetime
    duration_minutes: float
    activity_type: str
    activity_name: Optional[str] = None
    discipline: str
    intensity_zone: str
    body_regions: List[str] = []
    training_load: Optional[float] = None
    calories: Optional[int] = None
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    distance_meters: Optional[float] = None
    hr_zone_1_minutes: Optional[float] = None
    hr_zone_2_minutes: Optional[float] = None
    hr_zone_3_minutes: Optional[float] = None
    hr_zone_4_minutes: Optional[float] = None
    hr_zone_5_minutes: Optional[float] = None
    notes: Optional[str] = None
    avg_power: Optional[int] = None
    max_power: Optional[int] = None
    normalized_power: Optional[float] = None
    avg_speed: Optional[float] = None
    max_speed: Optional[float] = None
    avg_cadence: Optional[int] = None
    max_cadence: Optional[int] = None
    elevation_gain: Optional[float] = None
    elevation_loss: Optional[float] = None
    aerobic_te: Optional[float] = None
    anaerobic_te: Optional[float] = None


class ActivityCreate(ActivityBase):
    raw_data: Optional[Dict[str, Any]] = None


class ActivityUpdate(BaseModel):
    discipline: Optional[str] = None
    intensity_zone: Optional[str] = None
    body_regions: Optional[List[str]] = None
    notes: Optional[str] = None


class Activity(ActivityBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityDetail(Activity):
    hr_zones: Dict[str, float]
    fatigue_impact: Dict[str, float]
    raw_data: Optional[Dict[str, Any]] = None


class ActivityList(BaseModel):
    total: int
    limit: int
    offset: int
    activities: List[Activity]
