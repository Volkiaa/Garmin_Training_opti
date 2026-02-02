"""
End-to-End Tests for Training Optimizer V2

These tests verify critical user flows:
1. Dashboard loads with readiness data
2. Creating an event and seeing it in the list
3. Toggling between V1 and V2 readiness
4. Viewing trends data

Note: These are integration tests that require the full application stack.
Run with: pytest e2e/ -v
"""

import pytest
import requests
from datetime import date, timedelta

# Base URL for the API
BASE_URL = "http://localhost:8000/api/v1"


@pytest.fixture(scope="module")
def base_url():
    """Provide base URL for API requests."""
    return BASE_URL


@pytest.mark.e2e
class TestDashboardFlow:
    """Test dashboard loading and readiness display."""

    def test_dashboard_loads_successfully(self, base_url):
        """Dashboard endpoint returns 200 with readiness data."""
        response = requests.get(f"{base_url}/dashboard")
        assert response.status_code == 200

        data = response.json()
        assert "readiness" in data
        assert "score" in data["readiness"]
        assert "category" in data["readiness"]
        assert "factors" in data["readiness"]

    def test_dashboard_returns_training_load(self, base_url):
        """Dashboard includes training load data."""
        response = requests.get(f"{base_url}/dashboard")
        assert response.status_code == 200

        data = response.json()
        assert "training_load" in data
        assert "acute" in data["training_load"]
        assert "chronic" in data["training_load"]
        assert "acwr" in data["training_load"]

    def test_dashboard_returns_fatigue(self, base_url):
        """Dashboard includes fatigue data."""
        response = requests.get(f"{base_url}/dashboard")
        assert response.status_code == 200

        data = response.json()
        assert "fatigue" in data
        assert "upper" in data["fatigue"]
        assert "lower" in data["fatigue"]
        assert "cardio" in data["fatigue"]
        assert "cns" in data["fatigue"]

    def test_dashboard_returns_sport_specific_readiness(self, base_url):
        """Dashboard includes sport-specific readiness."""
        response = requests.get(f"{base_url}/dashboard")
        assert response.status_code == 200

        data = response.json()
        assert "readiness" in data
        assert "sport_specific" in data["readiness"]

    def test_dashboard_v1_version_parameter(self, base_url):
        """Dashboard accepts version=v1 parameter."""
        response = requests.get(f"{base_url}/dashboard?version=v1")
        assert response.status_code == 200

        data = response.json()
        assert "readiness" in data
        assert data["readiness"]["score"] >= 0
        assert data["readiness"]["score"] <= 100

    def test_dashboard_v2_version_parameter(self, base_url):
        """Dashboard accepts version=v2 parameter."""
        response = requests.get(f"{base_url}/dashboard?version=v2")
        assert response.status_code == 200

        data = response.json()
        assert "readiness" in data
        assert data["readiness"]["score"] >= 0
        assert data["readiness"]["score"] <= 100


@pytest.mark.e2e
class TestEventsFlow:
    """Test event creation and management."""

    def test_list_events(self, base_url):
        """Events endpoint returns list."""
        response = requests.get(f"{base_url}/events")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_and_delete_event(self, base_url):
        """Can create an event and then delete it."""
        # Create event
        event_date = (date.today() + timedelta(days=30)).isoformat()
        create_response = requests.post(
            f"{base_url}/events",
            params={
                "name": "E2E Test Event",
                "event_date": event_date,
                "event_type": "hyrox",
                "priority": "A",
            },
        )
        assert create_response.status_code == 200
        created_event = create_response.json()
        assert created_event["name"] == "E2E Test Event"
        assert created_event["priority"] == "A"
        event_id = created_event["id"]

        # Verify event appears in list
        list_response = requests.get(f"{base_url}/events")
        assert list_response.status_code == 200
        events = list_response.json()
        event_ids = [e["id"] for e in events]
        assert event_id in event_ids

        # Delete event
        delete_response = requests.delete(f"{base_url}/events/{event_id}")
        assert delete_response.status_code == 200

        # Verify event is gone
        list_response2 = requests.get(f"{base_url}/events")
        events2 = list_response2.json()
        event_ids2 = [e["id"] for e in events2]
        assert event_id not in event_ids2

    def test_get_current_phase(self, base_url):
        """Current phase endpoint returns phase data."""
        response = requests.get(f"{base_url}/phases/current")
        assert response.status_code == 200

        data = response.json()
        assert "phase" in data
        assert "phase_name" in data


@pytest.mark.e2e
class TestTrendsFlow:
    """Test trends and analytics."""

    def test_get_weekly_trends(self, base_url):
        """Weekly trends endpoint returns data."""
        response = requests.get(f"{base_url}/trends/weekly?weeks=4")
        assert response.status_code == 200

        data = response.json()
        assert "weeks" in data
        assert isinstance(data["weeks"], list)

    def test_get_daily_trends(self, base_url):
        """Daily trends endpoint returns data."""
        start_date = (date.today() - timedelta(days=7)).isoformat()
        end_date = date.today().isoformat()

        response = requests.get(
            f"{base_url}/trends/daily",
            params={"start_date": start_date, "end_date": end_date},
        )
        assert response.status_code == 200

        data = response.json()
        assert "days" in data
        assert isinstance(data["days"], list)

    def test_period_comparison(self, base_url):
        """Period comparison endpoint works."""
        period1_start = (date.today() - timedelta(days=14)).isoformat()
        period1_end = (date.today() - timedelta(days=7)).isoformat()
        period2_start = (date.today() - timedelta(days=7)).isoformat()
        period2_end = date.today().isoformat()

        response = requests.get(
            f"{base_url}/trends/comparison",
            params={
                "period1_start": period1_start,
                "period1_end": period1_end,
                "period2_start": period2_start,
                "period2_end": period2_end,
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert "period1" in data
        assert "period2" in data
        assert "delta" in data


@pytest.mark.e2e
class TestFeatureFlagsFlow:
    """Test feature flag system."""

    def test_get_features(self, base_url):
        """Features endpoint returns feature flags."""
        response = requests.get(f"{base_url}/features")
        assert response.status_code == 200

        data = response.json()
        assert "features" in data

    def test_record_feature_use(self, base_url):
        """Can record feature usage."""
        response = requests.post(f"{base_url}/features/readiness_v2_toggle/use")
        assert response.status_code == 200

        data = response.json()
        assert "enabled" in data


@pytest.mark.e2e
class TestHealthCheck:
    """Test system health."""

    def test_health_endpoint(self, base_url):
        """Health endpoint returns OK."""
        response = requests.get(f"{base_url.replace('/api/v1', '')}/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_api_root(self, base_url):
        """API root is accessible."""
        response = requests.get(base_url.replace("/api/v1", "/"))
        assert response.status_code in [200, 307, 308]  # OK or redirect
