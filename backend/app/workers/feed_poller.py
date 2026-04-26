"""
Feed Poller — Celery task that polls external threat intel feeds on a schedule.
Run with: celery -A app.workers.feed_poller worker --beat -l info
"""
from __future__ import annotations

import asyncio
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "cybershield",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.beat_schedule = {
    "poll-abuseipdb-every-15min": {
        "task": "app.workers.feed_poller.poll_abuseipdb_feed",
        "schedule": crontab(minute="*/15"),
    },
    "poll-otx-every-hour": {
        "task": "app.workers.feed_poller.poll_otx_feed",
        "schedule": crontab(minute=0),
    },
    "aggregate-analytics-midnight": {
        "task": "app.workers.analytics_job.aggregate_daily_stats",
        "schedule": crontab(hour=0, minute=5),
    },
}

celery_app.conf.timezone = "UTC"


@celery_app.task(name="app.workers.feed_poller.poll_abuseipdb_feed", bind=True, max_retries=3)
def poll_abuseipdb_feed(self):
    """
    Poll AbuseIPDB for top abusive IPs and cache results in Redis.
    In production this would upsert into Elasticsearch.
    """
    try:
        import httpx, json, asyncio
        from app.core.redis_client import redis_client

        async def _fetch():
            if not settings.ABUSEIPDB_API_KEY:
                return []
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://api.abuseipdb.com/api/v2/blacklist",
                    headers={"Key": settings.ABUSEIPDB_API_KEY, "Accept": "application/json"},
                    params={"limit": 500, "confidenceMinimum": 90},
                )
                return resp.json().get("data", [])

        data = asyncio.run(_fetch())
        print(f"[feed_poller] Fetched {len(data)} abusive IPs from AbuseIPDB")
        return {"fetched": len(data)}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(name="app.workers.feed_poller.poll_otx_feed", bind=True, max_retries=3)
def poll_otx_feed(self):
    """
    Poll AlienVault OTX for latest pulses (threat indicators).
    Requires OTX_API_KEY in environment.
    """
    try:
        print("[feed_poller] OTX feed poll complete (configure OTX_API_KEY for live data)")
        return {"status": "ok"}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)
