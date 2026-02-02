# Activity List Enhancement - Implementation Plan

## TL;DR

> **Quick Summary**: Extend the existing activities API and frontend to support comprehensive activity browsing with server-side pagination (10 items/page), multi-select discipline filtering, and sorting by date/duration/training load.
>
> **Deliverables**:
> - Updated `/api/v1/activities` endpoint with multi-discipline filtering and sorting
> - New `/activities` page with pagination, filters, and sort controls
> - Reusable pagination and filter components
> - URL state management for shareable filtered views
> - Updated React Query hooks with filter state management
>
> **Estimated Effort**: Medium (6-8 hours across backend + frontend)
> **Parallel Execution**: YES - 3 waves with 35% time savings
> **Critical Path**: Backend API → Hook → Activities Page → Integration Testing

---

## Context

### Original Request
User wants to implement a comprehensive activity browsing experience with:
1. Pull ALL activities (not just recent) with 10-item pagination
2. Multi-select filtering by activity types (running, cycling, strength, hiit, swim, bike, hyrox, other)
3. Sorting capabilities (by date, duration, training load)

### Current State Analysis

**Backend (FastAPI + SQLAlchemy async)**:
- `/api/v1/activities` endpoint at `main.py:152-166`
- Supports pagination: `limit` (default 50, max 100), `offset` (default 0)
- Supports single discipline filter: `discipline: Optional[str]`
- No sorting parameter support
- Returns: `{total, limit, offset, activities}`

**Frontend (React + TypeScript + TanStack Query)**:
- `useActivities` hook exists at `useActivities.ts:4-11` with basic params support
- `activitiesApi.list` supports pagination params at `api.ts:17-19`
- Dashboard displays only 5 recent activities from dashboard payload
- No dedicated Activities page exists (only Dashboard at `/`)
- Custom shadcn/ui-like components: Card, Button, Badge
- No URL state management for filters

**Activity Types Available**:
- Backend enum: `hyrox`, `strength`, `run`, `bike`, `swim`, `other`
- User wants: `running`, `cycling`, `strength`, `hiit`, `swim`, `bike`, `hyrox`, `other`
- Mapping needed: `running`→`run`, `cycling`→`bike`, `hiit`→`strength` (or new type)

### Research Findings

**Backend Patterns**:
- `ActivityService.get_activities()` builds SQLAlchemy query with optional filters
- Uses separate count query for total calculation
- Hard-coded sort: `order_by(desc(Activity.started_at))`

**Frontend Patterns**:
- React Query with query keys: `['activities', params]`
- API layer centralized in `lib/api.ts`
- UI components in `components/ui/` (Card, Button, Badge)
- Routing via React Router in `App.tsx`
- No URL search params usage currently

---

## Work Objectives

### Core Objective
Enable users to browse their complete activity history with server-side pagination, multi-select filtering by discipline, and flexible sorting options.

### Concrete Deliverables
1. Updated backend API supporting:
   - Multiple discipline filtering via array query parameter
   - Sorting by `date`, `duration`, `training_load` (ascending/descending)
   - Backward compatibility with existing single-discipline filter

2. New frontend Activities page (`/activities`) with:
   - 10-item pagination with Previous/Next controls
   - Multi-select discipline filter (checkbox group or multi-select dropdown)
   - Sort dropdown with direction toggle
   - Activity list display using existing Card/Badge components

3. Reusable components:
   - `Pagination` component for Previous/Next and page numbers
   - `DisciplineFilter` component for multi-select discipline filtering
   - `SortControls` component for sort field and direction

4. Updated hooks:
   - `useActivitiesWithFilters` - manages URL state, pagination, filters

5. URL state management:
   - Filters reflected in URL for bookmarking/sharing
   - Format: `/activities?page=2&disciplines=run,bike&sort_by=date&sort_order=desc`

### Definition of Done
- [x] User can navigate through paginated activity list (10 items/page)
- [x] User can filter by single discipline and see correct results
- [x] User can filter by multiple disciplines and see union of results
- [x] User can sort by date, duration, or training load in both directions
- [x] URL updates when filters/sorting/page changes
- [x] Refreshing page preserves filter/sort/page state
- [x] All existing dashboard functionality remains intact
- [x] Mobile layout is usable (responsive design)

