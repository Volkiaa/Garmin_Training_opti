#!/usr/bin/env python3
"""
Daily Trends Aggregation Script

Run daily at 00:05 UTC to aggregate weekly metrics.
Updates current week + previous week (handles late syncs).
"""

import asyncio
import sys
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, "/app")

from app.database import AsyncSessionLocal
from app.services.trends_service import TrendsService


async def aggregate_daily():
    """Run daily aggregation for trends."""
    async with AsyncSessionLocal() as db:
        service = TrendsService(db)

        # Backfill last 12 weeks
        # This updates current week and previous week for late syncs
        results = await service.backfill_weeks(weeks=12)

        print(f"Aggregated {len(results)} weeks")
        for r in results:
            print(
                f"  Week {r.week_start}: {r.activity_count} activities, {r.total_load:.1f} load"
            )


if __name__ == "__main__":
    asyncio.run(aggregate_daily())
