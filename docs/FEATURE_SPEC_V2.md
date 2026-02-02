# Training Optimizer V2 - Feature Specification

## Overview

This document specifies the next iteration of features for the Training Optimizer app, focused on:
1. **Improved Readiness Algorithm** - Incorporating ACWR, sleep trends, and accumulated fatigue
2. **Events & Training Phases** - Race calendar and automatic phase generation
3. **Sport-Specific Readiness** - Different readiness scores per activity type
4. **Trends & Block Comparison** - Time-series analysis across multiple timeframes

---

## 1. Revised Readiness Algorithm

### Current Problems
- ACWR is calculated but **not used** in readiness score
- Sleep only considers last night, not trends
- Recent training fatigue only looks back 3 days
- No consideration of upcoming events

### New Algorithm Design

```
BASE_SCORE = 70

Readiness = BASE_SCORE
          + HRV Component (±15)
          + Sleep Component (±20)
          + Sleep Trend Component (±10) [NEW]
          + Body Battery Component (±10)
          - Recent Training Fatigue (0-30)
          - ACWR Penalty (0-25) [NEW]
          + Trend Adjustment (±5)
          + Event Proximity Modifier (±10) [NEW]
```

### 1.1 ACWR Component (NEW)

The Acute:Chronic Workload Ratio is a key injury predictor that must influence readiness.

```python
def calculate_acwr_penalty(acwr: float) -> float:
    """
    ACWR Zones (based on sports science research):
    - < 0.8: Undertrained (minor penalty - you're deconditioned)
    - 0.8 - 1.3: Sweet spot (no penalty)
    - 1.3 - 1.5: Caution zone (moderate penalty)
    - 1.5 - 2.0: Danger zone (significant penalty)
    - > 2.0: High risk (major penalty)
    """
    if acwr < 0.8:
        # Undertrained - small penalty to encourage activity
        return 5
    elif acwr <= 1.3:
        # Optimal zone - no penalty
        return 0
    elif acwr <= 1.5:
        # Caution - linear increase from 0 to 10
        return (acwr - 1.3) / 0.2 * 10
    elif acwr <= 2.0:
        # Danger - linear increase from 10 to 20
        return 10 + (acwr - 1.5) / 0.5 * 10
    else:
        # High risk - cap at 25
        return min(25, 20 + (acwr - 2.0) * 5)
```

**Factor Display:**
```json
{
  "name": "ACWR",
  "value": "-15",
  "detail": "2.39 ratio (danger zone: >1.5)",
  "status": "negative"
}
```

### 1.2 Sleep Trend Component (NEW)

Single night sleep is noisy. A 3-day trend is more meaningful.

```python
def calculate_sleep_trend_component(
    sleep_hours_3_days: List[float],  # [2 days ago, yesterday, today]
    sleep_target: float = 7.5
) -> float:
    """
    Evaluates sleep debt/surplus over 3 days.
    """
    if len(sleep_hours_3_days) < 3:
        return 0

    total_sleep = sum(sleep_hours_3_days)
    total_target = sleep_target * 3
    sleep_debt = total_sleep - total_target

    # -3h debt = -10 points, +3h surplus = +10 points
    return clamp(sleep_debt / 3 * 10, -10, 10)
```

**Factor Display:**
```json
{
  "name": "Sleep Trend",
  "value": "-6",
  "detail": "1.8h deficit over 3 days",
  "status": "negative"
}
```

### 1.3 Updated Recent Training Fatigue

Extend lookback from 3 to 5 days with adjusted decay.

```python
# Changes to calculate_recent_training_fatigue():
# - lookback_days: 3 -> 5
# - max_penalty: 40 -> 30 (reduced since ACWR now handles load)
# - Decay rates adjusted for longer window

INTENSITY_IMPACT = {"easy": 3, "moderate": 10, "hard": 20, "max": 30}  # Reduced from 5/15/30/45

def calculate_recent_training_fatigue(
    activities: List[Dict],
    today: datetime,
    lookback_days: int = 5  # Extended from 3
) -> float:
    # ... same logic but with 5-day window and reduced impacts
    return clamp(total_fatigue, 0, 30)  # Reduced from 40
```

