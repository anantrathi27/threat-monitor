from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.rate_limit import rate_limit
from app.core.sanitize import sanitize_log_line, validate_ip
from app.models.log_entry import LogEntry
from app.models.alert import Alert
from app.models.threat import ThreatEvent, ThreatSeverity, ThreatCategory
from app.schemas import LogIngest, LogOut, AlertOut, ThreatStats, DashboardSummary, ThreatOut

# ── Logs ───────────────────────────────────────────────────────
router = APIRouter()


@router.post("/logs", response_model=LogOut, status_code=201, tags=["logs"])
async def ingest_log(
    data: LogIngest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "analyst")),
    _=Depends(rate_limit),
):
    clean_message = sanitize_log_line(data.raw_line)
    level = "ERROR" if "error" in clean_message.lower() else \
            "WARN" if "warn" in clean_message.lower() else "INFO"

    entry = LogEntry(
        source=data.source,
        level=level,
        message=clean_message,
        raw_line=data.raw_line[:1024],
        source_ip=data.source_ip if data.source_ip and validate_ip(data.source_ip) else None,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.get("/logs", response_model=List[LogOut], tags=["logs"])
async def list_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    source: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(LogEntry).order_by(desc(LogEntry.ingested_at)).offset(skip).limit(limit)
    if source:
        query = query.where(LogEntry.source == source)
    result = await db.execute(query)
    return result.scalars().all()


# ── Alerts ─────────────────────────────────────────────────────
@router.get("/alerts", response_model=List[AlertOut], tags=["alerts"])
async def list_alerts(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Alert).order_by(desc(Alert.created_at)).limit(100)
    if unread_only:
        query = query.where(Alert.is_read == False)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/alerts/{alert_id}/read", tags=["alerts"])
async def mark_read(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert:
        alert.is_read = True
    return {"ok": True}


# ── Analytics ──────────────────────────────────────────────────
@router.get("/analytics/stats", response_model=ThreatStats, tags=["analytics"])
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total = (await db.execute(func.count(ThreatEvent.id))).scalar() or 0

    async def count_sev(sev):
        r = await db.execute(
            select(func.count(ThreatEvent.id)).where(ThreatEvent.severity == sev)
        )
        return r.scalar() or 0

    critical = await count_sev(ThreatSeverity.critical)
    high = await count_sev(ThreatSeverity.high)
    medium = await count_sev(ThreatSeverity.medium)
    low = await count_sev(ThreatSeverity.low)

    open_count = (await db.execute(
        select(func.count(ThreatEvent.id)).where(ThreatEvent.status == "open")
    )).scalar() or 0
    mitigated_count = (await db.execute(
        select(func.count(ThreatEvent.id)).where(ThreatEvent.status == "mitigated")
    )).scalar() or 0

    # By category
    cat_rows = await db.execute(
        select(ThreatEvent.category, func.count(ThreatEvent.id))
        .group_by(ThreatEvent.category)
    )
    by_category = {str(row[0]): row[1] for row in cat_rows}

    # 24h trend (hourly buckets simulated)
    trend_24h = [{"hour": i, "count": 0} for i in range(24)]

    return ThreatStats(
        total=total, critical=critical, high=high, medium=medium, low=low,
        open=open_count, mitigated=mitigated_count,
        by_category=by_category, trend_24h=trend_24h,
    )


@router.get("/analytics/dashboard", response_model=DashboardSummary, tags=["analytics"])
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stats = await get_stats(db=db, current_user=current_user)

    recent = await db.execute(
        select(ThreatEvent).order_by(desc(ThreatEvent.detected_at)).limit(10)
    )

    unread = (await db.execute(
        select(func.count(Alert.id)).where(Alert.is_read == False)
    )).scalar() or 0

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    logs_24h = (await db.execute(
        select(func.count(LogEntry.id)).where(LogEntry.ingested_at >= since)
    )).scalar() or 0

    return DashboardSummary(
        threat_stats=stats,
        recent_threats=list(recent.scalars().all()),
        unread_alerts=unread,
        logs_ingested_24h=logs_24h,
    )


# ── Intel ──────────────────────────────────────────────────────
@router.get("/intel/ip/{ip}", tags=["intel"])
async def lookup_ip(
    ip: str,
    current_user=Depends(get_current_user),
):
    from app.core.sanitize import validate_ip
    if not validate_ip(ip):
        return {"error": "Invalid IP address"}
    # In production: query AbuseIPDB / VirusTotal APIs
    return {
        "ip": ip,
        "abuse_score": 0,
        "country": "Unknown",
        "isp": "Unknown",
        "is_tor": False,
        "is_proxy": False,
        "reports": [],
        "note": "Configure ABUSEIPDB_API_KEY in .env for live data",
    }
