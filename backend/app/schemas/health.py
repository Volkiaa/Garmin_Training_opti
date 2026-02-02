from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime


class DailyHealthBase(BaseModel):
    date: date
    hrv_status: Optional[float] = None
    hrv_7day_avg: Optional[float] = None
    resting_hr: Optional[int] = None
    resting_hr_7day_avg: Optional[float] = None
    sleep_duration_hours: Optional[float] = None
    sleep_score: Optional[int] = None
    deep_sleep_minutes: Optional[int] = None
    rem_sleep_minutes: Optional[int] = None
    body_battery_morning: Optional[int] = None
    body_battery_evening: Optional[int] = None
    stress_avg: Optional[int] = None
    steps: Optional[int] = None
    active_calories: Optional[int] = None
    vo2max_running: Optional[float] = None
    vo2max_cycling: Optional[float] = None
    training_status: Optional[str] = None
    training_load_7day: Optional[float] = None


class DailyHealthCreate(DailyHealthBase):
    raw_data: Optional[Dict[str, Any]] = None


class DailyHealth(DailyHealthBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HealthMetricsList(BaseModel):
    metrics: List[DailyHealth]


class HealthTrend(BaseModel):
    current_avg: float
    previous_avg: float
    trend: str
    data: List[Dict[str, Any]]


class HealthTrends(BaseModel):
    period: str
    hrv: HealthTrend
    resting_hr: HealthTrend
    sleep: HealthTrend
