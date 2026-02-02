# Training Optimizer V2 - Implementation Plan

> **TL;DR**: Complete implementation plan for 4 major V2 features: revised readiness algorithm with ACWR/sleep trends, Events & Training Phases management, Sport-Specific Readiness guidance, and Trends/Block Comparison analytics.

**Estimated Effort**: 5-6 weeks (Waves 0-5) + 1 week polish
**Parallel Execution**: YES - 70% of tasks can run in parallel within phases
**Critical Path**: Body Battery Fix → Database Migrations → Revised Readiness Algorithm → Events CRUD → Trends API

---

## Key Decisions (Confirmed)

| # | Decision | Details |
|---|----------|---------|
| 1 | **Body Battery** | Fix extraction for Garmin Enduro 3 (Wave 0 prerequisite) |
| 2 | **Historical Data** | Accept discontinuity - no backfill of V1 readiness scores |
| 3 | **Calendar Page** | Deferred to V3 |
| 4 | **ACWR Method** | EWMA with 28-day window and 7-day decay constant |
| 5 | **Weekly Metrics** | Monday-start weeks, daily aggregation at 00:05 UTC, 12-week backfill |
| 6 | **V1→V2 Transition** | Toggle switch to compare V1/V2 scores for 2 weeks post-deploy |

---

## Current State Analysis

### Existing Architecture
- **Backend**: FastAPI + Async SQLAlchemy + PostgreSQL
- **Frontend**: React + TypeScript + TanStack Query + Recharts
- **Database**: 4 tables (activities, daily_health, computed_metrics, user_settings)
- **Core Logic**: Readiness (HRV + Sleep + Body Battery + Fatigue), Fatigue (4 dimensions), ACWR calculation

### What is Missing for V2
- ACWR penalty in readiness score (calculated but not applied)
- Sleep trend analysis (single-day only)
- Event management system
- Sport-specific readiness guidance
- Trends/comparison analytics

---

## Execution Checklist

### Wave 0: Prerequisites (Day 1-2)
- [x] 0.1 Investigate body battery API - Check Garmin API response for Enduro 3
- [x] 0.2 Fix body battery extraction - Update `garmin_sync.py` to correctly extract morning reading
- [x] 0.3 Test body battery sync - Verify data appears in `daily_health` table

### Wave 1: Foundation (Week 1)
- [x] 1.1 Create events table migration
- [x] 1.2 Create training_phases table migration
- [x] 1.3 Create weekly_metrics table migration
- [x] 1.4 Extend computed_metrics (add algorithm_version, sport_specific, acwr_penalty, sleep_trend, event_modifier)
- [x] 1.5 Implement Event model
- [x] 1.6 Implement TrainingPhase and WeeklyMetrics models
- [x] 1.7 Run migrations

### Wave 2: Core Algorithms (Week 1-2)
- [x] 2.1 Implement EWMA helper function
- [x] 2.2 Implement ACWR with EWMA (28d window, 7d decay)
- [x] 2.3 Implement sleep trend component
- [x] 2.4 Implement event proximity modifier
- [x] 2.5 Update fatigue calculation (5-day window)
- [x] 2.6 Integrate into readiness_v2 + extend ComputedMetrics model
- [ ] 2.7 Implement V1 readiness (keep for comparison)
- [x] 2.8 Implement sport requirements config
- [x] 2.9 Implement evaluate_sport_readiness
- [ ] 2.10 Unit tests for algorithms

### Wave 3: Events and Phases (Week 2)
- [x] 3.1 Implement Events CRUD API
- [x] 3.2 Implement phase detection logic
- [x] 3.3 Implement phase auto-generation
- [x] 3.4 Add event queries to dashboard service
- [ ] 3.5 Unit tests for events/phases

### Wave 4: Trends (Week 3-4)
- [x] 4.1 Implement weekly aggregation service (Monday-start)
- [x] 4.2 Implement trends API endpoints
- [x] 4.3 Create weekly aggregation cron job (daily 00:05 UTC)
- [x] 4.4 Implement 12-week backfill on first run
- [ ] 4.5 Implement period comparison logic
- [ ] 4.6 Unit tests for trends

