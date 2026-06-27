"""Google Maps photo URL helpers with OpenStreetMap fallback."""

from __future__ import annotations

import os
from urllib.parse import urlencode

import httpx


def _google_api_key() -> str | None:
    key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    return key or None


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
        return f"https://maps.googleapis.com/maps/api/staticmap?{urlencode(params)}"

    params = {
        "center": f"{lat},{lng}",
        "zoom": "15",
        "size": "400x300",
        "markers": f"{lat},{lng},red",
    }
    return f"https://staticmap.openstreetmap.de/staticmap.php?{urlencode(params)}"


def street_view_url(lat: float, lng: float) -> str:
    api_key = _google_api_key()
    if api_key:
        params = {
            "size": "640x400",
            "location": f"{lat},{lng}",
            "fov": "90",
            "pitch": "0",
            "key": api_key,
        }
        return f"https://maps.googleapis.com/maps/api/streetview?{urlencode(params)}"
    return static_map_url(lat, lng)


def location_photo_url(lat: float, lng: float) -> str:
    """Prefer Street View when coverage exists, otherwise Static Maps."""
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
            return street_view_url(lat, lng)
    except httpx.HTTPError:
        pass

    return static_map_url(lat, lng)
