from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.sanitize import sanitize_log_line, validate_ip
from app.models.log_entry import LogEntry
from app.schemas import LogIngest, LogOut
from app.core.security import require_role

router = APIRouter()


@router.post("", response_model=LogOut, status_code=201)
async def ingest_log(
    data: LogIngest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "analyst")),
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


@router.get("", response_model=List[LogOut])
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
