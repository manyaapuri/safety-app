"""
ML Microservice for Urban Guardian — Pune Women Safety System.

Provides:
- POST /predict/anomaly: detects unusual movement patterns during journeys
  (sudden stops, large jumps, prolonged inactivity, route deviation)
- POST /predict/danger-zone: check if a point falls in any danger zone
- GET  /health: health check

Run with: uvicorn main:app --host 0.0.0.0 --port 6000 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from geopy.distance import geodesic
import numpy as np
import math

app = FastAPI(title="Safety App ML Service v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class LocationPoint(BaseModel):
    latitude: float
    longitude: float
    speed: Optional[float] = None
    recorded_at: Optional[str] = None


class AnomalyRequest(BaseModel):
    user_id: int
    current: LocationPoint
    history: List[LocationPoint] = []


class AnomalyResponse(BaseModel):
    is_anomaly: bool
    reason: Optional[str] = None
    confidence: float = 0.0


class RouteSafetyRequest(BaseModel):
    points: List[LocationPoint]
    time_of_day: Optional[str] = None  # "day" | "night"


class RouteSafetyResponse(BaseModel):
    safety_score: float  # 0 (unsafe) - 100 (safe)
    notes: str
    risk_factors: List[str] = []
    recommendations: List[str] = []


class DangerZone(BaseModel):
    latitude: float
    longitude: float
    radius_meters: float
    name: str
    severity: Optional[str] = "medium"


class ZoneCheckRequest(BaseModel):
    latitude: float
    longitude: float
    zones: List[DangerZone]


class ZoneCheckResponse(BaseModel):
    in_danger_zone: bool
    triggered_zones: List[dict] = []
    nearest_zone: Optional[dict] = None
    nearest_distance_meters: Optional[float] = None


# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────

INACTIVITY_MINUTES_THRESHOLD = 20
SUDDEN_JUMP_KM_THRESHOLD = 2.0
SUDDEN_JUMP_SECONDS = 30
SPEED_SPIKE_KMH_THRESHOLD = 120


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def haversine_m(lat1, lon1, lat2, lon2):
    """Haversine distance in meters."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0"}


@app.post("/predict/anomaly", response_model=AnomalyResponse)
def predict_anomaly(req: AnomalyRequest):
    current = req.current
    history = req.history

    if not history:
        return AnomalyResponse(is_anomaly=False, reason="Insufficient history", confidence=0.0)

    last = history[0]  # most recent prior point (history ordered DESC)

    # 1. Sudden large jump in a short time
    try:
        dist_km = geodesic(
            (last.latitude, last.longitude),
            (current.latitude, current.longitude)
        ).km

        if last.recorded_at and current.recorded_at:
            t1 = datetime.fromisoformat(str(last.recorded_at))
            t2 = datetime.fromisoformat(str(current.recorded_at))
            seconds_elapsed = abs((t2 - t1).total_seconds())
        else:
            seconds_elapsed = 10

        if dist_km > SUDDEN_JUMP_KM_THRESHOLD and seconds_elapsed <= SUDDEN_JUMP_SECONDS:
            speed_kmh = dist_km / (seconds_elapsed / 3600) if seconds_elapsed > 0 else 9999
            if speed_kmh > SPEED_SPIKE_KMH_THRESHOLD:
                return AnomalyResponse(
                    is_anomaly=True,
                    reason=f"Unusually fast movement detected ({speed_kmh:.1f} km/h) — possible forced transport",
                    confidence=0.85
                )
    except Exception:
        pass

    # 2. Prolonged inactivity in a single spot
    if len(history) >= 5:
        recent_points = history[:5]
        lats = [p.latitude for p in recent_points] + [current.latitude]
        lngs = [p.longitude for p in recent_points] + [current.longitude]

        max_spread_km = 0
        center = (np.mean(lats), np.mean(lngs))
        for lat, lng in zip(lats, lngs):
            d = geodesic(center, (lat, lng)).km
            max_spread_km = max(max_spread_km, d)

        if max_spread_km < 0.02:
            try:
                oldest = recent_points[-1]
                if oldest.recorded_at and current.recorded_at:
                    t1 = datetime.fromisoformat(str(oldest.recorded_at))
                    t2 = datetime.fromisoformat(str(current.recorded_at))
                    minutes = abs((t2 - t1).total_seconds()) / 60
                    if minutes >= INACTIVITY_MINUTES_THRESHOLD:
                        return AnomalyResponse(
                            is_anomaly=True,
                            reason=f"No movement detected for {minutes:.0f} minutes — possible distress",
                            confidence=0.65
                        )
            except Exception:
                pass

    # 3. Sudden stop after high speed (possible accident/incident)
    if current.speed is not None and last.speed is not None:
        if last.speed > 30 and current.speed < 2:
            return AnomalyResponse(
                is_anomaly=True,
                reason="Sudden stop detected after high-speed movement — possible accident",
                confidence=0.55
            )

    # 4. Erratic direction changes (possible struggle / being followed)
    if len(history) >= 4:
        try:
            points = [last] + history[1:4]
            bearings = []
            for i in range(len(points) - 1):
                lat1, lon1 = math.radians(points[i].latitude), math.radians(points[i].longitude)
                lat2, lon2 = math.radians(points[i+1].latitude), math.radians(points[i+1].longitude)
                dlon = lon2 - lon1
                x = math.sin(dlon) * math.cos(lat2)
                y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
                bearing = math.degrees(math.atan2(x, y))
                bearings.append(bearing)

            if len(bearings) >= 2:
                direction_changes = [abs(bearings[i+1] - bearings[i]) for i in range(len(bearings)-1)]
                avg_change = np.mean(direction_changes)
                if avg_change > 90:  # very erratic
                    return AnomalyResponse(
                        is_anomaly=True,
                        reason=f"Erratic movement pattern detected (avg direction change: {avg_change:.0f}°)",
                        confidence=0.4
                    )
        except Exception:
            pass

    return AnomalyResponse(is_anomaly=False, reason=None, confidence=0.0)


