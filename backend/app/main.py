from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.core.config import settings
from app.core.database import init_db
from app.api import auth, threats, logs, alerts, analytics, intel
from app.ws.manager import ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="CyberShield Threat Monitor API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(threats.router, prefix="/api/threats", tags=["threats"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(intel.router, prefix="/api/intel", tags=["intel"])
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "operational", "service": "CyberShield API"}