### 1.4 Event Proximity Modifier (NEW)

Approaching a race? Readiness interpretation changes.

```python
def calculate_event_proximity_modifier(
    days_to_event: Optional[int],
    event_priority: str  # "A" (key race), "B" (important), "C" (training race)
) -> float:
    """
    Near an A-race, we want conservative readiness (protect the athlete).
    """
    if days_to_event is None:
        return 0

    if event_priority == "A":
        if days_to_event <= 3:
            return 10  # Taper boost - you should feel ready
        elif days_to_event <= 7:
            return 5   # Light taper period
        elif days_to_event <= 14:
            return -5  # Protect from overreaching
    elif event_priority == "B":
        if days_to_event <= 3:
            return 5

    return 0
```

### 1.5 Complete New Readiness Function

```python
def calculate_readiness_v2(
    # Existing params
    hrv_today: Optional[float],
    hrv_7day_avg: Optional[float],
    sleep_hours: Optional[float],
    sleep_target: float,
    sleep_score: Optional[int],
    body_battery_morning: Optional[int],
    recent_activities: List[Dict[str, Any]],
    avg_readiness_3_days: float,
    today: datetime,
    # New params
    acwr: float,
    sleep_hours_3_days: List[float],
    days_to_next_event: Optional[int] = None,
    next_event_priority: str = "C",
) -> Dict[str, Any]:
    score = BASE_SCORE  # 70
    factors = []

    # HRV Component (±15) - unchanged
    if hrv_today and hrv_7day_avg:
        hrv_component = calculate_hrv_component(hrv_today, hrv_7day_avg)
        score += hrv_component
        factors.append(...)

    # Sleep Component (±20) - unchanged
    if sleep_hours:
        sleep_component = calculate_sleep_component(sleep_hours, sleep_target, sleep_score)
        score += sleep_component
        factors.append(...)

    # Sleep Trend Component (±10) - NEW
    sleep_trend = calculate_sleep_trend_component(sleep_hours_3_days, sleep_target)
    if sleep_trend != 0:
        score += sleep_trend
        factors.append({
            "name": "Sleep Trend",
            "value": f"{sleep_trend:+.0f}",
            "detail": f"{sum(sleep_hours_3_days) - sleep_target*3:.1f}h vs target over 3 days",
            "status": "positive" if sleep_trend > 0 else "negative"
        })

    # Body Battery (±10) - unchanged
    if body_battery_morning:
        bb_component = calculate_body_battery_component(body_battery_morning)
        score += bb_component
        factors.append(...)

    # Recent Training Fatigue (0-30) - updated window
    recent_fatigue = calculate_recent_training_fatigue(recent_activities, today)
    if recent_fatigue > 0:
        score -= recent_fatigue
        factors.append(...)

    # ACWR Penalty (0-25) - NEW
    acwr_penalty = calculate_acwr_penalty(acwr)
    if acwr_penalty > 0:
        score -= acwr_penalty
        acwr_status = get_acwr_status(acwr)
        factors.append({
            "name": "ACWR",
            "value": f"-{acwr_penalty:.0f}",
            "detail": f"{acwr:.2f} ratio ({acwr_status})",
            "status": "negative" if acwr_penalty > 5 else "warning"
        })

    # Trend Adjustment (±5) - unchanged
    trend_adj = calculate_trend_adjustment(avg_readiness_3_days)
    score += trend_adj

    # Event Proximity (±10) - NEW
    event_modifier = calculate_event_proximity_modifier(days_to_next_event, next_event_priority)
    if event_modifier != 0:
        score += event_modifier
        factors.append({
            "name": "Event Proximity",
            "value": f"{event_modifier:+.0f}",
            "detail": f"{days_to_next_event} days to {next_event_priority}-race",
            "status": "positive" if event_modifier > 0 else "warning"
        })

    score = int(clamp(score, 0, 100))
    return {"score": score, "category": get_readiness_category(score), "factors": factors}
```

### 1.6 Readiness Categories (Updated Thresholds)

