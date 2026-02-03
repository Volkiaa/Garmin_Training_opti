"""
PostgreSQL advisory lock utilities for preventing concurrent sync operations.

These locks are session-level and will be automatically released when the
database session ends, but we should still explicitly release them when done.
"""

from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def acquire_sync_lock(db: AsyncSession, lock_id: int = 1) -> bool:
    """
    Attempt to acquire a PostgreSQL advisory lock.

    Args:
        db: Async SQLAlchemy session
        lock_id: The lock ID to acquire (default: 1 for sync operations)

    Returns:
        True if lock was acquired, False if already held by another session
    """
    result = await db.execute(text("SELECT pg_try_advisory_lock(:id)"), {"id": lock_id})
    return result.scalar()


async def release_sync_lock(db: AsyncSession, lock_id: int = 1) -> bool:
    """
    Release a PostgreSQL advisory lock.

    Args:
        db: Async SQLAlchemy session
        lock_id: The lock ID to release (default: 1 for sync operations)

    Returns:
        True if lock was released, False if lock was not held
    """
    result = await db.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": lock_id})
    return result.scalar()


async def is_sync_running(db: AsyncSession, lock_id: int = 1) -> bool:
    """
    Check if a sync operation is currently running by attempting to acquire
    and immediately release the lock.

    Args:
        db: Async SQLAlchemy session
        lock_id: The lock ID to check (default: 1 for sync operations)

    Returns:
        True if sync is running (lock is held), False otherwise
    """
    # Try to acquire the lock
    acquired = await acquire_sync_lock(db, lock_id)

    if acquired:
        # We got the lock, so sync was NOT running - release it immediately
        await release_sync_lock(db, lock_id)
        return False
    else:
        # Could not acquire, so sync IS running
        return True


@asynccontextmanager
async def sync_lock(db: AsyncSession, lock_id: int = 1):
    """
    Async context manager for acquiring and automatically releasing
    a PostgreSQL advisory lock.

    Usage:
        async with sync_lock(db):
            # Do sync work here
            pass

    Args:
        db: Async SQLAlchemy session
        lock_id: The lock ID to use (default: 1 for sync operations)

    Raises:
        RuntimeError: If the lock cannot be acquired (sync already in progress)
    """
    acquired = await acquire_sync_lock(db, lock_id)
    if not acquired:
        raise RuntimeError("Sync already in progress - cannot acquire advisory lock")

    try:
        yield
    finally:
        await release_sync_lock(db, lock_id)
