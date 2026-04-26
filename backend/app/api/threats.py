from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.rate_limit import rate_limit
from app.models.threat import ThreatEvent, ThreatSeverity, ThreatStatus
from app.schemas import ThreatCreate, ThreatUpdate, ThreatOut
from app.ws.manager import ws_manager

router = APIRouter()


@router.get("", response_model=List[ThreatOut])
async def list_threats(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    severity: Optional[ThreatSeverity] = None,
    status: Optional[ThreatStatus] = None,
    search: Optional[str] = Query(None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(rate_limit),
):
    query = select(ThreatEvent).order_by(desc(ThreatEvent.detected_at))
    if severity:
        query = query.where(ThreatEvent.severity == severity)
    if status:
        query = query.where(ThreatEvent.status == status)
    if search:
        query = query.where(ThreatEvent.title.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{threat_id}", response_model=ThreatOut)
async def get_threat(
    threat_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(ThreatEvent).where(ThreatEvent.id == threat_id))
    threat = result.scalar_one_or_none()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    return threat


@router.post("", response_model=ThreatOut, status_code=201)
async def create_threat(
    data: ThreatCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "analyst")),
):
    # Compute risk score
    severity_scores = {"critical": 9.5, "high": 7.5, "medium": 5.0, "low": 2.5, "info": 1.0}
    score = severity_scores.get(data.severity, 5.0)

    threat = ThreatEvent(**data.model_dump(), score=score)
    db.add(threat)
    await db.flush()
    await db.refresh(threat)

    # Broadcast to WS clients
    await ws_manager.broadcast({
        "type": "new_threat",
        "data": {
            "id": threat.id,
            "title": threat.title,
            "severity": threat.severity,
            "category": threat.category,
            "source_ip": threat.source_ip,
            "score": threat.score,
        }
    })
    return threat


@router.patch("/{threat_id}", response_model=ThreatOut)
async def update_threat(
    threat_id: int,
    data: ThreatUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "analyst")),
):
    result = await db.execute(select(ThreatEvent).where(ThreatEvent.id == threat_id))
    threat = result.scalar_one_or_none()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(threat, field, value)
    return threat


@router.delete("/{threat_id}", status_code=204)
async def delete_threat(
    threat_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    result = await db.execute(select(ThreatEvent).where(ThreatEvent.id == threat_id))
    threat = result.scalar_one_or_none()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    await db.delete(threat)
