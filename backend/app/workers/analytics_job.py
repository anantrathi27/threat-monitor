"""
Analytics Job — Celery task for nightly aggregation of threat statistics.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from app.workers.feed_poller import celery_app


@celery_app.task(name="app.workers.analytics_job.aggregate_daily_stats", bind=True)
def aggregate_daily_stats(self):
    """
    Aggregate yesterday's threat events into summary stats.
    Stores results in Redis for fast dashboard reads.
    """
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.core.redis_client import redis_client
        from app.models.threat import ThreatEvent, ThreatSeverity
        from sqlalchemy import select, func
        import json

        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        async with AsyncSessionLocal() as db:
            total = (await db.execute(
                select(func.count(ThreatEvent.id))
                .where(ThreatEvent.detected_at >= yesterday)
            )).scalar() or 0

            by_sev = {}
            for sev in ThreatSeverity:
                count = (await db.execute(
                    select(func.count(ThreatEvent.id))
                    .where(ThreatEvent.severity == sev)
                    .where(ThreatEvent.detected_at >= yesterday)
                )).scalar() or 0
                by_sev[sev.value] = count

        summary = {
            "date": yesterday.strftime("%Y-%m-%d"),
            "total": total,
            "by_severity": by_sev,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        await redis_client.setex(
            f"analytics:daily:{summary['date']}",
            86400 * 7,  # keep 7 days
            json.dumps(summary),
        )
        print(f"[analytics_job] Daily stats aggregated: {total} events for {summary['date']}")
        return summary

    return asyncio.run(_run())


@celery_app.task(name="app.workers.analytics_job.compute_hourly_trend")
def compute_hourly_trend():
    """Compute last-24h hourly event counts for the dashboard trend chart."""
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.core.redis_client import redis_client
        from app.models.threat import ThreatEvent
        from sqlalchemy import select, func
        import json

        now = datetime.now(timezone.utc)
        buckets = []
        async with AsyncSessionLocal() as db:
            for i in range(24):
                start = now - timedelta(hours=24 - i)
                end = start + timedelta(hours=1)
                count = (await db.execute(
                    select(func.count(ThreatEvent.id))
                    .where(ThreatEvent.detected_at >= start)
                    .where(ThreatEvent.detected_at < end)
                )).scalar() or 0
                buckets.append({"hour": start.strftime("%H:00"), "count": count})

        await redis_client.setex("analytics:hourly_trend", 3600, json.dumps(buckets))
        return buckets

    return asyncio.run(_run())