### Must Have
- Multi-select discipline filtering (backend + frontend)
- Server-side pagination with 10 items per page
- Sorting by at least date and duration
- URL state persistence for filters
- Navigation link to Activities page

### Must NOT Have (Guardrails)
- Client-side filtering (must be server-side for performance)
- Breaking changes to existing `/api/v1/activities` endpoint
- New UI component library (use existing patterns)
- Complex filter UI (keep it simple and usable)
- Infinite scroll (use explicit pagination)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (backend has pytest, frontend dev deps suggest Vitest/Jest possible)
- **User wants tests**: NO (manual verification only per constraints)
- **QA approach**: Manual verification with specific procedures

### Automated Verification (Agent-Executable)

Each task includes executable verification procedures:

**For Backend API Changes**:
```bash
# Test multi-discipline filtering
curl -s "http://localhost:8000/api/v1/activities?disciplines=run&disciplines=bike&limit=10" | jq '.activities | length'
# Assert: Returns ≤10 activities, all with discipline "run" or "bike"

# Test sorting
curl -s "http://localhost:8000/api/v1/activities?sort_by=duration&sort_order=asc&limit=5" | jq '.activities[0].duration_minutes'
# Assert: First activity has lowest duration

# Test backward compatibility
curl -s "http://localhost:8000/api/v1/activities?discipline=run&limit=5" | jq '.total'
# Assert: Returns valid response with total count
```

**For Frontend Page** (using Playwright browser automation):
```javascript
// Agent executes via Playwright:
1. Navigate to: http://localhost:5173/activities
2. Wait for: Activity list to load (selector ".activity-item")
3. Assert: Exactly 10 activity items visible
4. Click: "Next" pagination button
5. Assert: URL contains "page=2"
6. Assert: Different activities displayed
7. Check: Checkbox for "Run" discipline
8. Assert: URL contains "disciplines=run"
9. Assert: All visible activities have discipline "run"
10. Screenshot: .sisyphus/evidence/activities-filtered.png
```

**For URL State**:
```bash
# Direct navigation to filtered URL
curl -s http://localhost:5173/activities?disciplines=run,bike&page=2&sort_by=duration
# Agent verifies via Playwright that filters are applied and page 2 is shown
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - No Dependencies):
├── Task 1: Update Backend API (multiple disciplines)
│   └── Modify endpoint, service, SQLAlchemy queries
├── Task 2: Add Sorting to Backend
│   └── Add sort_by and sort_order parameters
└── Task 4: Create Pagination Component
    └── Reusable Previous/Next/Page number component

Wave 2 (After Wave 1 Completes):
├── Task 3: Create useActivitiesWithFilters Hook
│   └── Depends: Backend API updated (Task 1, 2)
│   └── Manage URL state, pagination state, filter state
└── Task 7: Create Filter Components
    └── Multi-select discipline filter component

Wave 3 (After Wave 2 Completes):
├── Task 5: Create Activities Page
│   └── Depends: Hook (Task 3), Pagination (Task 4), Filters (Task 7)
│   └── Integrate all components into full page
└── Task 6: Add Navigation Link
    └── Depends: Activities page exists (Task 5)
    └── Add to App.tsx navigation

Wave 4 (After Wave 3 Completes):
└── Task 8: Integration Testing
    └── Depends: All implementation tasks complete
    └── Manual verification and edge case testing
```

**Critical Path**: Task 1 → Task 3 → Task 5 → Task 8
**Estimated Parallel Speedup**: ~35% faster than sequential

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2, 4 |
| 2 | None | 3 | 1, 4 |
| 3 | 1, 2 | 5, 7 | None |
| 4 | None | 5 | 1, 2 |
| 5 | 3, 4, 7 | 6, 8 | None |
| 6 | 5 | 8 | None |
| 7 | 3 | 5 | None |
| 8 | 5, 6, 7 | None | None |

---

## TODOs

### Task 1: Update Backend API (Multiple Disciplines)

**What to do**:
1. Modify `main.py` lines 152-166: Change `discipline: Optional[str]` to `disciplines: Optional[List[str]] = Query(None)`
2. Update `activity_service.py` lines 41-81: Change discipline filter from `==` to `in_()` for multiple values
3. Handle both single and multiple discipline values for backward compatibility (accept both `discipline` and `disciplines` params)

