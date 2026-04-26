from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.sanitize import validate_ip, validate_domain

router = APIRouter()


@router.get("/ip/{ip}")
async def lookup_ip(ip: str, current_user=Depends(get_current_user)):
    if not validate_ip(ip):
        return {"error": "Invalid IP address format"}
    return {
        "ip": ip,
        "abuse_score": 0,
        "country": "Unknown",
        "isp": "Unknown",
        "is_tor": False,
        "is_proxy": False,
        "reports": [],
        "note": "Configure ABUSEIPDB_API_KEY in .env for live threat intelligence",
    }


@router.get("/domain/{domain}")
async def lookup_domain(domain: str, current_user=Depends(get_current_user)):
    if not validate_domain(domain):
        return {"error": "Invalid domain format"}
    return {
        "domain": domain,
        "malicious": False,
        "categories": [],
        "note": "Configure VIRUSTOTAL_API_KEY in .env for live domain intelligence",
    }
