from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.alert import Alert
from app.schemas import AlertOut

router = APIRouter()


@router.get("", response_model=List[AlertOut])
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


@router.patch("/{alert_id}/read")
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


@router.post("/mark-all-read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.is_read == False))
    for alert in result.scalars().all():
        alert.is_read = True
    return {"ok": True}
