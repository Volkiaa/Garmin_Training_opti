Garmin Connect integration requires MFA authentication through the `garth` library. Here's how to authenticate:

## First-Time Setup

1. Set your Garmin credentials in `.env`:
```
GARMIN_EMAIL=your_email@example.com
GARMIN_PASSWORD=your_password
```

2. Run the sync script:
```bash
cd backend
python -c "from app.services.garmin_sync import get_sync_service; s = get_sync_service(); s.authenticate()"
```

3. If prompted, enter your MFA code from your authenticator app

4. Tokens will be saved to `.garmin_tokens/` for future use

## Subsequent Syncs

Once authenticated, tokens are automatically refreshed. No MFA code needed unless tokens expire.

## Manual Sync

Trigger from the Dashboard UI or via API:
```bash
curl -X POST http://localhost:8000/api/v1/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```
