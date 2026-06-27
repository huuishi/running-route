"""Google Maps photo and route URL helpers with OpenStreetMap fallback."""

from __future__ import annotations

import os
from urllib.parse import urlencode

import httpx


def _google_api_key() -> str | None:
    key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    return key or None


def _midpoint(lat1: float, lng1: float, lat2: float, lng2: float) -> tuple[float, float]:
    return ((lat1 + lat2) / 2, (lng1 + lng2) / 2)


def static_map_url(lat: float, lng: float, *, label: str = "") -> str:
    api_key = _google_api_key()
    if api_key:
        params = {
            "center": f"{lat},{lng}",
            "zoom": "16",
            "size": "640x400",
            "scale": "2",
            "maptype": "roadmap",
            "markers": f"color:green|{lat},{lng}",
            "key": api_key,
        }
        if label:
            params["markers"] = f"color:green|label:{label[:1].upper()}|{lat},{lng}"
        return f"https://maps.googleapis.com/maps/api/staticmap?{urlencode(params)}"

    params = {
        "center": f"{lat},{lng}",
        "zoom": "15",
        "size": "400x300",
        "markers": f"{lat},{lng},red",
    }
    return f"https://staticmap.openstreetmap.de/staticmap.php?{urlencode(params)}"


def route_map_url(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    *,
    route_type: str,
    via_lat: float | None = None,
    via_lng: float | None = None,
) -> str:
    api_key = _google_api_key()
    if api_key:
        points: list[tuple[float, float]] = [(start_lat, start_lng)]
        if via_lat is not None and via_lng is not None:
            points.append((via_lat, via_lng))
        if route_type == "point-to-point":
            points.append((end_lat, end_lng))
        else:
            points.append((start_lat, start_lng))

        path = "|".join(f"{lat},{lng}" for lat, lng in points)
        markers = [
            f"color:green|label:S|{start_lat},{start_lng}",
            f"color:red|label:E|{end_lat},{end_lng}",
        ]
        if via_lat is not None and via_lng is not None:
            markers.append(f"color:gold|label:W|{via_lat},{via_lng}")

        params = [
            ("size", "900x560"),
            ("scale", "2"),
            ("maptype", "roadmap"),
            ("path", f"color:0x2f8f6bff|weight:6|{path}"),
        ]
        params.extend(("markers", marker) for marker in markers)
        params.append(("key", api_key))
        return f"https://maps.googleapis.com/maps/api/staticmap?{urlencode(params)}"

    center_lat, center_lng = _midpoint(start_lat, start_lng, end_lat, end_lng)
    params = {
        "center": f"{center_lat},{center_lng}",
        "zoom": "14",
        "size": "900x560",
        "markers": f"{start_lat},{start_lng},green|{end_lat},{end_lng},red",
    }
    if via_lat is not None and via_lng is not None:
        params["markers"] += f"|{via_lat},{via_lng},gold"
    return f"https://staticmap.openstreetmap.de/staticmap.php?{urlencode(params)}"


def route_directions_url(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    *,
    route_type: str,
    via_lat: float | None = None,
    via_lng: float | None = None,
) -> str:
    params: dict[str, str] = {
        "api": "1",
        "origin": f"{start_lat},{start_lng}",
        "destination": f"{end_lat},{end_lng}",
        "travelmode": "walking",
    }
    if via_lat is not None and via_lng is not None:
        params["waypoints"] = f"{via_lat},{via_lng}"
    elif route_type != "point-to-point":
        params["waypoints"] = f"{end_lat},{end_lng}"

    return f"https://www.google.com/maps/dir/?{urlencode(params)}"


def location_photo_url(lat: float, lng: float) -> str:
    api_key = _google_api_key()
    if not api_key:
        return static_map_url(lat, lng)

    metadata_url = (
        "https://maps.googleapis.com/maps/api/streetview/metadata?"
        + urlencode({"location": f"{lat},{lng}", "key": api_key})
    )
    try:
        response = httpx.get(metadata_url, timeout=5.0)
        response.raise_for_status()
        if response.json().get("status") == "OK":
            params = {
                "size": "640x400",
                "location": f"{lat},{lng}",
                "fov": "90",
                "pitch": "0",
                "key": api_key,
            }
            return f"https://maps.googleapis.com/maps/api/streetview?{urlencode(params)}"
    except httpx.HTTPError:
        pass

    return static_map_url(lat, lng)
