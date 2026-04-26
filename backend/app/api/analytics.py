from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.threat import ThreatEvent, ThreatSeverity
from app.models.alert import Alert
from app.models.log_entry import LogEntry
from app.schemas import ThreatStats, DashboardSummary, ThreatOut

router = APIRouter()


@router.get("/stats", response_model=ThreatStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    async def count_where(condition=None):
        q = select(func.count(ThreatEvent.id))
        if condition is not None:
            q = q.where(condition)
        return (await db.execute(q)).scalar() or 0

    total = await count_where()
    critical = await count_where(ThreatEvent.severity == ThreatSeverity.critical)
    high = await count_where(ThreatEvent.severity == ThreatSeverity.high)
    medium = await count_where(ThreatEvent.severity == ThreatSeverity.medium)
    low = await count_where(ThreatEvent.severity == ThreatSeverity.low)
    open_count = await count_where(ThreatEvent.status == "open")
    mitigated_count = await count_where(ThreatEvent.status == "mitigated")

    cat_rows = await db.execute(
        select(ThreatEvent.category, func.count(ThreatEvent.id)).group_by(ThreatEvent.category)
    )
    by_category = {str(row[0]): row[1] for row in cat_rows}
    trend_24h = [{"hour": i, "count": 0} for i in range(24)]

    return ThreatStats(
        total=total, critical=critical, high=high, medium=medium, low=low,
        open=open_count, mitigated=mitigated_count,
        by_category=by_category, trend_24h=trend_24h,
    )


@router.get("/dashboard", response_model=DashboardSummary)
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stats = await get_stats(db=db, current_user=current_user)
    recent = (await db.execute(
        select(ThreatEvent).order_by(desc(ThreatEvent.detected_at)).limit(10)
    )).scalars().all()
    unread = (await db.execute(
        select(func.count(Alert.id)).where(Alert.is_read == False)
    )).scalar() or 0
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    logs_24h = (await db.execute(
        select(func.count(LogEntry.id)).where(LogEntry.ingested_at >= since)
    )).scalar() or 0

    return DashboardSummary(
        threat_stats=stats,
        recent_threats=list(recent),
        unread_alerts=unread,
        logs_ingested_24h=logs_24h,
    )
