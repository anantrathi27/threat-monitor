"""
Threat Engine — scores, classifies, and enriches incoming threat events.
"""
from __future__ import annotations

import re
from typing import Optional
from app.models.threat import ThreatCategory, ThreatSeverity

# Severity → base risk score
SEVERITY_SCORES: dict[str, float] = {
    "critical": 9.5,
    "high": 7.5,
    "medium": 5.0,
    "low": 2.5,
    "info": 1.0,
}

# Known-bad port patterns
HIGH_RISK_PORTS = {22, 23, 3389, 445, 135, 139, 4444, 6667, 31337}

# Category multipliers
CATEGORY_MULTIPLIER: dict[str, float] = {
    "malware": 1.2,
    "data_exfiltration": 1.15,
    "lateral_movement": 1.1,
    "intrusion": 1.1,
    "ddos": 1.05,
    "brute_force": 0.95,
    "reconnaissance": 0.9,
    "phishing": 1.0,
    "unknown": 1.0,
}

# Regex heuristics for auto-classification
CATEGORY_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"brute.?force|failed.?login|auth.?fail|password.?spray", re.I), "brute_force"),
    (re.compile(r"malware|ransomware|trojan|rootkit|beacon|c2|command.?control", re.I), "malware"),
    (re.compile(r"ddos|flood|amplification|syn.?flood|udp.?flood", re.I), "ddos"),
    (re.compile(r"exfil|data.?leak|data.?theft|large.?transfer|upload.*external", re.I), "data_exfiltration"),
    (re.compile(r"phish|spear|credential.?harvest|email.?attack", re.I), "phishing"),
    (re.compile(r"scan|sweep|enum|nmap|masscan|reconnaissance|recon", re.I), "reconnaissance"),
    (re.compile(r"lateral|pass.?hash|mimikatz|kerberoast|pivot", re.I), "lateral_movement"),
    (re.compile(r"exploit|injection|rce|sqli|xss|lfi|rfi|cve-", re.I), "intrusion"),
]


def classify_threat(title: str, description: Optional[str] = None) -> str:
    """Auto-classify a threat based on title/description text."""
    text = f"{title} {description or ''}"
    for pattern, category in CATEGORY_PATTERNS:
        if pattern.search(text):
            return category
    return "unknown"


def compute_score(
    severity: str,
    category: str,
    destination_port: Optional[int] = None,
    source_ip: Optional[str] = None,
) -> float:
    """Compute a composite risk score 0–10."""
    base = SEVERITY_SCORES.get(severity, 5.0)
    multiplier = CATEGORY_MULTIPLIER.get(category, 1.0)

    # Port risk bonus
    port_bonus = 0.3 if destination_port in HIGH_RISK_PORTS else 0.0

    # RFC-1918 source is less scary than external
    internal = _is_internal_ip(source_ip) if source_ip else False
    origin_penalty = -0.5 if internal else 0.0

    raw = (base * multiplier) + port_bonus + origin_penalty
    return round(min(max(raw, 0.0), 10.0), 2)


def _is_internal_ip(ip: str) -> bool:
    """Return True if IP is in RFC-1918 private ranges."""
    try:
        parts = list(map(int, ip.split(".")))
        if parts[0] == 10:
            return True
        if parts[0] == 172 and 16 <= parts[1] <= 31:
            return True
        if parts[0] == 192 and parts[1] == 168:
            return True
    except Exception:
        pass
    return False


def enrich_threat(data: dict) -> dict:
    """
    Enrich a raw threat dict with:
    - auto-classified category (if unknown)
    - computed score
    Returns the enriched dict (mutates in place).
    """
    if data.get("category") in (None, "unknown", ""):
        data["category"] = classify_threat(
            data.get("title", ""), data.get("description")
        )

    data["score"] = compute_score(
        severity=data.get("severity", "medium"),
        category=data.get("category", "unknown"),
        destination_port=data.get("destination_port"),
        source_ip=data.get("source_ip"),
    )
    return data
