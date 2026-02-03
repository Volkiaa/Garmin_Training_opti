# Training Optimizer

A personal training monitor that pulls data from Garmin Connect, models fatigue across different body systems, and provides a daily readiness score with actionable guidance.

## Features

- **Daily Readiness Score**: 0-100 score based on HRV, sleep, body battery, and recent training
- **Multi-Discipline Fatigue Model**: Tracks upper, lower, cardio, and CNS fatigue separately
- **Training Load Tracking**: ACWR (Acute:Chronic Workload Ratio) with injury risk alerts
- **Automatic Garmin Sync**: Daily sync of activities and health metrics
- **Activity Classification**: Auto-classifies Garmin activities into disciplines (Hyrox, Strength, Run, etc.)
- **Guidance System**: "What to avoid" and "what to do" recommendations based on fatigue state

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for frontend)
- Garmin Connect account

### Setup

1. **Clone the repository:**
```bash
git clone <repo>
cd training-optimizer
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Garmin credentials:
# GARMIN_EMAIL=your_email@example.com
# GARMIN_PASSWORD=your_password
```

3. **Start the application:**
```bash
./start.sh
```

The script will:
- Start PostgreSQL and Backend in Docker containers (Python 3.11)
- Run database migrations automatically
- Install frontend dependencies
- Start the frontend dev server

4. **Authenticate with Garmin (first time only):**
```bash
docker-compose exec backend python -c "from app.services.garmin_sync import get_sync_service; s = get_sync_service(); s.authenticate()"
# Enter your MFA code when prompted
```

5. **Open the app:**
- Frontend: http://localhost:5173
- API: http://localhost:8000/api/v1

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │──────▶│   Backend    │──────▶│   Database   │
│  React + TS  │      │  FastAPI     │      │  PostgreSQL  │
└──────────────┘      └──────────────┘      └──────────────┘
                            │
                            ▼
                      ┌──────────────┐
                      │    Garmin    │
                      │   Connect    │
                      └──────────────┘
```

## API Endpoints

- `GET /api/v1/dashboard` - Daily dashboard data
- `GET /api/v1/activities` - List activities with filters
- `GET /api/v1/activities/{id}` - Activity details
- `GET /api/v1/activities/{id}/splits` - Fetch activity lap/split data (distance, time, pace, HR, power, elevation)
- `PATCH /api/v1/activities/{id}` - Update activity classification
- `GET /api/v1/health/daily` - Daily health metrics
- `POST /api/v1/sync/trigger` - Trigger Garmin sync
- `GET /api/v1/settings` - User settings
- `PATCH /api/v1/settings` - Update settings

### Activity Metrics

Detailed activity responses include these specialized metrics:

| Metric | Unit | Description |
|--------|------|-------------|
| `avg_power`, `max_power`, `normalized_power` | Watts | Power data for cycling/running |
| `avg_speed`, `max_speed` | m/s | Speed data |
| `avg_cadence`, `max_cadence` | rpm/spm | Leg or arm turnover |
| `elevation_gain`, `elevation_loss` | Meters | Vertical movement |
| `aerobic_te`, `anaerobic_te` | 0.0-5.0 | Garmin Training Effect scores |

## Core Algorithms

### Readiness Score
```
Score = 70 (base)
      + HRV component (±15)
      + Sleep component (±20)
      + Body Battery component (±10)
      - Recent training fatigue (0-40)
      + Trend adjustment (±5)
```

### Fatigue Model
Tracks 4 dimensions with discipline-specific decay rates:
- **Upper**: Affected by upper body strength, swimming
- **Lower**: Affected by running, cycling, Hyrox
- **Cardio**: Affected by all endurance activities
- **CNS**: Affected by heavy lifting, max efforts

### ACWR (Acute:Chronic Workload Ratio)
- **< 0.8**: Undertrained (yellow)
- **0.8-1.3**: Optimal (green)
- **1.3-1.5**: Caution (yellow) - elevated injury risk
- **> 1.5**: Danger (red) - high injury risk

## Start Script Options

```bash
./start.sh --help              # Show all options
./start.sh --frontend-only     # Start only frontend
./start.sh --setup-only        # Run setup/migrations only
./start.sh --skip-deps         # Skip dependency checks
```

## Development

### View Logs
```bash
# Backend logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres
```

### Database Migrations
```bash
# Auto-generate migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Run migrations
docker-compose exec backend alembic upgrade head
```

### Manual Sync
```bash
curl -X POST http://localhost:8000/api/v1/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

## Troubleshooting

### Python 3.14 Compatibility
If your system has Python 3.14, the backend runs in Docker with Python 3.11 to avoid package compatibility issues. Always use `./start.sh` which handles this automatically.

If you previously tried to install dependencies locally with Python 3.14, clean up:
```bash
cd backend
rm -rf venv
```

### Build Errors (asyncpg, pydantic-core)
These errors occur when trying to use Python 3.14. The solution is to use Docker:
```bash
./start.sh
```

### Garmin Authentication Issues
1. Check your credentials in `.env`
2. Delete old tokens: `docker-compose exec backend rm -rf /app/data/.garmin_tokens`
3. Re-authenticate: `docker-compose exec backend python -c "from app.services.garmin_sync import get_sync_service; s = get_sync_service(); s.authenticate()"`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GARMIN_EMAIL` | Garmin Connect email | - |
| `GARMIN_PASSWORD` | Garmin Connect password | - |
| `GARMIN_TOKEN_PATH` | Path to store auth tokens | `/app/data/.garmin_tokens` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `SYNC_SCHEDULE_ENABLED` | Enable scheduled sync | `true` |

## License

MIT
