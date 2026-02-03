import os
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path
from garminconnect import Garmin
from garminconnect import (
    GarminConnectAuthenticationError,
    GarminConnectConnectionError,
)
from app.config import get_settings

settings = get_settings()


class GarminSyncService:
    def __init__(self):
        self.client = None
        self.token_path = settings.garmin_token_path or "/app/data/.garminconnect"

    def authenticate(self) -> bool:
        try:
            tokenstore_path = Path(self.token_path).expanduser()
            tokenstore_path.mkdir(parents=True, exist_ok=True)

            try:
                garmin = Garmin()
                garmin.login(str(tokenstore_path))
                self.client = garmin
                return True
            except (
                FileNotFoundError,
                GarminConnectAuthenticationError,
                GarminConnectConnectionError,
            ):
                pass

            email = settings.garmin_email
            password = settings.garmin_password

            if not email or not password:
                return False

            garmin = Garmin(email, password, return_on_mfa=True)
            result1, result2 = garmin.login()

            if result1 == "needs_mfa":
                return False

            garmin.garth.dump(str(tokenstore_path))
            self.client = garmin
            return True

        except Exception as e:
            print(f"Authentication failed: {e}")
            return False

    def authenticate_with_mfa(self, mfa_code: str) -> bool:
        try:
            tokenstore_path = Path(self.token_path).expanduser()
            tokenstore_path.mkdir(parents=True, exist_ok=True)

            email = settings.garmin_email
            password = settings.garmin_password

            if not email or not password:
                return False

            garmin = Garmin(email, password, return_on_mfa=True)
            result1, result2 = garmin.login()

            if result1 == "needs_mfa":
                garmin.resume_login(result2, mfa_code)
                garmin.garth.dump(str(tokenstore_path))
                self.client = garmin
                return True

            return False
        except Exception as e:
            print(f"MFA authentication failed: {e}")
            return False

    def get_activities_by_date(
        self, start_date: date, end_date: date
    ) -> List[Dict[str, Any]]:
        if not self.client:
            if not self.authenticate():
                return []

        activities = []

        try:
            start = 0
            limit = 100

            while True:
                batch = self.client.get_activities(start, limit)

                if not batch:
                    break

                for activity in batch:
                    activity_date_str = activity.get("startTimeLocal", "")[:10]
                    if activity_date_str:
                        activity_date = datetime.strptime(
                            activity_date_str, "%Y-%m-%d"
                        ).date()

                        if start_date <= activity_date <= end_date:
                            activities.append(activity)
                        elif activity_date < start_date:
                            return activities

                start += limit

                if start > 1000:
                    break

        except Exception as e:
            print(f"Error fetching activities: {e}")

        return activities

    def get_activity_details(self, activity_id: str) -> Optional[Dict[str, Any]]:
        if not self.client:
            return None

        try:
            details = self.client.get_activity_details(activity_id)
            return details
        except Exception as e:
            print(f"Error fetching activity details for {activity_id}: {e}")
            return None

    def get_activity_gps(self, activity_id: str) -> Optional[List[Dict[str, Any]]]:
        """Fetch GPS coordinates for an activity from Garmin.

        Returns list of {latitude, longitude, altitude, time} dicts
        or None if GPS data not available.
        """
        if not self.client:
            return None

        try:
            details = self.client.get_activity_details(activity_id)
            if not details:
                return None

            # Extract GPS data from geoPolyline
            geo_polyline = details.get("geoPolyline", [])
            if geo_polyline:
                gps_points = []
                for point in geo_polyline:
                    gps_points.append(
                        {
                            "latitude": point.get("latitude"),
                            "longitude": point.get("longitude"),
                            "altitude": point.get("altitude"),
                            "time": point.get("time"),
                        }
                    )
                return gps_points

            # If no geoPolyline, try fetching from TCX file
            return self._get_gps_from_tcx(activity_id)

        except Exception as e:
            print(f"Error fetching GPS for activity {activity_id}: {e}")
            return None

    def _get_gps_from_tcx(self, activity_id: str) -> Optional[List[Dict[str, Any]]]:
        """Extract GPS coordinates from TCX file."""
        import xml.etree.ElementTree as ET

        try:
            tcx_data = self.client.download_activity(
                activity_id, self.client.ActivityDownloadFormat.TCX
            )

            if not tcx_data:
                return None

            root = ET.fromstring(tcx_data)

            # TCX namespace
            ns = {"": "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"}

            # Find all trackpoints
            trackpoints = root.findall(".//Trackpoint", ns)

            gps_points = []
            for tp in trackpoints:
                pos = tp.find("Position", ns)
                if pos is not None:
                    lat_elem = pos.find("LatitudeDegrees", ns)
                    lon_elem = pos.find("LongitudeDegrees", ns)
                    alt_elem = tp.find("AltitudeMeters", ns)
                    time_elem = tp.find("Time", ns)

                    if lat_elem is not None and lon_elem is not None:
                        gps_points.append(
                            {
                                "latitude": float(lat_elem.text),
                                "longitude": float(lon_elem.text),
                                "altitude": float(alt_elem.text)
                                if alt_elem is not None
                                else None,
                                "time": time_elem.text
                                if time_elem is not None
                                else None,
                            }
                        )

            return gps_points if gps_points else None

        except Exception as e:
            print(f"Error parsing TCX for activity {activity_id}: {e}")
            return None

    def get_health_data(self, target_date: date) -> Dict[str, Any]:
        if not self.client:
            if not self.authenticate():
                return {}

        date_str = target_date.strftime("%Y-%m-%d")

        health_data = {
            "date": target_date,
            "hrv": None,
            "heart_rates": None,
            "sleep": None,
            "body_battery": None,
            "stress": None,
            "stats": None,
            "training_status": None,
        }

        try:
            stats = self.client.get_user_summary(date_str)
            health_data["stats"] = stats
        except:
            pass

        try:
            hr_data = self.client.get_heart_rates(date_str)
            health_data["heart_rates"] = hr_data
        except:
            pass

        try:
            sleep_data = self.client.get_sleep_data(date_str)
            health_data["sleep"] = sleep_data
        except:
            pass

        try:
            bb_data = self.client.get_body_battery(date_str)
            health_data["body_battery"] = bb_data
        except:
            pass

        try:
            stress_data = self.client.get_stress_data(date_str)
            health_data["stress"] = stress_data
        except:
            pass

        try:
            hrv_data = self.client.get_hrv_data(date_str)
            health_data["hrv"] = hrv_data
        except:
            pass

        try:
            training_status = self.client.get_training_status(date_str)
            health_data["training_status"] = training_status
        except:
            pass

        return health_data

    def parse_activity_data(self, raw_activity: Dict[str, Any]) -> Dict[str, Any]:
        activity_id = raw_activity.get("activityId", "")
        summary = raw_activity
        start_time_local = raw_activity.get("startTimeLocal", "")

        started_at = None
        if start_time_local:
            try:
                started_at = datetime.strptime(start_time_local, "%Y-%m-%d %H:%M:%S")
            except:
                pass

        activity_type = "other"
        if "activityType" in raw_activity:
            activity_type = raw_activity["activityType"].get("typeKey", "other")

        return {
            "garmin_id": str(activity_id),
            "started_at": started_at,
            "duration_minutes": (summary.get("duration", 0) or 0) / 60,
            "activity_type": activity_type,
            "activity_name": raw_activity.get("activityName"),
            "training_load": summary.get("activityTrainingLoad")
            or summary.get("trainingStressScore"),
            "calories": summary.get("calories"),
            "avg_hr": summary.get("averageHR"),
            "max_hr": summary.get("maxHR"),
            "distance_meters": summary.get("distance"),
            "hr_zone_1_minutes": (raw_activity.get("hrTimeInZone_1", 0) or 0) / 60,
            "hr_zone_2_minutes": (raw_activity.get("hrTimeInZone_2", 0) or 0) / 60,
            "hr_zone_3_minutes": (raw_activity.get("hrTimeInZone_3", 0) or 0) / 60,
            "hr_zone_4_minutes": (raw_activity.get("hrTimeInZone_4", 0) or 0) / 60,
            "hr_zone_5_minutes": (raw_activity.get("hrTimeInZone_5", 0) or 0) / 60,
            "avg_power": raw_activity.get("avgPower"),
            "max_power": raw_activity.get("maxPower"),
            "normalized_power": raw_activity.get("normPower")
            or raw_activity.get("normalizedPower"),
            "avg_speed": raw_activity.get("averageSpeed"),
            "max_speed": raw_activity.get("maxSpeed"),
            "avg_cadence": raw_activity.get("avgRunCadence")
            or raw_activity.get("avgBikeCadence"),
            "max_cadence": raw_activity.get("maxRunCadence")
            or raw_activity.get("maxBikeCadence"),
            "elevation_gain": raw_activity.get("elevationGain"),
            "elevation_loss": raw_activity.get("elevationLoss"),
            "aerobic_te": raw_activity.get("aerobicTrainingEffect"),
            "anaerobic_te": raw_activity.get("anaerobicTrainingEffect"),
            "raw_data": raw_activity,
        }

    def parse_health_data(self, raw_health: Dict[str, Any]) -> Dict[str, Any]:
        hrv_data = raw_health.get("hrv") or {}
        hr_data = raw_health.get("heart_rates") or {}
        sleep_data = raw_health.get("sleep") or {}
        bb_data = raw_health.get("body_battery") or {}
        stress_data = raw_health.get("stress") or {}
        stats = raw_health.get("stats") or {}
        training_status = raw_health.get("training_status") or {}

        sleep_dto = {}
        if sleep_data and isinstance(sleep_data, dict):
            sleep_dto = (
                sleep_data.get("dailySleepDTO", {})
                if isinstance(sleep_data.get("dailySleepDTO"), dict)
                else {}
            )
            if sleep_dto:
                print(f"[DEBUG] Sleep DTO fields: {list(sleep_dto.keys())}")
                print(
                    f"[DEBUG] Sleep duration seconds: {sleep_dto.get('sleepTimeSeconds')}"
                )
                print(f"[DEBUG] Sleep score: {sleep_dto.get('sleepScore')}")

        target_date = raw_health.get("date")
        if isinstance(target_date, date):
            target_date = target_date.isoformat()

        raw_data_copy = dict(raw_health)
        if isinstance(raw_data_copy.get("date"), date):
            raw_data_copy["date"] = raw_data_copy["date"].isoformat()

        resting_hr = None
        if stats and isinstance(stats, dict):
            resting_hr = stats.get("restingHeartRate")
        if not resting_hr and hr_data and isinstance(hr_data, dict):
            resting_hr = hr_data.get("restingHeartRate")

        hrv_summary = (
            hrv_data.get("hrvSummary", {}) if isinstance(hrv_data, dict) else {}
        )
        hrv_status = None
        hrv_7day_avg = None
        if isinstance(hrv_summary, dict):
            hrv_status = hrv_summary.get("lastNightAvg")
            hrv_7day_avg = hrv_summary.get("weeklyAvg")

        return {
            "date": raw_health.get("date"),
            "hrv_status": hrv_status,
            "hrv_7day_avg": hrv_7day_avg,
            "resting_hr": resting_hr,
            "sleep_duration_hours": (sleep_dto.get("sleepTimeSeconds", 0) or 0) / 3600
            if sleep_dto
            else 0,
            "sleep_score": (
                sleep_dto.get("sleepScore")
                or sleep_dto.get("sleepScores", {}).get("overall", {}).get("value")
                if sleep_dto
                else None
            ),
            "deep_sleep_minutes": (sleep_dto.get("deepSleepSeconds", 0) / 60)
            if sleep_dto and sleep_dto.get("deepSleepSeconds")
            else None,
            "rem_sleep_minutes": (sleep_dto.get("remSleepSeconds", 0) / 60)
            if sleep_dto and sleep_dto.get("remSleepSeconds")
            else None,
            "body_battery_morning": stats.get("bodyBatteryAtWakeTime")
            if isinstance(stats, dict)
            else None,
            "body_battery_evening": stats.get("bodyBatteryMostRecentValue")
            if isinstance(stats, dict)
            else None,
            "stress_avg": stress_data.get("avgStressLevel")
            if isinstance(stress_data, dict)
            else None,
            "steps": stats.get("steps") if isinstance(stats, dict) else None,
            "active_calories": stats.get("activeKilocalories")
            if isinstance(stats, dict)
            else None,
            "vo2max_running": training_status.get("vo2Max")
            if isinstance(training_status, dict)
            else None,
            "vo2max_cycling": None,
            "training_status": training_status.get("trainingStatus")
            if isinstance(training_status, dict)
            else None,
            "training_load_7day": None,
            "raw_data": raw_data_copy,
        }


_sync_service: Optional[GarminSyncService] = None


def get_sync_service() -> GarminSyncService:
    global _sync_service
    if _sync_service is None:
        _sync_service = GarminSyncService()
    return _sync_service
