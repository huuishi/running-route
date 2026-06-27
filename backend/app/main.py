import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.route_generator import GeneratedRoute, RoutePoint, generate_routes

load_dotenv()

app = FastAPI(title="Running Route API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGIN",
        "https://huuishi.github.io,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RoutePointResponse(BaseModel):
    name: str
    lat: float
    lng: float
    photo_url: str


class RouteResponse(BaseModel):
    id: str
    name: str
    region: str
    distance_km: float
    route_type: str
    start: RoutePointResponse
    end: RoutePointResponse
    description: str
    highlights: list[str]
    difficulty: str
    surface: str
    best_for: str


class RouteSearchResponse(BaseModel):
    region: str
    target_distance_km: float
    routes: list[RouteResponse]
    google_maps_configured: bool


def _serialize_point(point: RoutePoint) -> RoutePointResponse:
    return RoutePointResponse(
        name=point.name,
        lat=point.lat,
        lng=point.lng,
        photo_url=point.photo_url,
    )


def _serialize_route(route: GeneratedRoute) -> RouteResponse:
    return RouteResponse(
        id=route.id,
        name=route.name,
        region=route.region,
        distance_km=route.distance_km,
        route_type=route.route_type,
        start=_serialize_point(route.start),
        end=_serialize_point(route.end),
        description=route.description,
        highlights=list(route.highlights),
        difficulty=route.difficulty,
        surface=route.surface,
        best_for=route.best_for,
    )


@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "running-route-api",
        "supabase_configured": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY")),
        "google_maps_configured": bool(os.getenv("GOOGLE_MAPS_API_KEY")),
    }


@app.get("/routes")
@app.get("/api/routes")
def routes():
    return {
        "message": "Route API ready",
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_anon_key_configured": bool(os.getenv("SUPABASE_ANON_KEY")),
        "google_maps_configured": bool(os.getenv("GOOGLE_MAPS_API_KEY")),
    }


@app.get("/api/routes/search", response_model=RouteSearchResponse)
def search_routes(
    region: Literal["Any", "Central", "East Coast", "West", "North"] = Query(default="Any"),
    distance_km: float = Query(default=3.0, ge=2.0, le=20.0),
    pace: Literal["easy", "steady", "challenging"] = Query(default="steady"),
    limit: int = Query(default=3, ge=1, le=6),
):
    generated = generate_routes(region, distance_km, pace=pace, limit=limit)
    if not generated:
        raise HTTPException(
            status_code=404,
            detail=f"No routes found for {distance_km} km in {region}. Try another area or distance.",
        )

    return RouteSearchResponse(
        region=region,
        target_distance_km=distance_km,
        routes=[_serialize_route(route) for route in generated],
        google_maps_configured=bool(os.getenv("GOOGLE_MAPS_API_KEY")),
    )