```python
def get_readiness_category(score: int) -> str:
    if score >= 80:
        return "high"       # Green - ready for any intensity
    elif score >= 65:
        return "moderate"   # Yellow-green - moderate intensity OK
    elif score >= 50:
        return "low"        # Yellow - easy training only
    elif score >= 35:
        return "recovery"   # Orange - active recovery only
    else:
        return "rest"       # Red - rest day recommended
```

---

## 2. Events & Training Phases

### 2.1 Data Model: Events

```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,  -- 'hyrox', 'triathlon', 'marathon', 'other'
    distance VARCHAR(50),              -- 'half', 'full', 'sprint', etc.
    priority CHAR(1) DEFAULT 'B',      -- 'A', 'B', 'C'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_events_date ON events(event_date);
```

```python
# backend/app/models/event.py
class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    event_date: Mapped[date]
    event_type: Mapped[str] = mapped_column(String(50))  # hyrox, triathlon, marathon, other
    distance: Mapped[Optional[str]] = mapped_column(String(50))
    priority: Mapped[str] = mapped_column(String(1), default="B")  # A, B, C
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
```

### 2.2 Training Phases (Auto-Generated)

Based on event dates, automatically generate training phases.

```python
# backend/app/core/phases.py

PHASE_TEMPLATES = {
    "hyrox": {
        # Weeks before event -> phase
        "taper": (0, 1),      # 0-1 weeks out
        "peak": (1, 3),       # 1-3 weeks out
        "build": (3, 8),      # 3-8 weeks out
        "base": (8, None),    # 8+ weeks out
    },
    "triathlon_half": {
        "taper": (0, 2),
        "peak": (2, 4),
        "build": (4, 10),
        "base": (10, None),
    },
}

def get_current_phase(events: List[Event], today: date) -> Optional[Dict]:
    """
    Determine current training phase based on upcoming A/B events.
    """
    # Find next A or B priority event
    upcoming = [e for e in events if e.event_date > today and e.priority in ("A", "B")]
    if not upcoming:
        return {"phase": "base", "event": None, "weeks_out": None}

    next_event = min(upcoming, key=lambda e: e.event_date)
    weeks_out = (next_event.event_date - today).days / 7

    template = PHASE_TEMPLATES.get(next_event.event_type, PHASE_TEMPLATES["hyrox"])

    for phase_name, (min_weeks, max_weeks) in template.items():
        if max_weeks is None:
            if weeks_out >= min_weeks:
                return {"phase": phase_name, "event": next_event, "weeks_out": weeks_out}
        elif min_weeks <= weeks_out < max_weeks:
            return {"phase": phase_name, "event": next_event, "weeks_out": weeks_out}

    return {"phase": "base", "event": next_event, "weeks_out": weeks_out}
```

### 2.3 API Endpoints

```python
# backend/app/api/v1/events.py

@router.get("/events")
async def list_events(
    upcoming_only: bool = False,
    db: AsyncSession = Depends(get_db)
) -> List[EventSchema]:
    """List all events, optionally filtering to upcoming only."""
    pass

@router.post("/events")
async def create_event(
    event: EventCreate,
    db: AsyncSession = Depends(get_db)
) -> EventSchema:
    """Create a new event."""
    pass

@router.put("/events/{event_id}")
async def update_event(
    event_id: int,
    event: EventUpdate,
    db: AsyncSession = Depends(get_db)
) -> EventSchema:
    """Update an existing event."""
    pass

@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete an event."""
    pass

@router.get("/phases/current")
async def get_current_phase(
    db: AsyncSession = Depends(get_db)
) -> PhaseSchema:
    """Get the current training phase based on upcoming events."""
    pass
```

### 2.4 Frontend: Events Management

Add to Settings page or create dedicated Events page:

```tsx
// frontend/src/pages/Events.tsx

interface Event {
  id: number;
  name: string;
  event_date: string;
  event_type: 'hyrox' | 'triathlon' | 'marathon' | 'other';
  distance?: string;
  priority: 'A' | 'B' | 'C';
  notes?: string;
}

// Components needed:
// - EventList: Shows upcoming events with countdown
// - EventForm: Add/edit event modal
// - EventCard: Individual event display with priority badge
// - PhaseIndicator: Shows current phase and weeks to event
```