### Wave 5: Frontend (Week 3-5)
- [x] 5.1 Create EventList component
- [x] 5.2 Create EventForm component
- [x] 5.3 Create SportReadinessGrid
- [x] 5.4 Create PhaseIndicator
- [x] 5.5 Create Trends page with charts
- [ ] 5.6 Create V1/V2 ReadinessToggle component
- [x] 5.7 Enhance Dashboard with new components
- [ ] 5.8 Add feature flag for V1/V2 toggle (2-week expiry)
- [ ] 5.9 E2E tests

---

## 1. Architecture Overview

### Component Integration Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard (Enhanced)                                           │
│  ├── ReadinessCard (ACWR factor, Sleep Trend)                  │
│  ├── SportReadinessGrid (ready/caution/avoid)                  │
│  └── PhaseIndicator (current phase, weeks to event)            │
│                                                                 │
│  Events Page (NEW)                                              │
│  ├── EventList (with countdown, priority badges)               │
│  ├── EventForm (create/edit)                                   │
│  └── PhaseTimeline (auto-generated phases)                     │
│                                                                 │
│  Trends Page (NEW)                                              │
│  ├── TrendChart (multi-metric time series)                     │
│  ├── WeekComparisonTable (WoW metrics)                         │
│  ├── BlockComparison (training phases)                         │
│  └── VolumeByDisciplineChart (stacked bars)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ API Calls
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                      │
│  ├── /api/v1/dashboard (enhanced)                               │
│  ├── /api/v1/events (CRUD)                                      │
│  ├── /api/v1/phases/* (current phase, auto-generate)            │
│  └── /api/v1/trends/* (daily, weekly, comparison, blocks)       │
│                                                                 │
│  Core Services                                                  │
│  ├── readiness.py → readiness_v2.py (ACWR, Sleep Trend, Events) │
│  ├── sport_readiness.py (NEW - evaluate by sport)               │
│  ├── phases.py (NEW - phase detection, auto-generation)         │
│  └── trends.py (NEW - aggregation, comparison)                  │
│                                                                 │
│  Database Models                                                │
│  ├── Event (NEW)                                                │
│  ├── TrainingPhase (NEW)                                        │
│  └── WeeklyMetrics (NEW - materialized)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ SQL
┌─────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL                                │
├─────────────────────────────────────────────────────────────────┤
│  Existing: activities, daily_health, computed_metrics           │
│  New: events, training_phases, weekly_metrics                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Daily Metrics Computation** (existing cron/service)
   - Query activities (last 5 days for fatigue, last 28 for ACWR)
   - Query health data (today + 7-day averages)
   - Query events (next A/B priority event)
   - Calculate readiness_v2 (with ACWR penalty, sleep trend, event modifier)
   - Calculate sport-specific readiness
   - Store in computed_metrics (extended schema)

2. **Dashboard API**
   - Read from computed_metrics + activities
   - Return enhanced dashboard with sport_specific field

3. **Trends API**
   - Query activities + computed_metrics
   - Aggregate by week/block
   - Return time-series data

4. **Events API**
   - CRUD operations on events table
   - Auto-generate phases on event creation
   - Return events with phase context

---

## 2. Database Migration Plan

### Migration 1: Events Table

```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    distance VARCHAR(50),
    priority CHAR(1) DEFAULT 'B',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_priority ON events(priority) WHERE priority IN ('A', 'B');
```

**Python Model**:
```python
class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    event_date = Column(Date, nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    distance = Column(String(50), nullable=True)
    priority = Column(String(1), default="B")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### Migration 2: Training Phases Table

```sql
CREATE TABLE training_phases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phase_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_event_id INTEGER REFERENCES events(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_phases_dates ON training_phases(start_date, end_date);
CREATE INDEX idx_phases_event ON training_phases(target_event_id);
```

### Migration 3: Weekly Metrics Table

```sql
CREATE TABLE weekly_metrics (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL UNIQUE,  -- Always a Monday (ISO week)
    week_end DATE NOT NULL,            -- Always a Sunday
    total_volume_hours FLOAT,
    total_load FLOAT,
    volume_by_discipline JSONB,
    intensity_distribution JSONB,
    avg_readiness FLOAT,
    avg_hrv FLOAT,
    avg_sleep_hours FLOAT,
    avg_acwr FLOAT,
    activity_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_weekly_metrics_date ON weekly_metrics(week_start);
```

**Aggregation Schedule**:
- **Runs**: Daily at 00:05 UTC
- **Updates**: Current week + previous week (handles late syncs)
- **Initial backfill**: Last 12 weeks on first run
- **Week boundaries**: Monday 00:00 to Sunday 23:59 (ISO 8601)

### Migration 4: Extend Computed Metrics

```sql
ALTER TABLE computed_metrics 
    ADD COLUMN sport_specific JSONB,
    ADD COLUMN acwr_penalty FLOAT,
    ADD COLUMN sleep_trend FLOAT,
    ADD COLUMN event_modifier FLOAT;
```

---

## 3. Backend Implementation

### 3.0 Body Battery Extraction Fix (Wave 0)

**File**: backend/app/services/garmin_sync.py

**Problem**: Body battery data exists in Garmin Connect (Enduro 3 supports it) but `body_battery_morning` is always `None` in `daily_health`.

**Investigation needed**:
1. Check `get_body_battery()` API response structure
2. Verify correct field extraction for Enduro 3 device
3. Handle timezone issues (morning reading = local time)

**Fix**: Extract `bodyBatteryMorning` or earliest reading after wake time from body battery timeline.

---

### 3.1 Revised Readiness Algorithm

**File**: backend/app/core/readiness_v2.py

**New Components**:
1. ACWR Penalty (0-25 points based on injury risk zones, **using EWMA**)
2. Sleep Trend Component (±10 points for 3-day debt/surplus)
3. Event Proximity Modifier (±10 points for taper/protection)
4. Updated Fatigue (5-day window, 0-30 range)

**New Formula**:
```
V2 Readiness = BASE 70 + HRV(±15) + Sleep(±20) + SleepTrend(±10) + BodyBattery(±10) - Fatigue(0-30) - ACWR(0-25) + Trend(±5) + Event(±10)
```

**EWMA-based ACWR Calculation**:
```python
def ewma(loads: List[float], decay_days: int) -> float:
    """
    Exponentially weighted moving average.
    Uses full 28-day history with specified decay constant.

    Args:
        loads: Daily training loads (oldest to newest, 28 days)
        decay_days: Decay constant (7 for acute, 28 for chronic)
    """
    alpha = 2 / (decay_days + 1)
    ewma_value = loads[0] if loads else 0

    for load in loads[1:]:
        ewma_value = alpha * load + (1 - alpha) * ewma_value

    return ewma_value

def calculate_acwr_ewma(daily_loads: List[float]) -> float:
    """
    Calculate ACWR using EWMA method.
    Both acute and chronic use full 28-day history with different decay rates.
    """
    if len(daily_loads) < 7:
        return 1.0  # Default to optimal if insufficient data

    # Pad to 28 days if needed
    loads_28d = ([0] * (28 - len(daily_loads)) + daily_loads)[-28:]

    acute_load = ewma(loads_28d, decay_days=7)    # 7-day decay
    chronic_load = ewma(loads_28d, decay_days=28)  # 28-day decay

    if chronic_load < 1:  # Avoid division by zero
        return 1.0

    return acute_load / chronic_load
```

**Updated Thresholds**:
- high: score >= 80 (was 85)
- moderate: score >= 65 (was 70)
- low: score >= 50 (was 55)
- recovery: score >= 35 (was 40)
- rest: score < 35

### 3.2 Sport-Specific Readiness

**File**: backend/app/core/sport_readiness.py

**Configuration** (8 sports defined):
- easy_run, moderate_run, hard_run
- easy_bike
- hyrox_intervals
- strength_heavy, strength_light
- swim

Each sport has min_readiness threshold, fatigue_limits per dimension, acwr_max threshold.

### 3.3 Events and Phases API

**Routes**:
- GET/POST/PUT/DELETE /api/v1/events
- GET /api/v1/phases/current
- POST /api/v1/phases/generate

### 3.4 Trends API

**Routes**:
- GET /api/v1/trends/daily
- GET /api/v1/trends/weekly
- GET /api/v1/trends/comparison
- GET /api/v1/trends/blocks

---

## 4. Frontend Implementation

### 4.1 Dashboard Enhancements

**Components**:
- Enhanced ReadinessCard showing ACWR penalty factor
- SportReadinessGrid showing ready/caution/avoid for each sport
- PhaseIndicator showing current phase and countdown
- **V1/V2 Comparison Toggle** (2-week post-deploy transition feature)

**V1/V2 Transition UI**:
```tsx
// ReadinessCard with toggle (first 2 weeks after V2 deploy)
┌─────────────────────────────────────┐
│ Readiness Score        [V1 | V2*]  │  ← Toggle switch
│                                     │
│         45                          │
│        ────                         │
│      Recovery                       │
│                                     │
│  V1 would show: 62 (Moderate)      │  ← Comparison hint
│  [Why the difference?]              │  ← Expandable explanation
└─────────────────────────────────────┘
```

**Toggle behavior**:
- Default: V2 selected
- Shows V1 equivalent score when toggled
- "Why the difference?" links to changelog/explanation
- Auto-removed after 2 weeks (feature flag)

### 4.2 Events Page

**Components**:
- EventList with countdown badges
- EventForm for create/edit
- PhaseTimeline visualization

### 4.3 Trends Page

**Components**:
- TimeRangeSelector (7d/4w/12w/custom)
- MetricSelector (multi-select)
- TrendChart (multi-line/bar)
- WeekComparisonTable
- BlockComparison view

---

## 5. Parallel Task Breakdown

### Wave 0: Prerequisites (Day 1-2) - Sequential

| Task | Dependencies | Description |
|------|--------------|-------------|
| 0.1 Investigate body battery API | None | Check Garmin API response for Enduro 3 |
| 0.2 Fix body battery extraction | 0.1 | Update `garmin_sync.py` to correctly extract morning reading |
| 0.3 Test body battery sync | 0.2 | Verify data appears in `daily_health` table |

---

### Wave 1: Foundation (Week 1) - Can Parallelize 80%

| Task | Dependencies | Can Parallel With |
|------|--------------|-------------------|
| 1.1 Create events table migration | 0.3 | 1.2, 1.3 |
| 1.2 Create training_phases table | 0.3 | 1.1, 1.3 |
| 1.3 Create weekly_metrics table | 0.3 | 1.1, 1.2 |
| 1.4 Extend computed_metrics (add algorithm_version) | 1.1, 1.2, 1.3 | None |
| 1.5 Implement Event model | 1.1 | 1.6 |
| 1.6 Implement TrainingPhase model | 1.2 | 1.5 |
| 1.7 Run migrations | All above | None |

### Wave 2: Core Algorithms (Week 1-2) - Can Parallelize 70%

| Task | Dependencies | Can Parallel With |
|------|--------------|-------------------|
| 2.1 Implement EWMA helper function | None | 2.2, 2.3 |
| 2.2 Implement ACWR with EWMA (28d window, 7d decay) | 2.1 | 2.3 |
| 2.3 Implement sleep trend component | None | 2.1, 2.2 |
| 2.4 Implement event proximity modifier | 1.5 | 2.1-2.3 |
| 2.5 Update fatigue calculation (5-day window) | None | 2.1-2.4 |
| 2.6 Integrate into readiness_v2 | 2.2, 2.3, 2.4, 2.5 | None |
| 2.7 Implement V1 readiness (keep for comparison) | None | 2.1-2.6 |
| 2.8 Implement sport requirements config | None | 2.1-2.6 |
| 2.9 Implement evaluate_sport_readiness | 2.8 | 2.6 |
| 2.10 Unit tests for algorithms | 2.6, 2.9 | None |

### Wave 3: Events and Phases (Week 2) - Can Parallelize 60%

| Task | Dependencies | Can Parallel With |
|------|--------------|-------------------|
| 3.1 Implement Events CRUD API | 1.5, 1.7 | 3.2 |
| 3.2 Implement phase detection logic | 1.6, 1.7 | 3.1 |
| 3.3 Implement phase auto-generation | 3.2 | 3.1 |
| 3.4 Add event queries to dashboard service | 3.1 | None |
| 3.5 Unit tests for events/phases | 3.1-3.3 | None |

### Wave 4: Trends (Week 3-4) - Can Parallelize 50%

| Task | Dependencies | Can Parallel With |
|------|--------------|-------------------|
| 4.1 Implement weekly aggregation service (Monday-start) | 1.3, 1.7 | 4.2 |
| 4.2 Implement trends API endpoints | 1.7 | 4.1 |
| 4.3 Create weekly aggregation cron job (daily 00:05 UTC) | 4.1, 4.2 | None |
| 4.4 Implement 12-week backfill on first run | 4.1, 4.3 | None |
| 4.5 Implement period comparison logic | 4.1 | 4.4 |
| 4.6 Unit tests for trends | 4.1-4.5 | None |

### Wave 5: Frontend (Week 3-5) - Can Parallelize 70%

| Task | Dependencies | Can Parallel With |
|------|--------------|-------------------|
| 5.1 Create EventList component | 3.1 | 5.2, 5.3 |
| 5.2 Create EventForm component | 3.1 | 5.1, 5.3 |
| 5.3 Create SportReadinessGrid | 2.9 | 5.1, 5.2 |
| 5.4 Create PhaseIndicator | 3.2 | 5.1-5.3 |
| 5.5 Create Trends page with charts | 4.2 | 5.1-5.4 |
| 5.6 Create V1/V2 ReadinessToggle component | 2.6, 2.7 | 5.1-5.5 |
| 5.7 Enhance Dashboard with new components | All backend | None |
| 5.8 Add feature flag for V1/V2 toggle (2-week expiry) | 5.6, 5.7 | None |
| 5.9 E2E tests | All above | None |

---

## 6. Dependencies and Order

### Critical Path (Sequential)

```
Database Migrations (Wave 1)
    ↓
Core Algorithm Implementation (Wave 2)
    ↓
Events and Phases Backend (Wave 3)
    ↓
Trends Backend (Wave 4)
    ↓
Frontend Integration (Wave 5)
```

### Independent Workstreams

**Workstream A: Database + Core Logic**
- All of Wave 1
- Wave 2 (except 2.3)
- Can start immediately

**Workstream B: Events System**
- Wave 3
- Depends on: Wave 1 completion
- Can parallel with: Wave 2 (after 1.5 done)

**Workstream C: Trends System**
- Wave 4
- Depends on: Wave 1 completion
- Can parallel with: Waves 2-3

**Workstream D: Frontend**
- Wave 5
- Depends on: All backend waves
- Can start component scaffolding early

---

## 7. Testing Strategy

### 7.1 Algorithm Unit Tests

**Backend: backend/tests/test_readiness_v2.py**

Test cases:
- EWMA calculation with known values
- EWMA vs simple rolling comparison (verify smoother transitions)
- ACWR penalty at boundaries (0.79, 0.8, 1.3, 1.5, 2.0, 2.5)
- ACWR with sparse data (< 7 days, < 28 days)
- Sleep trend with deficit and surplus
- Event proximity for A/B races
- V1 vs V2 readiness comparison (same inputs, different outputs)
- Integration: full readiness_v2 calculation

### 7.2 API Integration Tests

**Backend: backend/tests/test_api_*.py**

Test cases:
- Events CRUD operations
- Phase detection with various event dates
- Trends aggregation accuracy
- Dashboard response schema

### 7.3 Frontend Component Tests

**Frontend: frontend/src/**/*.test.tsx**

