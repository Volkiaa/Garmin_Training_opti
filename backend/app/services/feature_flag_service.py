"""
Feature Flag Service - Manage feature rollouts with expiry.

This module provides a simple feature flag system for gradual rollouts.
Features can be enabled for a limited time (e.g., 2 weeks) after first use.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import UserSettings


class FeatureFlagService:
    """Service for managing feature flags with expiry dates."""

    # Feature flag definitions with default expiry periods
    FEATURE_CONFIG = {
        "readiness_v2_toggle": {
            "default_enabled": True,
            "expiry_days": 14,  # 2 weeks
            "description": "V1/V2 readiness toggle for comparison",
        },
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_feature_status(
        self, feature_name: str, user_id: int = 1
    ) -> Dict[str, Any]:
        """
        Get the current status of a feature flag.

        Returns:
            Dict with enabled (bool), expires_at (datetime or None), and days_remaining (int or None)
        """
        config = self.FEATURE_CONFIG.get(feature_name)
        if not config:
            return {
                "enabled": False,
                "expires_at": None,
                "days_remaining": None,
                "error": f"Unknown feature: {feature_name}",
            }

        # Get user settings to check when feature was first enabled
        result = await self.db.execute(
            select(UserSettings).where(UserSettings.id == user_id)
        )
        settings = result.scalar_one_or_none()

        if not settings:
            # No settings yet, use defaults
            return {
                "enabled": config["default_enabled"],
                "expires_at": None,
                "days_remaining": config["expiry_days"],
            }

        # Check if this feature has been used before
        feature_field = f"{feature_name}_enabled_at"
        enabled_at = getattr(settings, feature_field, None)

        if enabled_at is None:
            # First time - feature is enabled with full expiry
            return {
                "enabled": config["default_enabled"],
                "expires_at": None,  # Will be set on first actual use
                "days_remaining": config["expiry_days"],
            }

        # Calculate expiry
        expiry_date = enabled_at + timedelta(days=config["expiry_days"])
        now = datetime.utcnow()
        days_remaining = (expiry_date - now).days

        if days_remaining <= 0:
            # Feature has expired
            return {
                "enabled": False,
                "expires_at": expiry_date.isoformat(),
                "days_remaining": 0,
                "expired": True,
            }

        return {
            "enabled": True,
            "expires_at": expiry_date.isoformat(),
            "days_remaining": days_remaining,
            "expired": False,
        }

    async def record_feature_use(
        self, feature_name: str, user_id: int = 1
    ) -> Dict[str, Any]:
        """
        Record that a feature was used. Sets the enabled_at timestamp on first use.

        Returns:
            Updated feature status
        """
        config = self.FEATURE_CONFIG.get(feature_name)
        if not config:
            return {"error": f"Unknown feature: {feature_name}"}

        result = await self.db.execute(
            select(UserSettings).where(UserSettings.id == user_id)
        )
        settings = result.scalar_one_or_none()

        if not settings:
            # Create default settings
            settings = UserSettings(id=user_id)
            self.db.add(settings)

        feature_field = f"{feature_name}_enabled_at"
        enabled_at = getattr(settings, feature_field, None)

        if enabled_at is None:
            # First use - record the timestamp
            setattr(settings, feature_field, datetime.utcnow())
            await self.db.commit()

        return await self.get_feature_status(feature_name, user_id)

    async def is_feature_enabled(self, feature_name: str, user_id: int = 1) -> bool:
        """Simple check if feature is currently enabled."""
        status = await self.get_feature_status(feature_name, user_id)
        return status.get("enabled", False)

    async def get_all_features(self, user_id: int = 1) -> Dict[str, Dict[str, Any]]:
        """Get status of all defined features."""
        return {
            name: await self.get_feature_status(name, user_id)
            for name in self.FEATURE_CONFIG.keys()
        }
