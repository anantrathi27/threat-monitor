import re
import html
from typing import Any


# Strip ANSI escape codes
ANSI_ESCAPE = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

# Dangerous log injection patterns
LOG_INJECTION = re.compile(r'[\r\n\x00\x08\x0B\x0C\x1B]')

# Basic IP validation
IP_PATTERN = re.compile(
    r'^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
)

# Domain validation
DOMAIN_PATTERN = re.compile(
    r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
)


def sanitize_log_line(line: str, max_length: int = 4096) -> str:
    """Remove dangerous characters from log lines before storage."""
    if not isinstance(line, str):
        line = str(line)
    line = ANSI_ESCAPE.sub('', line)
    line = LOG_INJECTION.sub(' ', line)
    line = html.escape(line)
    return line[:max_length]


def sanitize_string(value: str, max_length: int = 512) -> str:
    """General string sanitization for user input."""
    value = value.strip()
    value = LOG_INJECTION.sub('', value)
    return value[:max_length]


def validate_ip(ip: str) -> bool:
    return bool(IP_PATTERN.match(ip))


def validate_domain(domain: str) -> bool:
    return bool(DOMAIN_PATTERN.match(domain))


def sanitize_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Recursively sanitize all string values in a dict."""
    result = {}
    for k, v in data.items():
        if isinstance(v, str):
            result[k] = sanitize_string(v)
        elif isinstance(v, dict):
            result[k] = sanitize_dict(v)
        elif isinstance(v, list):
            result[k] = [sanitize_string(i) if isinstance(i, str) else i for i in v]
        else:
            result[k] = v
    return result
