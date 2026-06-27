"""Generate running routes from popular regional locations."""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.google_maps import location_photo_url
from app.locations import Location, locations_for_region

ROAD_FACTOR = 1.35


@dataclass(frozen=True)
class RoutePoint:
    name: str
    lat: float
    lng: float
    photo_url: str


@dataclass(frozen=True)
class GeneratedRoute:
    id: str
    name: str
    region: str
    distance_km: float
    route_type: str
    start: RoutePoint
    end: RoutePoint
    description: str
    highlights: tuple[str, ...]
    difficulty: str
    surface: str
    best_for: str


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(a))


def _point(location: Location) -> RoutePoint:
    return RoutePoint(
        name=location.name,
        lat=location.lat,
        lng=location.lng,
        photo_url=location_photo_url(location.lat, location.lng),
    )


def _distance_band(target_km: float) -> tuple[float, float]:
    if target_km <= 4:
        return (2.0, 4.0)
    margin = min(2.0, target_km * 0.25)
    return (max(2.0, target_km - margin), target_km + margin)


def _difficulty_for_distance(distance_km: float, pace: str) -> str:
    if pace == "easy":
        return "Easy" if distance_km <= 5 else "Moderate"
    if pace == "challenging":
        return "Challenging" if distance_km >= 8 else "Moderate"
    return "Easy" if distance_km <= 6 else "Moderate"


def _score_candidate(distance_km: float, target_km: float, min_km: float, max_km: float) -> float | None:
    if distance_km < min_km or distance_km > max_km:
        return None
    return -abs(distance_km - target_km)


def generate_routes(
    region: str,
    target_km: float,
    *,
    pace: str = "steady",
    limit: int = 3,
) -> list[GeneratedRoute]:
    locations = locations_for_region(region)
    if len(locations) < 2:
        return []

    min_km, max_km = _distance_band(target_km)
    candidates: list[tuple[float, GeneratedRoute]] = []

    for start in locations:
        start_point = _point(start)

        for end in locations:
            if start.id == end.id:
                continue

            direct_km = haversine_km(start.lat, start.lng, end.lat, end.lng) * ROAD_FACTOR
            end_point = _point(end)

            for route_type, distance_km, name, description in (
                (
                    "out-and-back",
                    direct_km * 2,
                    f"{start.name} out-and-back",
                    f"Run from {start.name} toward {end.name} and return for a balanced out and back.",
                ),
                (
                    "point-to-point",
                    direct_km,
                    f"{start.name} to {end.name}",
                    f"A direct point-to-point linking two popular spots in {start.region}.",
                ),
            ):
                score = _score_candidate(distance_km, target_km, min_km, max_km)
                if score is None:
                    continue

                route = GeneratedRoute(
                    id=f"{start.id}-{end.id}-{route_type}",
                    name=name,
                    region=start.region,
                    distance_km=round(distance_km, 1),
                    route_type=route_type,
                    start=start_point,
                    end=end_point if route_type == "point-to-point" else start_point,
                    description=description,
                    highlights=(start.description, end.description, route_type.replace("-", " ").title()),
                    difficulty=_difficulty_for_distance(distance_km, pace),
                    surface="Mixed paths",
                    best_for="Short city runs" if distance_km <= 5 else "Steady endurance",
                )
                candidates.append((score, route))

        for other in locations:
            if start.id == other.id:
                continue
            loop_km = haversine_km(start.lat, start.lng, other.lat, other.lng) * ROAD_FACTOR * 2
            score = _score_candidate(loop_km, target_km, min_km, max_km)
            if score is None:
                continue

            route = GeneratedRoute(
                id=f"{start.id}-{other.id}-loop",
                name=f"{start.name} loop via {other.name}",
                region=start.region,
                distance_km=round(loop_km, 1),
                route_type="loop",
                start=start_point,
                end=start_point,
                description=f"A scenic loop starting at {start.name}, passing {other.name}, and returning.",
                highlights=(start.description, other.description, "Loop"),
                difficulty=_difficulty_for_distance(loop_km, pace),
                surface="Pavement",
                best_for="Neighbourhood exploration",
            )
            candidates.append((score, route))

    candidates.sort(key=lambda item: item[0], reverse=True)

    seen_ids: set[str] = set()
    results: list[GeneratedRoute] = []
    for _, route in candidates:
        if route.id in seen_ids:
            continue
        seen_ids.add(route.id)
        results.append(route)
        if len(results) >= limit:
            break

    return results
