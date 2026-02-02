# Fix Sleep Data Retrieval from Garmin

## TL;DR

> **Quick Summary**: Fix incorrect field name in Garmin sleep data parsing. The code looks for `sleepTimeInSeconds` but Garmin API returns `sleepTimeSeconds` (no "In"), causing sleep duration to always be 0.
>
> **Deliverables**:
> - Fixed sleep duration parsing
> - Verified sleep score field access
> - Debug logging for future troubleshooting
>
> **Estimated Effort**: Quick (< 30 min)
> **Parallel Execution**: NO - sequential
> **Critical Path**: Fix field name → Test sync → Verify fix

---

## Context

### Original Request
User reported that the dashboard shows "-20" sleep score with "0.0h vs 7.5h target" even though they slept 6h27m. Investigation revealed the sleep data is not being retrieved correctly from Garmin Connect.

### Root Cause Analysis
**The Bug:** In `backend/app/services/garmin_sync.py` line 274, the code references `sleepTimeInSeconds`:
```python
"sleep_duration_hours": (sleep_dto.get("sleepTimeInSeconds", 0) or 0) / 3600
```

**The Reality:** Garmin's API returns the field as `sleepTimeSeconds` (without "In") according to:
- Official python-garminconnect library source code
- Multiple working implementations on GitHub
- API documentation

**Impact:** When sleep data is fetched, `sleep_dto.get("sleepTimeInSeconds", 0)` returns 0 (default value) because the key doesn't exist. This causes:
1. Sleep duration to always be 0 hours
2. Sleep component in readiness calculation to be -20 (minimum penalty)
3. Overall readiness score to be significantly lower than it should be

### Research Findings
From python-garminconnect library and community usage:
- Field name: `sleepTimeSeconds` (not `sleepTimeInSeconds`)
- Sleep scores structure: `sleepScores.overall.value` (may need nested access)
- Related fields confirmed correct: `deepSleepSeconds`, `remSleepSeconds`

---

## Work Objectives

### Core Objective
Fix the sleep data parsing to correctly extract sleep duration and score from Garmin Connect API responses.

### Concrete Deliverables
- Fixed `sleep_duration_hours` parsing
- Verified/updated `sleep_score` parsing if needed
- Added debug logging for sleep data troubleshooting

### Definition of Done
- [x] Sleep duration correctly shows actual hours (e.g., 6.5h instead of 0.0h)
- [x] Sleep score displays correctly
- [x] Debug logging shows raw sleep data structure for troubleshooting

### Must Have
- Field name correction: `sleepTimeInSeconds` → `sleepTimeSeconds`
- Verify sleep score field access pattern

### Must NOT Have (Guardrails)
- No changes to calculation logic (keep existing -20 to +20 clamping)
- No changes to sleep target configuration
- No breaking changes to API responses

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO - no automated tests for garmin_sync
- **User wants tests**: Manual-only (this is a quick bug fix)
- **QA approach**: Manual verification via sync and dashboard check

### Automated Verification
Since this requires real Garmin data, verification must be manual:

**For Backend/CLI changes** (using Bash):
```bash
# After fix, trigger a sync for today
curl -X POST http://localhost:8000/api/v1/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"days": 1}'

# Check the response - should show health_days_synced: 1
# Then check dashboard API
```

**For Verification** (using Bash):
```bash
# Check the dashboard endpoint
curl -s http://localhost:8000/api/v1/dashboard | jq '.health.sleep_hours, .health.sleep_score'

# Expected: sleep_hours should show ~6.5 (or actual sleep duration), not 0
# Expected: sleep_score should show actual score, not null
```

**Evidence to Capture:**
- [x] Screenshot of dashboard showing correct sleep duration
- [x] API response showing sleep_hours > 0
- [x] API response showing sleep_score with value

---

## Execution Strategy

### Sequential Execution (No Parallel Tasks)
These tasks must run in order because each depends on the previous:

```
Task 1 → Task 2 → Task 3 → Task 4
```

---

## TODOs