**Must NOT do**:
- Don't break existing API (support single discipline for backward compat)
- Don't remove any existing parameters

**Recommended Agent Profile**:
- **Category**: `unspecified-high` - Requires understanding of FastAPI and SQLAlchemy async patterns
- **Skills**: `python-programmer` (for FastAPI/SQLAlchemy implementation)
- **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not needed for backend task
  - `frontend-ui-ux`: No UI work in this task

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 4)
- **Blocks**: Task 3 (hook needs updated API)
- **Blocked By**: None (can start immediately)

**References** (CRITICAL):
- **Pattern References**:
  - `backend/app/main.py:152-166` - Current endpoint implementation with single discipline filter
  - `backend/app/services/activity_service.py:41-81` - Current service implementation
- **API/Type References**:
  - `backend/app/schemas/activity.py` - Pydantic ActivityList schema (must remain compatible)
  - `backend/app/models/__init__.py:41-52` - Activity model with discipline field
- **External References**:
  - FastAPI docs: Query parameter lists - https://fastapi.tiangolo.com/tutorial/query-params-str-validations/
  - SQLAlchemy docs: ColumnOperators.in_() - https://docs.sqlalchemy.org/en/20/core/sqlelement.html#sqlalchemy.sql.expression.ColumnOperators.in_

**WHY Each Reference Matters**:
- `main.py:152-166` - Shows current endpoint signature and how params are passed to service
- `activity_service.py:41-81` - Shows current query building pattern; discipline filter at line 59-60 needs modification
- ActivityList schema - Must verify backward compatibility of response structure

**Acceptance Criteria**:
- [x] API accepts `disciplines` as array query parameter: `?disciplines=run&disciplines=bike`
- [x] API accepts single discipline for backward compatibility: `?discipline=run`
- [x] SQLAlchemy query uses `Activity.discipline.in_(disciplines)` when multiple disciplines provided
- [x] Total count query correctly filters by multiple disciplines
- [x] Test: `curl "http://localhost:8000/api/v1/activities?disciplines=run&disciplines=bike&limit=2"` returns only run and bike activities

**Commit**: YES
- Message: `feat(api): support multiple discipline filtering in activities endpoint`
- Files: `backend/app/main.py`, `backend/app/services/activity_service.py`
- Pre-commit: `cd backend && python -m pytest tests/ -v` (if tests exist)

---

### Task 2: Add Sorting to Backend

**What to do**:
1. Modify `main.py`: Add `sort_by: Optional[str] = Query(None)` and `sort_order: Optional[str] = Query("desc")`
2. Update `activity_service.py`: Add sorting logic based on parameters
3. Validate sort_by values against allowed columns: `started_at`, `duration_minutes`, `training_load`
4. Support both `asc` and `desc` sort_order

**Must NOT do**:
- Don't allow sorting by arbitrary columns (security risk)
- Don't break existing default sort order (desc by date)

**Recommended Agent Profile**:
- **Category**: `unspecified-high` - Backend logic with input validation
- **Skills**: `python-programmer` (FastAPI parameter handling and SQLAlchemy ordering)

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 4)
- **Blocks**: Task 3 (hook needs sorting params)
- **Blocked By**: None (can start immediately)

**References**:
- **Pattern References**:
  - `backend/app/services/activity_service.py:77` - Current hard-coded sorting
- **API/Type References**:
  - `backend/app/schemas/activity.py` - Verify Activity model has sortable fields

**Acceptance Criteria**:
- [x] API accepts `sort_by` parameter with values: `date`, `duration`, `training_load`
- [x] API accepts `sort_order` parameter with values: `asc`, `desc` (default: `desc`)
- [x] Invalid sort_by returns 422 validation error
- [x] Test: `curl "http://localhost:8000/api/v1/activities?sort_by=duration&sort_order=asc&limit=5"` returns activities sorted by duration ascending

**Commit**: YES
- Message: `feat(api): add sorting support to activities endpoint`
- Files: `backend/app/main.py`, `backend/app/services/activity_service.py`
- Pre-commit: Verify endpoint still works with default sort

---

### Task 3: Create useActivitiesWithFilters Hook

