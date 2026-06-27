import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Running Route API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGIN", "https://huuishi.github.io").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "running-route-api",
        "supabase_configured": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY")),
    }


@app.get("/routes")
def routes():
    return {
        "message": "Route API ready",
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_anon_key_configured": bool(os.getenv("SUPABASE_ANON_KEY")),
    }
