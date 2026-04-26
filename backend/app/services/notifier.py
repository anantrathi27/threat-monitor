"""
Notifier — dispatches alerts via email (SMTP), Slack webhook, and generic webhooks.
"""
from __future__ import annotations

import json
import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings


# ── Email ──────────────────────────────────────────────────────
async def send_email(to: str, subject: str, body: str) -> bool:
    if not all([settings.SMTP_USER, settings.SMTP_PASSWORD]):
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USER
        msg["To"] = to
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to, msg.as_string())
        return True
    except Exception as e:
        print(f"[Notifier] Email failed: {e}")
        return False


async def send_threat_email(to: str, threat: dict) -> bool:
    subject = f"[CyberShield] {threat['severity'].upper()} Threat: {threat['title']}"
    body = f"""
    <html><body style="font-family:monospace;background:#060a0f;color:#e8f0f8;padding:20px">
      <h2 style="color:#ff3b4e">🛡️ CyberShield Threat Alert</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;color:#7a9ab8">Title</td><td style="padding:8px">{threat['title']}</td></tr>
        <tr><td style="padding:8px;color:#7a9ab8">Severity</td><td style="padding:8px;color:#ff3b4e">{threat['severity'].upper()}</td></tr>
        <tr><td style="padding:8px;color:#7a9ab8">Category</td><td style="padding:8px">{threat.get('category','')}</td></tr>
        <tr><td style="padding:8px;color:#7a9ab8">Source IP</td><td style="padding:8px;color:#00d4ff">{threat.get('source_ip','—')}</td></tr>
        <tr><td style="padding:8px;color:#7a9ab8">Risk Score</td><td style="padding:8px">{threat.get('score',0)}/10</td></tr>
      </table>
      <p style="margin-top:20px;color:#4a6a88">CyberShield Threat Monitoring Platform</p>
    </body></html>
    """
    return await send_email(to, subject, body)


# ── Slack ──────────────────────────────────────────────────────
async def send_slack(message: str, threat: Optional[dict] = None) -> bool:
    if not settings.SLACK_WEBHOOK_URL:
        return False
    severity_colors = {
        "critical": "#ff2040", "high": "#ff6b00",
        "medium": "#ffb800", "low": "#00c8ff",
    }
    payload: dict = {"text": message}
    if threat:
        payload = {
            "attachments": [{
                "color": severity_colors.get(threat.get("severity", "low"), "#888"),
                "title": f"🛡️ {threat['title']}",
                "fields": [
                    {"title": "Severity", "value": threat.get("severity", "").upper(), "short": True},
                    {"title": "Category", "value": threat.get("category", "").replace("_", " "), "short": True},
                    {"title": "Source IP", "value": threat.get("source_ip", "—"), "short": True},
                    {"title": "Risk Score", "value": f"{threat.get('score', 0)}/10", "short": True},
                ],
                "footer": "CyberShield SOC Platform",
            }]
        }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(settings.SLACK_WEBHOOK_URL, json=payload)
            return resp.status_code == 200
    except Exception as e:
        print(f"[Notifier] Slack failed: {e}")
        return False


# ── Generic Webhook ────────────────────────────────────────────
async def send_webhook(url: str, payload: dict) -> bool:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            return resp.status_code < 300
    except Exception as e:
        print(f"[Notifier] Webhook failed: {e}")
        return False


# ── Dispatch ───────────────────────────────────────────────────
async def dispatch_alert(threat: dict, channels: list[str] = None) -> dict[str, bool]:
    """Send alert across all configured channels. Returns per-channel success."""
    channels = channels or ["slack"]
    results: dict[str, bool] = {}
    if "slack" in channels:
        results["slack"] = await send_slack(f"New threat detected: {threat['title']}", threat)
    if "email" in channels and settings.SMTP_USER:
        results["email"] = await send_threat_email(settings.SMTP_USER, threat)
    return results
