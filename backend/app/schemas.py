from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import datetime
from app.models.user import UserRole
from app.models.threat import ThreatSeverity, ThreatStatus, ThreatCategory
from app.models.alert import AlertSeverity
import re


# ── Auth Schemas ──────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v):
        if not re.match(r"^[a-zA-Z0-9_]{3,50}$", v):
            raise ValueError("Username must be 3-50 alphanumeric chars or underscores")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Threat Schemas ─────────────────────────────────────────────
class ThreatCreate(BaseModel):
    title: str
    description: Optional[str] = None
    severity: ThreatSeverity
    category: ThreatCategory = ThreatCategory.unknown
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    raw_data: Optional[dict] = None
    geo_country: Optional[str] = None
    geo_city: Optional[str] = None


class ThreatUpdate(BaseModel):
    status: Optional[ThreatStatus] = None
    severity: Optional[ThreatSeverity] = None
    description: Optional[str] = None


class ThreatOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    severity: ThreatSeverity
    category: ThreatCategory
    status: ThreatStatus
    source_ip: Optional[str]
    destination_ip: Optional[str]
    source_port: Optional[int]
    destination_port: Optional[int]
    protocol: Optional[str]
    score: float
    geo_country: Optional[str]
    geo_city: Optional[str]
    cve_ids: Optional[List[str]]
    ioc_matches: Optional[List[str]]
    detected_at: datetime
    model_config = {"from_attributes": True}


# ── Log Schemas ────────────────────────────────────────────────
class LogIngest(BaseModel):
    source: str
    raw_line: str
    source_ip: Optional[str] = None


class LogOut(BaseModel):
    id: int
    source: str
    level: str
    message: str
    source_ip: Optional[str]
    ingested_at: datetime
    model_config = {"from_attributes": True}


# ── Alert Schemas ──────────────────────────────────────────────
class AlertOut(BaseModel):
    id: int
    title: str
    message: str
    severity: AlertSeverity
    threat_id: Optional[int]
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Analytics Schemas ──────────────────────────────────────────
class ThreatStats(BaseModel):
    total: int
    critical: int
    high: int
    medium: int
    low: int
    open: int
    mitigated: int
    by_category: dict[str, int]
    trend_24h: List[dict[str, Any]]


class DashboardSummary(BaseModel):
    threat_stats: ThreatStats
    recent_threats: List[ThreatOut]
    unread_alerts: int
    logs_ingested_24h: int