**UI Mockup:**
```
┌─────────────────────────────────────────────────────┐
│ Events                                    [+ Add]   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🏆 Hyrox Paris          A-Race    Mar 15, 2026  │ │
│ │    6 weeks out • BUILD phase                    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🏊 Half Ironman Nice    A-Race    Jun 28, 2026  │ │
│ │    21 weeks out • BASE phase                    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🏃 Hyrox Marseille      B-Race    May 10, 2026  │ │
│ │    14 weeks out                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 3. Sport-Specific Readiness

### 3.1 Concept

Instead of one readiness score, provide context-aware guidance:

```
Overall Readiness: 62 (Moderate)

Ready for:
✅ Easy Z2 Bike (lower body: OK, cardio: OK)
✅ Swimming (upper body: fresh)
⚠️ Moderate Run (lower body: elevated fatigue)
❌ Hyrox Intervals (ACWR too high, CNS fatigued)
❌ Heavy Strength (CNS needs recovery)
```

### 3.2 Implementation

```python
# backend/app/core/sport_readiness.py

SPORT_REQUIREMENTS = {
    "easy_run": {
        "min_readiness": 40,
        "fatigue_limits": {"lower": 0.8, "cardio": 0.8},
        "acwr_max": 2.5,
    },
    "moderate_run": {
        "min_readiness": 55,
        "fatigue_limits": {"lower": 0.6, "cardio": 0.7},
        "acwr_max": 1.8,
    },
    "hard_run": {
        "min_readiness": 70,
        "fatigue_limits": {"lower": 0.5, "cardio": 0.5, "cns": 0.6},
        "acwr_max": 1.5,
    },
    "easy_bike": {
        "min_readiness": 35,
        "fatigue_limits": {"lower": 0.85, "cardio": 0.85},
        "acwr_max": 2.5,
    },
    "hyrox_intervals": {
        "min_readiness": 75,
        "fatigue_limits": {"lower": 0.4, "upper": 0.5, "cardio": 0.5, "cns": 0.5},
        "acwr_max": 1.4,
    },
    "strength_heavy": {
        "min_readiness": 65,
        "fatigue_limits": {"upper": 0.5, "lower": 0.5, "cns": 0.4},
        "acwr_max": 1.6,
    },
    "strength_light": {
        "min_readiness": 45,
        "fatigue_limits": {"upper": 0.7, "lower": 0.7, "cns": 0.6},
        "acwr_max": 2.0,
    },
    "swim": {
        "min_readiness": 40,
        "fatigue_limits": {"upper": 0.7, "cardio": 0.75},
        "acwr_max": 2.0,
    },
}

def evaluate_sport_readiness(
    readiness_score: int,
    fatigue: Dict[str, float],
    acwr: float
) -> Dict[str, Dict]:
    """
    Evaluate readiness for each sport/intensity combination.
    """
    results = {}

    for sport, requirements in SPORT_REQUIREMENTS.items():
        status = "ready"
        blockers = []

        # Check overall readiness
        if readiness_score < requirements["min_readiness"]:
            status = "not_ready"
            blockers.append(f"Readiness {readiness_score} < {requirements['min_readiness']}")

        # Check fatigue limits
        for dimension, limit in requirements["fatigue_limits"].items():
            if fatigue.get(dimension, 0) > limit:
                status = "not_ready" if status != "not_ready" else status
                if fatigue[dimension] > limit + 0.1:
                    status = "not_ready"
                else:
                    status = "caution" if status == "ready" else status
                blockers.append(f"{dimension} fatigue {fatigue[dimension]:.0%} > {limit:.0%}")

        # Check ACWR
        if acwr > requirements["acwr_max"]:
            status = "not_ready" if acwr > requirements["acwr_max"] + 0.3 else "caution"
            blockers.append(f"ACWR {acwr:.2f} > {requirements['acwr_max']}")

        results[sport] = {
            "status": status,  # "ready", "caution", "not_ready"
            "blockers": blockers,
        }

    return results