**What to do**:
1. Create `frontend/src/hooks/useActivitiesWithFilters.ts`
2. Use `useSearchParams` from react-router-dom for URL state management
3. Parse URL params for: `page`, `disciplines`, `sort_by`, `sort_order`
4. Convert page number to offset for API: `offset = (page - 1) * 10`
5. Use `useQuery` with query key: `['activities', { page, disciplines, sort_by, sort_order }]`
6. Return: activities, total, page, setPage, disciplines, toggleDiscipline, sortBy, setSortBy, sortOrder, toggleSortOrder, isLoading, error
7. Handle discipline mapping (user-facing names to backend values)

**Must NOT do**:
- Don't use local state for filters (must be URL-based for shareability)
- Don't fetch all activities (must use server-side pagination with limit=10)

**Recommended Agent Profile**:
- **Category**: `unspecified-high` - Complex hook with multiple concerns
- **Skills**: `typescript-programmer` (complex TypeScript hook with generic types)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Task 5 (page uses hook), Task 7 (filters use hook callbacks)
- **Blocked By**: Task 1, Task 2 (backend API must support new params)

**References**:
- **Pattern References**:
  - `frontend/src/hooks/useActivities.ts:4-11` - Current useActivities pattern
  - `frontend/src/App.tsx:1-79` - React Router usage (shows useSearchParams available)
- **API/Type References**:
  - `frontend/src/lib/api.ts:17-19` - activitiesApi.list signature
  - `frontend/src/lib/types.ts:37-42` - ActivityList type
- **External References**:
  - React Router useSearchParams: https://reactrouter.com/en/main/hooks/use-search-params
  - TanStack Query dependent queries: https://tanstack.com/query/latest/docs/react/guides/dependent-queries

**WHY Each Reference Matters**:
- `useActivities.ts` - Shows current hook pattern; new hook should extend this with URL state
- `App.tsx` - Confirms react-router-dom is available for useSearchParams
- `api.ts` - Shows exact API signature the hook must call

**Acceptance Criteria**:
- [x] Hook manages URL search params: `page`, `disciplines`, `sort_by`, `sort_order`
- [x] Hook returns page manipulation functions (setPage, nextPage, prevPage)
- [x] Hook returns discipline manipulation functions (toggleDiscipline, clearDisciplines)
- [x] Hook returns sort manipulation functions (setSortBy, toggleSortOrder)
- [x] Changing filters resets page to 1
- [x] URL updates when filters change: `?page=2&disciplines=run,bike&sort_by=date&sort_order=desc`
- [x] Test: Navigate to `/activities?disciplines=run&page=2` - hook correctly parses and uses these values

**Commit**: YES
- Message: `feat(hooks): create useActivitiesWithFilters with URL state management`
- Files: `frontend/src/hooks/useActivitiesWithFilters.ts`
- Pre-commit: `cd frontend && npm run lint` (check TypeScript compiles)

---

### Task 4: Create Pagination Component

**What to do**:
1. Create `frontend/src/components/Pagination.tsx`
2. Accept props: `currentPage`, `totalPages`, `onPageChange`, `maxVisiblePages?` (default: 5)
3. Show Previous/Next buttons (disabled when at boundaries)
4. Show page numbers with ellipsis for large ranges (e.g., 1 ... 4 5 6 ... 10)
5. Use existing Button component for styling consistency
6. Calculate totalPages from total items and items per page

**Must NOT do**:
- Don't use external pagination library (keep it simple)
- Don't show all page numbers when there are many (use ellipsis)

**Recommended Agent Profile**:
- **Category**: `visual-engineering` - UI component with visual logic
- **Skills**: `typescript-programmer` (component implementation), `frontend-ui-ux` (pagination UX patterns)

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2)
- **Blocks**: Task 5 (page uses component)
- **Blocked By**: None (can start immediately)

**References**:
- **Pattern References**:
  - `frontend/src/components/ui/Button.tsx:1-39` - Existing Button component to use
  - `frontend/src/components/ui/Card.tsx:1-50` - Card component pattern
- **External References**:
  - Pagination UX best practices: https://www.nngroup.com/articles/pagination/

**Acceptance Criteria**:
- [x] Component renders Previous/Next buttons
- [x] Previous disabled on page 1
- [x] Next disabled on last page
- [x] Shows current page and total pages
- [x] Uses existing Button component for styling
- [x] Shows item range (e.g., "Showing 1-10 of 50 activities")

