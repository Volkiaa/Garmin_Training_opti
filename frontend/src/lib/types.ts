export interface Activity {
  id: number;
  garmin_id: string;
  started_at: string;
  duration_minutes: number;
  activity_type: string;
  activity_name?: string;
  discipline: string;
  intensity_zone: string;
  body_regions: string[];
  training_load?: number;
  calories?: number;
  avg_hr?: number;
  max_hr?: number;
  distance_meters?: number;
  notes?: string;
  created_at: string;
}

export interface ActivityDetail extends Activity {
  hr_zones: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
  fatigue_impact: {
    upper: number;
    lower: number;
    cardio: number;
    cns: number;
  };
  raw_data?: Record<string, unknown>;
}

export interface ActivityList {
  total: number;
  limit: number;
  offset: number;
  activities: Activity[];
}

export interface DailyHealth {
  id: number;
  date: string;
  hrv_status?: number;
  hrv_7day_avg?: number;
  resting_hr?: number;
  resting_hr_7day_avg?: number;
  sleep_duration_hours?: number;
  sleep_score?: number;
  deep_sleep_minutes?: number;
  rem_sleep_minutes?: number;
  body_battery_morning?: number;
  body_battery_evening?: number;
  stress_avg?: number;
  steps?: number;
  active_calories?: number;
  vo2max_running?: number;
  vo2max_cycling?: number;
  training_status?: string;
  training_load_7day?: number;
}

export interface SportReadinessData {
  status: 'ready' | 'caution' | 'not_ready';
  blockers: string[];
}

export interface Readiness {
  score: number;
  category: string;
  trend: string;
  factors: ReadinessFactor[];
  guidance: Guidance;
  sport_specific?: Record<string, SportReadinessData>;
}

export interface ReadinessFactor {
  name: string;
  value: string;
  detail: string;
  status: string;
}

export interface Guidance {
  recommendation: string;
  avoid: string[];
  suggested: string[];
}

export interface TrainingLoad {
  acute: number;
  chronic: number;
  acwr: number;
  acwr_status: string;
  chart_data: TrainingLoadPoint[];
}

export interface TrainingLoadPoint {
  date: string;
  acute: number;
  chronic: number;
}

export interface Fatigue {
  upper: number;
  lower: number;
  cardio: number;
  cns: number;
}

export interface HealthSnapshot {
  hrv?: number;
  hrv_baseline?: number;
  resting_hr?: number;
  sleep_hours?: number;
  sleep_score?: number;
  body_battery?: number;
}

export interface WeekSummary {
  total_hours: number;
  by_discipline: Record<string, number>;
  intensity_distribution: Record<string, number>;
}

export interface Dashboard {
  date: string;
  readiness: Readiness;
  training_load: TrainingLoad;
  fatigue: Fatigue;
  health: HealthSnapshot;
  recent_activities: Activity[];
  week_summary: WeekSummary;
}

export interface UserSettings {
  max_hr: number;
  resting_hr_baseline: number;
  hrv_baseline: number;
  sleep_target_hours: number;
  disciplines_enabled: string[];
  weekly_volume_targets: Record<string, number>;
  override_garmin: boolean;
}

export type Discipline = 'hyrox' | 'strength' | 'run' | 'bike' | 'swim' | 'other';
export type IntensityZone = 'easy' | 'moderate' | 'hard' | 'max';