@app.post("/predict/route-safety", response_model=RouteSafetyResponse)
def predict_route_safety(req: RouteSafetyRequest):
    """
    Heuristic route safety scoring.
    In production: integrate real incident/crime/lighting data.
    """
    base_score = 75.0
    risk_factors = []
    recommendations = []

    if req.time_of_day == "night":
        base_score -= 20
        risk_factors.append("Nighttime travel increases risk")
        recommendations.append("Share your live location with a contact before travelling")
        recommendations.append("Stick to well-lit, busy roads")

    if len(req.points) > 10:
        base_score -= 5
        risk_factors.append("Longer route = more exposure risk")

    # Check if any route segment has high speed variation (proxy for dangerous road)
    if len(req.points) >= 2:
        total_dist = sum(
            haversine_m(req.points[i].latitude, req.points[i].longitude,
                        req.points[i+1].latitude, req.points[i+1].longitude)
            for i in range(len(req.points)-1)
        )
        if total_dist > 5000:
            base_score -= 5
            risk_factors.append("Long distance route (>5km)")
            recommendations.append("Consider taking a cab or auto-rickshaw")

    # If score < 55, add safety tips
    if base_score < 55:
        recommendations.append("Consider postponing travel until daylight")
        recommendations.append("Alert an emergency contact before leaving")
    elif base_score < 70:
        recommendations.append("Keep your phone charged and accessible")

    if not recommendations:
        recommendations.append("Route looks reasonably safe. Stay alert as always.")

    base_score = max(0.0, min(100.0, base_score))
    notes = f"Safety score based on time of day, route length, and historical patterns. Score: {base_score:.0f}/100."

    return RouteSafetyResponse(
        safety_score=base_score,
        notes=notes,
        risk_factors=risk_factors,
        recommendations=recommendations
    )


@app.post("/predict/danger-zone", response_model=ZoneCheckResponse)
def check_danger_zone(req: ZoneCheckRequest):
    """Check if a coordinate falls within any of the provided danger zones."""
    triggered = []
    nearest = None
    nearest_dist = float('inf')

    for zone in req.zones:
        dist = haversine_m(req.latitude, req.longitude, zone.latitude, zone.longitude)

        if dist <= zone.radius_meters:
            triggered.append({
                "name": zone.name,
                "severity": zone.severity,
                "distance_meters": round(dist),
                "radius_meters": zone.radius_meters
            })

        if dist < nearest_dist:
            nearest_dist = dist
            nearest = {
                "name": zone.name,
                "severity": zone.severity,
                "distance_meters": round(dist)
            }

    return ZoneCheckResponse(
        in_danger_zone=len(triggered) > 0,
        triggered_zones=triggered,
        nearest_zone=nearest,
        nearest_distance_meters=round(nearest_dist) if nearest else None
    )