```

### 3.3 API Response Enhancement

```python
# Add to dashboard response
{
    "readiness": {
        "score": 62,
        "category": "moderate",
        "factors": [...],
        "sport_specific": {
            "easy_run": {"status": "ready", "blockers": []},
            "moderate_run": {"status": "caution", "blockers": ["lower fatigue 65% > 60%"]},
            "hard_run": {"status": "not_ready", "blockers": ["Readiness 62 < 70", "ACWR 2.39 > 1.5"]},
            "easy_bike": {"status": "ready", "blockers": []},
            "hyrox_intervals": {"status": "not_ready", "blockers": ["Readiness 62 < 75", "ACWR 2.39 > 1.4"]},
            "strength_heavy": {"status": "not_ready", "blockers": ["ACWR 2.39 > 1.6"]},
            "strength_light": {"status": "ready", "blockers": []},
            "swim": {"status": "ready", "blockers": []}
        }
    }
}
```

### 3.4 Frontend Display

```tsx
// Component: SportReadinessGrid
// Shows what you CAN do today, not just the overall score

interface SportReadiness {
  status: 'ready' | 'caution' | 'not_ready';
  blockers: string[];
}

const SportReadinessGrid = ({ sportReadiness }: Props) => {
  const categories = {
    "Ready": Object.entries(sportReadiness).filter(([_, v]) => v.status === 'ready'),
    "Possible": Object.entries(sportReadiness).filter(([_, v]) => v.status === 'caution'),
    "Avoid": Object.entries(sportReadiness).filter(([_, v]) => v.status === 'not_ready'),
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {Object.entries(categories).map(([category, sports]) => (
        <div key={category}>
          <h4>{category}</h4>
          {sports.map(([sport, data]) => (
            <SportChip key={sport} sport={sport} status={data.status} />
          ))}
        </div>
      ))}
    </div>
  );
};
```

---

## 4. Trends & Block Comparison

### 4.1 Data Requirements

The Trends page needs aggregated data at multiple granularities:
- **Daily**: Individual data points
- **Weekly**: 7-day aggregations
- **Monthly**: ~4-week aggregations
- **Block**: User-defined training phases

### 4.2 API Endpoints

```python
# backend/app/api/v1/trends.py

@router.get("/trends/daily")
async def get_daily_trends(
    start_date: date,
    end_date: date,
    metrics: List[str] = Query(default=["readiness", "training_load", "hrv", "sleep"]),
    db: AsyncSession = Depends(get_db)
) -> DailyTrendsResponse:
    """
    Get daily metric values for charting.
    Returns: {date: {metric: value}}
    """
    pass

@router.get("/trends/weekly")
async def get_weekly_trends(
    weeks: int = 12,  # Last N weeks
    metrics: List[str] = Query(default=["volume", "load", "intensity_distribution"]),
    db: AsyncSession = Depends(get_db)
) -> WeeklyTrendsResponse:
    """
    Get weekly aggregated metrics.
    Returns: {week_start: {total_volume, total_load, by_discipline, intensity_pct}}
    """
    pass

@router.get("/trends/comparison")
async def compare_periods(
    period1_start: date,
    period1_end: date,
    period2_start: date,
    period2_end: date,
    db: AsyncSession = Depends(get_db)
) -> PeriodComparisonResponse:
    """
    Compare two arbitrary periods.
    Returns: {period1: metrics, period2: metrics, delta: metrics}
    """
    pass

@router.get("/trends/blocks")
async def get_block_comparison(
    db: AsyncSession = Depends(get_db)
) -> BlockComparisonResponse:
    """
    Compare metrics across training phases/blocks.
    Returns: {phase: {avg_volume, avg_load, avg_readiness, ...}}
    """
    pass
```

### 4.3 Metrics to Track

```python
TREND_METRICS = {
    # Daily metrics
    "readiness_score": "Readiness Score (0-100)",
    "training_load": "Daily Training Load",
    "hrv": "Heart Rate Variability",
    "resting_hr": "Resting Heart Rate",
    "sleep_hours": "Sleep Duration",
    "sleep_score": "Sleep Score",

    # Weekly aggregations
    "weekly_volume": "Total Training Hours",
    "weekly_load": "Total Training Load",
    "volume_by_discipline": "Hours by Discipline",
    "intensity_distribution": "Intensity Zone %",
    "acute_load": "Acute Load (7d)",
    "chronic_load": "Chronic Load (28d)",
    "acwr": "ACWR",

    # Derived metrics
    "avg_readiness": "Average Readiness",
    "training_consistency": "% of Planned Days Trained",
}
```

### 4.4 Frontend: Trends Page

```tsx
// frontend/src/pages/Trends.tsx