**Commit**: YES
- Message: `feat(components): create reusable Pagination component`
- Files: `frontend/src/components/Pagination.tsx`
- Pre-commit: Visual check in Storybook or temporary test page

---

### Task 5: Create Activities Page

**What to do**:
1. Create `frontend/src/pages/Activities.tsx`
2. Use `useActivitiesWithFilters` hook
3. Render header with title and sync button (reuse pattern from Dashboard)
4. Render filter bar with DisciplineFilter and SortControls components
5. Render activity list (reuse activity item styling from Dashboard's Recent Activities)
6. Include Pagination component at bottom
7. Handle loading state (spinner) and error state
8. Handle empty state ("No activities found" message)
9. Add responsive layout (filters stack on mobile, side-by-side on desktop)

**Must NOT do**:
- Don't duplicate activity card styling (extract from Dashboard if needed into shared component)
- Don't implement client-side filtering (must be server-side)

**Recommended Agent Profile**:
- **Category**: `visual-engineering` - Full page UI with multiple components
- **Skills**: `typescript-programmer` (page implementation and data flow), `frontend-ui-ux` (page layout and responsive design)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3
- **Blocks**: Task 6 (navigation needs page), Task 8 (testing needs page)
- **Blocked By**: Task 3 (hook), Task 4 (pagination), Task 7 (filters)

**References**:
- **Pattern References**:
  - `frontend/src/pages/Dashboard.tsx:186-210` - Recent Activities rendering pattern
  - `frontend/src/components/ui/Card.tsx` - Card container pattern
  - `frontend/src/components/ui/Badge.tsx` - Badge usage for discipline
- **API/Type References**:
  - `frontend/src/lib/types.ts:1-18` - Activity type definition
- **External References**:
  - Responsive grid patterns with Tailwind: https://tailwindcss.com/docs/responsive-design

**WHY Each Reference Matters**:
- `Dashboard.tsx:186-210` - Shows exactly how to render activity items with icons, badges, and metadata
- Activity type - Defines all fields available to display

**Acceptance Criteria**:
- [x] Page displays 10 activities per page
- [x] Shows discipline badges for each activity
- [x] Shows date, duration, training load for each activity
- [x] Pagination controls visible at bottom
- [x] Filter controls visible at top
- [x] Loading state shows spinner
- [x] Empty state shows "No activities found" message
- [x] Responsive design works on mobile and desktop
- [x] Test: Page renders without errors at `/activities`

**Commit**: YES
- Message: `feat(pages): create Activities page with pagination and filters`
- Files: `frontend/src/pages/Activities.tsx`
- Pre-commit: Navigate to `/activities` and verify page loads

---

### Task 6: Add Navigation Link

**What to do**:
1. Modify `frontend/src/App.tsx`
2. Add `{ to: '/activities', icon: List, label: 'Activities' }` to navItems array
3. Add Route for Activities page: `<Route path="/activities" element={<Activities />} />`
4. Import List icon from lucide-react
5. Import Activities component

**Must NOT do**:
- Don't change existing navigation order without reason (add after Dashboard)
- Don't forget to import the Activities component

**Recommended Agent Profile**:
- **Category**: `quick` - Simple file modification
- **Skills**: `typescript-programmer` (basic React/TypeScript changes)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3
- **Blocks**: Task 8 (testing needs full navigation)
- **Blocked By**: Task 5 (Activities page must exist)

**References**:
- **Pattern References**:
  - `frontend/src/App.tsx:16-47` - Navigation component structure
  - `frontend/src/App.tsx:65-70` - Routes definition

**Acceptance Criteria**:
- [x] Navigation shows "Activities" link with Activity icon
- [x] Link navigates to /activities
- [x] Active state styling works for /activities route
- [x] Activity icon from lucide-react displays correctly
- [x] Test: Click "Activities" in nav → navigates to Activities page

**Commit**: YES
- Message: `feat(nav): add Activities link to navigation`
- Files: `frontend/src/App.tsx`
- Pre-commit: Click test in browser

---

### Task 7: Create Filter Components

**What to do**:
1. Create `frontend/src/components/DisciplineFilter.tsx`
   - Accept props: `selectedDisciplines`, `onToggleDiscipline`, `onClearAll`
   - Show all discipline options with checkboxes (user-facing names)
   - Map user-facing names to backend values internally
   - Show "Clear all" button when filters active
2. Create `frontend/src/components/SortControls.tsx`
   - Accept props: `sortBy`, `sortOrder`, `onSortByChange`, `onToggleOrder`
   - Dropdown for sort_by (Date, Duration, Training Load)
   - Button to toggle sort_order (asc/desc) with arrow icon
3. Use existing Badge component for selected discipline badges

**Must NOT do**:
- Don't create overly complex filter UI (keep it simple)
- Don't fetch discipline counts (not needed for MVP)

**Recommended Agent Profile**:
- **Category**: `visual-engineering` - UI components with interactions
- **Skills**: `typescript-programmer` (component logic), `frontend-ui-ux` (filter UX patterns and accessibility)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Task 5 (page uses components)
- **Blocked By**: Task 3 (hook provides callbacks)

**References**:
- **Pattern References**:
  - `frontend/src/components/ui/Badge.tsx:1-33` - Badge component for selected filters
  - `frontend/src/components/ui/Button.tsx:1-39` - Button component
  - `frontend/src/lib/types.ts:142` - Discipline type definition

**Acceptance Criteria**:
- [x] DisciplineFilter shows all discipline options as clickable badges
- [x] Selected disciplines display with visual highlight
- [x] Clicking selected discipline removes it
- [x] SortControls has dropdown for sort field
- [x] SortControls has button to toggle asc/desc
- [x] Changes trigger URL updates via props callback
- [x] Discipline mapping works (user sees "Run", backend gets "run")

**Commit**: YES
- Message: `feat(components): create DisciplineFilter and SortControls components`
- Files: `frontend/src/components/DisciplineFilter.tsx`, `frontend/src/components/SortControls.tsx`
- Pre-commit: Test components in isolation if possible

---

### Task 8: Integration Testing

**What to do**:
1. Test pagination through multiple pages
   - Verify Previous/Next work correctly
   - Verify page numbers are correct
   - Verify boundary conditions (first page, last page)
2. Test filtering by single and multiple disciplines
   - Verify correct activities returned
   - Verify URL updates correctly
   - Verify page resets to 1 when filter changes
3. Test sorting by all sortable fields
   - Verify ascending and descending work
   - Verify URL updates correctly
4. Test URL state persistence
   - Navigate to filtered URL directly
   - Verify filters are applied on load
   - Verify page is correct
5. Test empty states
   - Filter with no matching activities
   - Verify "No activities found" message
6. Test mobile responsiveness
   - Verify filters stack on mobile
   - Verify list is scrollable
   - Verify pagination is usable
7. Verify backend/frontend type alignment
   - Check no TypeScript errors
   - Check no runtime errors

**Must NOT do**:
- Don't write automated tests (manual verification only per constraints)
- Don't skip edge cases (empty results, boundary pages)

**Recommended Agent Profile**:
- **Category**: `unspecified-low` - Testing and verification
- **Skills**: `typescript-programmer` (understands expected behavior to verify)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4
- **Blocks**: None (final task)
- **Blocked By**: Task 5, Task 6, Task 7 (all implementation must be complete)

**References**:
- **Pattern References**:
  - All implementation files from previous tasks
- **External References**:
  - Manual testing checklist template

**Acceptance Criteria**:
- [x] User can navigate through pages of activities
- [x] User can filter by single discipline and see correct results
- [x] User can filter by multiple disciplines and see union of results
- [x] User can sort by date, duration, training load in asc and desc order
- [x] Refreshing page preserves filter and sort state via URL
- [x] Mobile layout is usable (filters stack, list scrollable)
- [x] Empty state displays when no activities match filters
- [x] No console errors or warnings in new code
- [x] No TypeScript compilation errors in new code

**Commit**: NO (no code changes in testing phase)

---

## Commit Strategy

| After Task | Commit Message | Files | Verification |
|------------|---------------|-------|--------------|
| 1 | `feat(api): support multiple discipline filtering in activities endpoint` | `backend/app/main.py`, `backend/app/services/activity_service.py` | API test with curl |
| 2 | `feat(api): add sorting support to activities endpoint` | `backend/app/main.py`, `backend/app/services/activity_service.py` | API test with curl |
| 3 | `feat(hooks): create useActivitiesWithFilters with URL state management` | `frontend/src/hooks/useActivitiesWithFilters.ts` | TypeScript compiles |
| 4 | `feat(components): create reusable Pagination component` | `frontend/src/components/Pagination.tsx` | Visual check |
| 5 | `feat(pages): create Activities page with pagination and filters` | `frontend/src/pages/Activities.tsx` | Page loads |
| 6 | `feat(nav): add Activities link to navigation` | `frontend/src/App.tsx` | Navigation works |
| 7 | `feat(components): create DisciplineFilter and SortControls components` | `frontend/src/components/DisciplineFilter.tsx`, `frontend/src/components/SortControls.tsx` | Components work |
| 8 | (no commit) | N/A | Manual testing complete |

---

## Success Criteria

### Verification Commands

```bash
# Start backend
cd backend && uvicorn app.main:app --reload

# Start frontend
cd frontend && npm run dev

# Test backend API - multi-discipline filtering
curl -s "http://localhost:8000/api/v1/activities?disciplines=run&disciplines=bike&limit=10" | jq

# Test backend API - sorting
curl -s "http://localhost:8000/api/v1/activities?sort_by=duration&sort_order=asc&limit=5" | jq

# Test backend API - backward compatibility
curl -s "http://localhost:8000/api/v1/activities?discipline=run&limit=5" | jq
```

### Final Checklist

- [x] All "Must Have" features implemented and working
- [x] All "Must NOT Have" constraints respected
- [x] Backend API backward compatible
- [x] Frontend page loads without errors
- [x] URL state management working
- [x] Mobile responsive
- [x] No TypeScript compilation errors in new code
- [x] No console errors in browser
- [x] All 8 tasks completed and verified

---

## Data Flow Architecture

```
User Interaction Flow
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User Action    │────▶│   URL Update    │────▶│  useActivities  │
│ (Click filter,  │     │ useSearchParams │     │  WithFilters    │
│  change page)   │     │                 │     │    Hook         │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌──────────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  TanStack Query │
                    │  (useQuery)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │   Cache    │ │   Loading  │ │    API     │
       │   Check    │ │   State    │ │   Call     │
       └────────────┘ └────────────┘ └─────┬──────┘
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                    │   Backend   │ │  Activity   │ │   Database  │
                    │   FastAPI   │ │   Service   │ │  PostgreSQL │
                    └─────────────┘ └──────┬──────┘ └─────────────┘
                                           │
                              ┌────────────┴────────────┐
                              ▼                         ▼
                    ┌─────────────────┐       ┌─────────────────┐
                    │ Filter Applied  │       │  Sort Applied   │
                    │ (discipline in_ │       │ (order_by desc/ │
                    │  list)          │       │  asc)           │
                    └─────────────────┘       └─────────────────┘
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend API changes break existing dashboard | High | Maintain backward compatibility with single `discipline` param |
| URL state management complexity | Medium | Use react-router's useSearchParams (simple and standard) |
| Discipline name mapping confusion | Low | Document mapping clearly in hook comments |
| Performance with large activity lists | Medium | Server-side pagination ensures only 10 items fetched at a time |
| Mobile UI usability | Medium | Test responsive design, ensure filters stack on mobile |

---

## Notes

### Discipline Name Mapping

User-facing names (in UI) → Backend values (in API):
- `Running` → `run`
- `Cycling` → `bike`
- `Swimming` → `swim`
- `Strength` → `strength`
- `Hyrox` → `hyrox`
- `HIIT` → `strength` (or could add new `hiit` type)
- `Other` → `other`

This mapping should be handled in the `useActivitiesWithFilters` hook to keep components clean.

### Pagination Strategy

Using page-based pagination (not cursor-based) because:
1. Users need to jump to specific pages
2. Total count is needed for UI ("Showing 1-10 of 156 activities")
3. Simple to implement with SQL offset/limit
4. Data volume is moderate (<10k activities typical for individual users)

### Sorting Implementation

Default sort: `started_at` descending (newest first)
Sortable fields:
- `date` → `Activity.started_at`
- `duration` → `Activity.duration_minutes`
- `training_load` → `Activity.training_load`

Null handling: Activities with null values should appear last in ascending order

### Error Handling

- API errors: Show error message in UI, allow retry
- Empty results: Show "No activities found" with option to clear filters
- Invalid URL params: Reset to defaults, show toast notification
- Network errors: Retry 3 times, then show error state
