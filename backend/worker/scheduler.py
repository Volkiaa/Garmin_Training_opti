"""Worker service scheduler."""

import asyncio
import signal
import sys
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.executors.asyncio import AsyncIOExecutor
from sqlalchemy import create_engine

from worker.config import settings


def get_sync_database_url():
    """Convert async database URL to sync for APScheduler."""
    url = settings.database_url
    # Replace asyncpg with psycopg2 for synchronous operations
    if "postgresql+asyncpg" in url:
        return url.replace("postgresql+asyncpg", "postgresql+psycopg2")
    return url


async def main():
    """Main worker entry point."""
    print(f"[{datetime.now().isoformat()}] Starting worker scheduler...")
    print(f"Auto-sync enabled: {settings.auto_sync_enabled}")
    print(f"Daily sync hour: {settings.sync_hour}")

    # Configure scheduler without SQLAlchemy job store
    # We'll track jobs in memory since we have sync_jobs table for persistence
    executors = {"default": AsyncIOExecutor()}
    job_defaults = {
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 3600,  # 1 hour grace period
    }

    scheduler = AsyncIOScheduler(
        executors=executors,
        job_defaults=job_defaults,
        timezone=settings.timezone,
    )

    # Import and add jobs
    from worker.jobs import hourly_sync_job, daily_sync_job

    # Hourly job - check for new activities every hour
    scheduler.add_job(
        hourly_sync_job,
        "cron",
        minute=0,  # At the start of each hour
        id="hourly_sync",
        replace_existing=True,
        name="Hourly Activity Sync",
    )

    # Daily job - full dashboard refresh
    scheduler.add_job(
        daily_sync_job,
        "cron",
        hour=settings.sync_hour,
        minute=0,
        id="daily_sync",
        replace_existing=True,
        name="Daily Dashboard Refresh",
    )

    # Start scheduler
    scheduler.start()

    jobs = scheduler.get_jobs()
    print(f"[{datetime.now().isoformat()}] Scheduler started with {len(jobs)} jobs:")
    for job in jobs:
        print(f"  - {job.name} (id: {job.id}, next run: {job.next_run_time})")

    # Keep running until interrupted
    try:
        while True:
            await asyncio.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        print(f"\n[{datetime.now().isoformat()}] Shutting down scheduler...")
        scheduler.shutdown()
        print("Scheduler stopped.")


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    print(f"\nReceived signal {signum}, shutting down...")
    sys.exit(0)


if __name__ == "__main__":
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    # Run main loop
    asyncio.run(main())
