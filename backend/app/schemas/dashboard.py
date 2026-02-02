from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime


class ReadinessFactor(BaseModel):
    name: str
    value: str
    detail: str
    status: str


class Guidance(BaseModel):
    recommendation: str
    avoid: List[str]
    suggested: List[str]


class Readiness(BaseModel):
    score: int
    category: str
    trend: str
    factors: List[ReadinessFactor]
    guidance: Guidance


class TrainingLoadChartPoint(BaseModel):
    date: date
    acute: float
    chronic: float


class TrainingLoad(BaseModel):
    acute: float
    chronic: float
    acwr: float
    acwr_status: str
    chart_data: List[TrainingLoadChartPoint]


class Fatigue(BaseModel):
    upper: float
    lower: float
    cardio: float
    cns: float


class HealthSnapshot(BaseModel):
    hrv: Optional[float]
    hrv_baseline: Optional[float]
    resting_hr: Optional[int]
    sleep_hours: Optional[float]
    sleep_score: Optional[int]
    body_battery: Optional[int]


class RecentActivity(BaseModel):
    id: int
    garmin_id: str
    started_at: datetime
    discipline: str
    intensity_zone: str
    duration_minutes: float
    activity_name: Optional[str]
    training_load: Optional[float]


class WeekSummary(BaseModel):
    total_hours: float
    by_discipline: Dict[str, float]
    intensity_distribution: Dict[str, float]


class Dashboard(BaseModel):
    date: date
    readiness: Readiness
    training_load: TrainingLoad
    fatigue: Fatigue
    health: HealthSnapshot
    recent_activities: List[RecentActivity]
    week_summary: WeekSummary
