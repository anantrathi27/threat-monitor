import time
from fastapi import HTTPException, Request
from app.core.redis_client import redis_client
from app.core.config import settings


async def rate_limit(request: Request, limit: int = None, window: int = None):
    """Sliding window rate limiter per IP + endpoint."""
    limit = limit or settings.RATE_LIMIT_REQUESTS
    window = window or settings.RATE_LIMIT_WINDOW

    ip = request.client.host if request.client else "unknown"
    endpoint = request.url.path
    key = f"rate:{ip}:{endpoint}"

    now = time.time()
    window_start = now - window

    pipe = redis_client.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window)
    results = await pipe.execute()

    count = results[2]
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {limit} requests per {window}s",
            headers={"Retry-After": str(window)},
        )
    return count


def make_limiter(limit: int, window: int):
    """Factory to create route-specific limiters."""
    async def _limit(request: Request):
        return await rate_limit(request, limit=limit, window=window)
    return _limit
