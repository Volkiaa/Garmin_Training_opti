from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class Settings(BaseModel):
    max_hr: int
    resting_hr_baseline: int
    hrv_baseline: float
    sleep_target_hours: float
    disciplines_enabled: List[str]
    weekly_volume_targets: Dict[str, float]
    override_garmin: bool = False


class SettingsUpdate(BaseModel):
    max_hr: Optional[int] = None
    resting_hr_baseline: Optional[int] = None
    hrv_baseline: Optional[float] = None
    sleep_target_hours: Optional[float] = None
    disciplines_enabled: Optional[List[str]] = None
    weekly_volume_targets: Optional[Dict[str, float]] = None
    override_garmin: Optional[bool] = None


class SyncStatus(BaseModel):
    last_sync: Optional[str]
    status: str
    activities_synced: int
    health_days_synced: int
    errors: List[str]


class SyncTrigger(BaseModel):
    days: int = 28
    full_sync: bool = False