const Trends = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '4w' | '12w' | 'custom'>('4w');
  const [selectedMetrics, setSelectedMetrics] = useState(['readiness', 'training_load']);

  return (
    <div>
      {/* Time range selector */}
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />

      {/* Main chart area */}
      <TrendChart
        metrics={selectedMetrics}
        timeRange={timeRange}
      />

      {/* Week over week comparison */}
      <WeekComparison />

      {/* Block/Phase comparison */}
      <BlockComparison />

      {/* Metric selector */}
      <MetricSelector
        selected={selectedMetrics}
        onChange={setSelectedMetrics}
      />
    </div>
  );
};
```

### 4.5 Chart Specifications

**Main Trend Chart (Multi-axis)**
```
┌────────────────────────────────────────────────────────────┐
│ [7D] [4W] [12W] [Custom]                    Metrics: [▼]   │
├────────────────────────────────────────────────────────────┤
│ 100 ─┤                                                      │
│      │    ╭─╮       ╭───╮                                  │
│  75 ─┤   ╱   ╲     ╱     ╲    ╭──╮                        │ Readiness
│      │  ╱     ╲───╱       ╲──╱    ╲                       │
│  50 ─┤─╱                          ╲───                    │
│      │                                                      │
│  25 ─┤  ▃▃  ▃▃▃  ▃▃  ▃▃▃▃▃  ▃▃  ▃▃  ▃▃▃  ▃▃              │ Load (bars)
│      ├──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──           │
│      Jan 6   Jan 13   Jan 20   Jan 27   Feb 3             │
└────────────────────────────────────────────────────────────┘
```

**Week Comparison Table**
```
┌──────────────────────────────────────────────────────────┐
│ Week Comparison                                          │
├────────────┬───────────┬───────────┬───────────┬────────┤
│ Metric     │ This Week │ Last Week │ 4 Wks Ago │ Trend  │
├────────────┼───────────┼───────────┼───────────┼────────┤
│ Volume     │ 11.7h     │ 9.2h      │ 8.5h      │ ↑ 27%  │
│ Load       │ 485       │ 320       │ 290       │ ↑ 52%  │
│ Avg Ready  │ 58        │ 72        │ 68        │ ↓ 19%  │
│ ACWR       │ 2.39      │ 1.45      │ 1.12      │ ⚠️     │
└────────────┴───────────┴───────────┴───────────┴────────┘
```

**Block Comparison (Training Phases)**
```
┌──────────────────────────────────────────────────────────┐
│ Training Blocks                                          │
├────────────┬───────────┬───────────┬───────────┬────────┤
│ Phase      │ Duration  │ Avg Vol/wk│ Avg Load  │ Ready  │
├────────────┼───────────┼───────────┼───────────┼────────┤
│ Base       │ 6 weeks   │ 8.2h      │ 245       │ 71     │
│ Build      │ 4 weeks   │ 11.5h     │ 385       │ 62     │
│ Peak       │ Current   │ 12.8h     │ 420       │ 58     │
└────────────┴───────────┴───────────┴───────────┴────────┘
```

### 4.6 Volume by Discipline Chart

```
┌────────────────────────────────────────────────────────────┐
│ Weekly Volume by Discipline                                │
├────────────────────────────────────────────────────────────┤
│ 15h ─┤                                                      │
│      │                              ████                    │
│ 12h ─┤                        ████  ████                   │
│      │                  ████  ████  ████  ▓▓▓▓            │
│  9h ─┤            ████  ████  ████  ████  ▓▓▓▓            │
│      │      ████  ████  ████  ░░░░  ░░░░  ░░░░            │
│  6h ─┤████  ████  ░░░░  ░░░░  ░░░░  ░░░░  ░░░░            │
│      │░░░░  ░░░░  ░░░░  ▒▒▒▒  ▒▒▒▒  ▒▒▒▒  ▒▒▒▒            │
│  3h ─┤▒▒▒▒  ▒▒▒▒  ▒▒▒▒  ▒▒▒▒  ▒▒▒▒  ▒▒▒▒  ▒▒▒▒            │
│      ├──────────────────────────────────────────           │
│      W1    W2    W3    W4    W5    W6    W7               │
│                                                            │
│      ░░ Run  ▒▒ Bike  ██ Strength  ▓▓ Other               │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Database Migrations

