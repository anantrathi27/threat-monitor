"""
Log Parser — parses raw log lines into structured fields.
Supports: syslog (RFC 3164/5424), nginx access/error, auth logs, generic CEF.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional


# ── Regex Patterns ─────────────────────────────────────────────
SYSLOG_PATTERN = re.compile(
    r"^(?P<month>\w{3})\s+(?P<day>\d+)\s+(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<host>\S+)\s+(?P<process>\S+?)(?:\[(?P<pid>\d+)\])?:\s+(?P<message>.+)$"
)

NGINX_ACCESS = re.compile(
    r'^(?P<ip>\S+)\s+-\s+-\s+\[(?P<time>[^\]]+)\]\s+"(?P<method>\w+)\s+(?P<path>\S+)'
    r'\s+HTTP/[\d.]+"\s+(?P<status>\d{3})\s+(?P<bytes>\d+)'
)

NGINX_ERROR = re.compile(
    r"^(?P<time>\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})\s+\[(?P<level>\w+)\]\s+"
    r"(?P<pid>\d+)#(?P<tid>\d+):\s+(?P<message>.+)$"
)

AUTH_LOG = re.compile(
    r"(?P<result>Failed|Accepted)\s+(?P<method>\w+)\s+for\s+(?:invalid user\s+)?(?P<user>\S+)"
    r"\s+from\s+(?P<ip>[\d.]+)\s+port\s+(?P<port>\d+)"
)

IP_PATTERN = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

SEVERITY_KEYWORDS = {
    "critical": ["critical", "emergency", "emerg", "fatal"],
    "high":     ["alert", "error", "err", "fail", "denied"],
    "medium":   ["warning", "warn", "notice"],
    "low":      ["info", "information", "debug"],
}


def detect_level(text: str) -> str:
    lower = text.lower()
    if any(k in lower for k in ["error", "err", "fail", "denied", "refused", "reject"]):
        return "ERROR"
    if any(k in lower for k in ["warn", "warning", "notice"]):
        return "WARN"
    return "INFO"


def extract_ips(text: str) -> list[str]:
    return list(set(IP_PATTERN.findall(text)))


def parse_syslog(line: str) -> Optional[dict]:
    m = SYSLOG_PATTERN.match(line)
    if not m:
        return None
    return {
        "source": m.group("process").rstrip(":"),
        "level": detect_level(m.group("message")),
        "message": m.group("message"),
        "source_ip": extract_ips(m.group("message"))[0] if extract_ips(m.group("message")) else None,
        "parsed_fields": {
            "host": m.group("host"),
            "process": m.group("process"),
            "pid": m.group("pid"),
        },
    }


def parse_nginx_access(line: str) -> Optional[dict]:
    m = NGINX_ACCESS.match(line)
    if not m:
        return None
    status = int(m.group("status"))
    level = "ERROR" if status >= 500 else "WARN" if status >= 400 else "INFO"
    return {
        "source": "nginx",
        "level": level,
        "message": f'{m.group("method")} {m.group("path")} → HTTP {status}',
        "source_ip": m.group("ip"),
        "parsed_fields": {
            "method": m.group("method"),
            "path": m.group("path"),
            "status": status,
            "bytes": m.group("bytes"),
        },
    }


def parse_nginx_error(line: str) -> Optional[dict]:
    m = NGINX_ERROR.match(line)
    if not m:
        return None
    return {
        "source": "nginx",
        "level": m.group("level").upper(),
        "message": m.group("message"),
        "source_ip": (extract_ips(m.group("message")) or [None])[0],
        "parsed_fields": {"pid": m.group("pid")},
    }


def parse_auth_log(line: str) -> Optional[dict]:
    m = AUTH_LOG.search(line)
    if not m:
        return None
    result = m.group("result")
    return {
        "source": "auth",
        "level": "WARN" if result == "Failed" else "INFO",
        "message": f'{result} {m.group("method")} for user {m.group("user")} from {m.group("ip")}',
        "source_ip": m.group("ip"),
        "parsed_fields": {
            "result": result,
            "method": m.group("method"),
            "user": m.group("user"),
            "port": m.group("port"),
        },
    }


def parse_generic(line: str, source: str = "generic") -> dict:
    ips = extract_ips(line)
    return {
        "source": source,
        "level": detect_level(line),
        "message": line[:2048],
        "source_ip": ips[0] if ips else None,
        "parsed_fields": {"ips_found": ips},
    }


PARSERS = [parse_auth_log, parse_nginx_access, parse_nginx_error, parse_syslog]


def parse_log_line(raw: str, hint_source: str = "") -> dict:
    """
    Try each parser in order; fall back to generic.
    Returns a structured dict ready for LogEntry creation.
    """
    for parser in PARSERS:
        result = parser(raw)
        if result:
            return result
    return parse_generic(raw, source=hint_source or "unknown")
