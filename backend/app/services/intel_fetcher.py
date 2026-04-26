"""
Intel Fetcher — queries external threat intelligence APIs.
Supports: AbuseIPDB, VirusTotal, AlienVault OTX, NVD CVE.
Results are cached in Redis for 1 hour.
"""
from __future__ import annotations

import json
import httpx
from typing import Optional

from app.core.config import settings
from app.core.redis_client import redis_client

CACHE_TTL = 3600  # 1 hour


async def _cache_get(key: str) -> Optional[dict]:
    try:
        raw = await redis_client.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def _cache_set(key: str, value: dict) -> None:
    try:
        await redis_client.setex(key, CACHE_TTL, json.dumps(value))
    except Exception:
        pass


async def lookup_ip_abuseipdb(ip: str) -> dict:
    """Query AbuseIPDB for IP reputation."""
    cache_key = f"intel:abuseipdb:{ip}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    if not settings.ABUSEIPDB_API_KEY:
        return {"source": "abuseipdb", "error": "API key not configured", "ip": ip}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.abuseipdb.com/api/v2/check",
                headers={"Key": settings.ABUSEIPDB_API_KEY, "Accept": "application/json"},
                params={"ipAddress": ip, "maxAgeInDays": 90, "verbose": True},
            )
            data = resp.json().get("data", {})
            result = {
                "source": "abuseipdb",
                "ip": ip,
                "abuse_score": data.get("abuseConfidenceScore", 0),
                "country": data.get("countryCode"),
                "isp": data.get("isp"),
                "usage_type": data.get("usageType"),
                "is_tor": data.get("isTor", False),
                "is_proxy": data.get("isPublicProxy", False),
                "total_reports": data.get("totalReports", 0),
                "last_reported": data.get("lastReportedAt"),
            }
            await _cache_set(cache_key, result)
            return result
    except Exception as e:
        return {"source": "abuseipdb", "error": str(e), "ip": ip}


async def lookup_domain_virustotal(domain: str) -> dict:
    """Query VirusTotal for domain reputation."""
    cache_key = f"intel:vt:{domain}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    if not settings.VIRUSTOTAL_API_KEY:
        return {"source": "virustotal", "error": "API key not configured", "domain": domain}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://www.virustotal.com/api/v3/domains/{domain}",
                headers={"x-apikey": settings.VIRUSTOTAL_API_KEY},
            )
            data = resp.json().get("data", {}).get("attributes", {})
            stats = data.get("last_analysis_stats", {})
            result = {
                "source": "virustotal",
                "domain": domain,
                "malicious": stats.get("malicious", 0) > 0,
                "malicious_count": stats.get("malicious", 0),
                "suspicious_count": stats.get("suspicious", 0),
                "harmless_count": stats.get("harmless", 0),
                "categories": data.get("categories", {}),
                "reputation": data.get("reputation", 0),
                "tags": data.get("tags", []),
            }
            await _cache_set(cache_key, result)
            return result
    except Exception as e:
        return {"source": "virustotal", "error": str(e), "domain": domain}


async def lookup_cve(cve_id: str) -> dict:
    """Query NVD for CVE details."""
    cache_key = f"intel:cve:{cve_id}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://services.nvd.nist.gov/rest/json/cves/2.0",
                params={"cveId": cve_id},
            )
            items = resp.json().get("vulnerabilities", [])
            if not items:
                return {"source": "nvd", "error": "CVE not found", "cve_id": cve_id}
            cve = items[0]["cve"]
            metrics = cve.get("metrics", {})
            cvss_data = (
                metrics.get("cvssMetricV31", [{}])[0].get("cvssData", {})
                or metrics.get("cvssMetricV30", [{}])[0].get("cvssData", {})
                or metrics.get("cvssMetricV2", [{}])[0].get("cvssData", {})
            )
            result = {
                "source": "nvd",
                "cve_id": cve_id,
                "description": cve.get("descriptions", [{}])[0].get("value", ""),
                "cvss_score": cvss_data.get("baseScore"),
                "cvss_severity": cvss_data.get("baseSeverity"),
                "published": cve.get("published"),
                "last_modified": cve.get("lastModified"),
                "references": [r["url"] for r in cve.get("references", [])[:5]],
            }
            await _cache_set(cache_key, result)
            return result
    except Exception as e:
        return {"source": "nvd", "error": str(e), "cve_id": cve_id}


async def enrich_ip(ip: str) -> dict:
    """Aggregate intel from all IP sources."""
    abuse = await lookup_ip_abuseipdb(ip)
    return {
        "ip": ip,
        "intel": {"abuseipdb": abuse},
        "risk_level": _score_to_risk(abuse.get("abuse_score", 0)),
    }


def _score_to_risk(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 20:
        return "medium"
    return "low"