### 5.1 New Tables

```sql
-- Events table
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

-- Training phases (can be auto-generated or manual)
CREATE TABLE training_phases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phase_type VARCHAR(50) NOT NULL,  -- base, build, peak, taper, recovery
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_event_id INTEGER REFERENCES events(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly aggregations (materialized for performance)
CREATE TABLE weekly_metrics (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL UNIQUE,
    total_volume_hours FLOAT,
    total_load FLOAT,
    volume_by_discipline JSONB,
    intensity_distribution JSONB,
    avg_readiness FLOAT,
    avg_hrv FLOAT,
    avg_sleep_hours FLOAT,
    activity_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Alembic Migration

```python
# backend/alembic/versions/xxx_add_events_and_phases.py

def upgrade():
    op.create_table(
        'events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('event_date', sa.Date(), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('distance', sa.String(50), nullable=True),
        sa.Column('priority', sa.String(1), server_default='B'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_events_date', 'events', ['event_date'])

    # ... similar for training_phases and weekly_metrics
```

---

## 6. Implementation Priority

### Phase 1: Core Algorithm Fixes (Week 1)
1. ✅ Add ACWR to readiness calculation
2. ✅ Add sleep trend component
3. ✅ Extend fatigue lookback window
4. ✅ Update dashboard to show ACWR factor

### Phase 2: Events & Phases (Week 2)
1. Create events table and model
2. Build events CRUD API
3. Create events UI (list + form)
4. Implement phase auto-generation
5. Add event proximity to readiness

### Phase 3: Sport-Specific Readiness (Week 3)
1. Implement sport requirements config
2. Add sport readiness evaluation
3. Extend dashboard API response
4. Build sport readiness UI component

### Phase 4: Trends Page (Week 4)
1. Build trends API endpoints
2. Create weekly aggregation job
3. Build main trend chart component
4. Add week comparison table
5. Add block comparison view

### Phase 5: Polish & Refinement (Week 5+)
1. Tune algorithm weights based on feedback
2. Add more chart types
3. Implement period comparison
4. Add export/sharing features

---

## 7. Testing Strategy

### Algorithm Tests
```python
def test_acwr_penalty_optimal_zone():
    assert calculate_acwr_penalty(1.0) == 0
    assert calculate_acwr_penalty(1.3) == 0

def test_acwr_penalty_danger_zone():
    penalty = calculate_acwr_penalty(2.0)
    assert penalty >= 15  # Significant penalty

def test_acwr_penalty_extreme():
    penalty = calculate_acwr_penalty(2.5)
    assert penalty == 25  # Capped at max

def test_sleep_trend_debt():
    # 3 nights of 5h when target is 7.5h = 7.5h deficit
    trend = calculate_sleep_trend_component([5, 5, 5], 7.5)
    assert trend < 0

def test_sport_readiness_blocks_high_intensity():
    result = evaluate_sport_readiness(
        readiness_score=62,
        fatigue={"lower": 0.3, "upper": 0.2, "cardio": 0.4, "cns": 0.5},
        acwr=2.39
    )
    assert result["hyrox_intervals"]["status"] == "not_ready"
    assert result["easy_bike"]["status"] == "ready"
```

---

## Summary

This spec addresses your core needs:

| Need | Solution |
|------|----------|
| ACWR not affecting readiness | New ACWR penalty component (0-25 points) |
| Sleep too reactive | Added 3-day sleep trend component |
| Readiness too aggressive | Lowered thresholds, added more penalty sources |
| Event tracking | New Events table with CRUD and auto-phases |
| Sport-specific guidance | Sport requirements matrix with fatigue/ACWR limits |
| Trends & comparison | Multi-timeframe charts with block comparison |

Ready to start implementation?