Test cases:
- SportReadinessGrid renders correctly
- EventForm validation
- TrendChart data transformation
- Dashboard integration with new APIs

### 7.4 E2E Tests

**Scripts: e2e/tests/***

Test scenarios:
- Create event → see phase update → check readiness
- Log activities → see ACWR penalty in dashboard
- View trends page → verify week-over-week comparison

---

## 8. Estimated Effort

### Wave 0: Prerequisites (Days 1-2) - 1.5 dev-days
- Investigate body battery API: 0.5 days
- Fix extraction and test: 1 day

### Wave 1: Foundation (Week 1) - 3 dev-days
- Database migrations: 0.5 days
- Models implementation: 1 day
- Migration testing: 0.5 days
- Setup and configuration: 1 day

### Wave 2: Core Algorithms (Week 1-2) - 5 dev-days
- EWMA implementation: 0.5 days
- ACWR with EWMA: 1 day
- Sleep trend/event proximity: 1 day
- V1 readiness preservation: 0.5 days
- Sport-specific readiness: 1 day
- Testing and tuning: 1 day

### Wave 3: Events and Phases (Week 2) - 3 dev-days
- Events CRUD API: 1 day
- Phase detection/generation: 1 day
- Testing: 1 day

### Wave 4: Trends (Week 3-4) - 5.5 dev-days
- Weekly aggregation (Monday-start): 1.5 days
- Trends API: 1.5 days
- Cron job + 12-week backfill: 1 day
- Comparison logic: 1 day
- Testing: 0.5 days

### Wave 5: Frontend (Week 3-5) - 7 dev-days
- Components (Events, SportReadiness, Trends): 3 days
- V1/V2 toggle component: 1 day
- Dashboard enhancements: 1 day
- Integration and testing: 2 days

### Wave 6: Polish and Optimization (Week 5-6) - 3 dev-days
- Performance tuning
- Bug fixes
- Documentation
- UI/UX refinement

**Total: ~28 dev-days (approximately 5-6 weeks for 1 developer)**

---

## 9. Key Implementation Details

### Reference Research

This implementation plan incorporates research from:
- **OpenAthlete**: Database schema patterns for events and phases
- **Athlytics R Package**: ACWR calculation with EWMA method
- **Current Training Optimizer**: Existing patterns and conventions

### Critical Decisions

1. **JSONB for flexible metrics**: Using JSONB columns (volume_by_discipline, sport_specific) allows schema evolution without migrations

2. **Materialized weekly_metrics**: Pre-computed weekly aggregations for fast trend queries

3. **Phase auto-generation templates**: Sport-specific templates (hyrox, triathlon, marathon) with configurable week ranges

4. **EWMA for ACWR**: 28-day window with 7-day decay constant for smoother, research-backed load tracking

5. **ACWR penalty curve**: Non-linear penalty that ramps up significantly above 1.5 (danger zone)

6. **8 sport types**: Covers the main use cases while keeping configuration manageable

7. **Monday-start weeks**: ISO 8601 standard, aligns with European training conventions

8. **V1/V2 toggle**: 2-week transition period with feature flag auto-expiry

### Deferred to V3

- **Calendar Page**: Combined activities + events + readiness heatmap view
- **TrainingPeaks Integration**: Import planned workouts
- **Adaptive Suggestions**: Auto-adjust plan when sessions are missed

### Risk Mitigation

1. **Algorithm validation**: Extensive unit tests with known edge cases
2. **Rollback plan**: All migrations are reversible
3. **Feature flags**: Can disable V2 features if issues arise
4. **Gradual rollout**: Deploy backend first, then frontend components incrementally

---

## 10. Next Steps

**Plan Status**: ✅ Reviewed and approved

1. ~~Review this plan~~ ✅ Completed
2. ~~Prioritize features~~ ✅ Waves 0-5 defined with dependencies
3. **Start Wave 0** - Fix body battery extraction (Garmin Enduro 3)
4. **Parallel: Start Wave 1** - Database migrations can begin once 0.1 investigation is done
5. **Create detailed tickets** - Break each task into actionable tickets if needed

**Implementation Order**:
```
Wave 0 (Days 1-2): Body battery fix
    ↓
Wave 1 (Week 1): Database migrations + models
    ↓
Wave 2 (Week 1-2): EWMA, readiness_v2, sport readiness [parallel with Wave 3]
Wave 3 (Week 2): Events CRUD, phases [parallel with Wave 2]
    ↓
Wave 4 (Week 3-4): Trends API, weekly aggregation
    ↓
Wave 5 (Week 3-5): Frontend components, V1/V2 toggle
    ↓
Wave 6 (Week 5-6): Polish
```

**Ready to start implementation?**