- [x] 1. Fix sleep duration field name

  **What to do**:
  - Open `backend/app/services/garmin_sync.py`
  - Find line 274 (in `parse_health_data` method)
  - Change `sleepTimeInSeconds` to `sleepTimeSeconds`

  **Code Change:**
  ```python
  # Before (line 274):
  "sleep_duration_hours": (sleep_dto.get("sleepTimeInSeconds", 0) or 0) / 3600
  
  # After:
  "sleep_duration_hours": (sleep_dto.get("sleepTimeSeconds", 0) or 0) / 3600
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple field name correction, no complex logic
  - **Skills**: []
    - No special skills needed - just a text edit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2 (cannot verify until this is fixed)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `backend/app/services/garmin_sync.py:274` - Line to fix
  - python-garminconnect library source confirms `sleepTimeSeconds` is correct field name

  **Acceptance Criteria**:
  - [x] File edited successfully
  - [x] Field name changed from `sleepTimeInSeconds` to `sleepTimeSeconds`
  - [x] No other changes to the line

  **Commit**: YES
  - Message: `fix(garmin): correct sleep duration field name`
  - Files: `backend/app/services/garmin_sync.py`

- [x] 2. Verify and fix sleep score field access

  **What to do**:
  - Check current sleep_score field access (line 277)
  - Research shows Garmin may return nested structure: `sleepScores.overall.value`
  - If current field `sleepScore` doesn't work, update to access nested value

  **Code Investigation:**
  ```python
  # Current (line 277):
  "sleep_score": sleep_dto.get("sleepScore") if sleep_dto else None,
  
  # Potential fix if needed:
  sleep_scores = sleep_dto.get("sleepScores", {})
  "sleep_score": sleep_scores.get("overall", {}).get("value") if sleep_dto else None,
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Field access verification and potential update
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1
  - **Blocks**: Task 3

  **Acceptance Criteria**:
  - [x] Sleep score field access verified
  - [x] If nested structure needed, update the code
  - [x] Commit changes if modified

  **Commit**: Conditional
  - Only if changes needed
  - Message: `fix(garmin): update sleep score field access`
  - Files: `backend/app/services/garmin_sync.py`

- [x] 3. Add debug logging for sleep data

  **What to do**:
  - Add logging to show raw sleep data structure for troubleshooting
  - This will help debug future sleep data issues

  **Code Addition:**
  ```python
  # In parse_health_data method, after sleep_data extraction (around line 241):
  import logging
  logger = logging.getLogger(__name__)
  
  # Add after: sleep_data = raw_health.get("sleep") or {}
  if sleep_data:
      logger.debug(f"Raw sleep data structure: {sleep_data.keys()}")
      if "dailySleepDTO" in sleep_data:
          logger.debug(f"dailySleepDTO fields: {sleep_data['dailySleepDTO'].keys()}")
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 2
  - **Blocks**: Task 4

  **Acceptance Criteria**:
  - [x] Debug logging added
  - [x] Logs show sleep data keys for troubleshooting
  - [x] No production secrets logged

  **Commit**: YES
  - Message: `feat(garmin): add debug logging for sleep data`
  - Files: `backend/app/services/garmin_sync.py`

- [x] 4. Test the fix with manual sync

  **What to do**:
  - Restart backend to pick up code changes
  - Trigger a sync for today's data
  - Verify dashboard shows correct sleep duration

  **Commands:**
  ```bash
  # Restart backend (if running in Docker)
  docker-compose restart backend

  # Trigger sync for today
  curl -X POST http://localhost:8000/api/v1/sync/trigger \
    -H "Content-Type: application/json" \
    -d '{"days": 1}'

  # Check dashboard data
  curl -s http://localhost:8000/api/v1/dashboard | jq '.health'
  ```

  **Expected Result:**
  ```json
  {
    "sleep_hours": 6.5,  // or actual sleep duration, not 0
    "sleep_score": 85    // or actual score, not null
  }
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 3
  - **Blocks**: None (final task)

  **Acceptance Criteria**:
  - [x] Backend restarted successfully
  - [x] Sync triggered and completed
  - [x] Dashboard shows sleep_hours > 0
  - [x] Dashboard shows sleep_score with value
  - [x] Screenshot captured for evidence

  **Commit**: NO (no code changes, just verification)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(garmin): correct sleep duration field name` | `backend/app/services/garmin_sync.py` | Field name changed |
| 2 | `fix(garmin): update sleep score field access` (if needed) | `backend/app/services/garmin_sync.py` | Sleep score parsing works |
| 3 | `feat(garmin): add debug logging for sleep data` | `backend/app/services/garmin_sync.py` | Logs show debug info |

---

## Success Criteria

### Verification Commands
```bash
# Check sleep data is now correct
curl -s http://localhost:8000/api/v1/dashboard | jq '.health.sleep_hours, .health.sleep_score'

# Expected output: actual numbers, not 0 and null
# Example: 6.45 and 85
```

### Final Checklist
- [x] Sleep duration shows actual hours (not 0)
- [x] Sleep score displays correctly
- [x] Dashboard reflects accurate readiness score
- [x] Debug logging available for future issues
- [x] No regressions in other health metrics
