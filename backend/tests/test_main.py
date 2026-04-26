"""
Test suite for CyberShield API.
Run: pytest tests/ -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db

TEST_DB = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DB)
TestSession = async_sessionmaker(engine, expire_on_commit=False)


async def override_db():
    async with TestSession() as s:
        yield s


app.dependency_overrides[get_db] = override_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def auth_headers(client):
    await client.post("/api/auth/register", json={
        "email": "test@test.com", "username": "tester", "password": "password123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "test@test.com", "password": "password123"
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Auth Tests ────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/auth/register", json={
        "email": "new@test.com", "username": "newuser", "password": "password123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new@test.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@test.com", "username": "dup", "password": "password123"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/auth/register", json={
        "email": "login@test.com", "username": "loginuser", "password": "password123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@test.com", "password": "password123"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "email": "wrong@test.com", "username": "wrongpw", "password": "password123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrong@test.com", "password": "wrongpassword"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me(client, auth_headers):
    resp = await client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@test.com"


# ── Threat Tests ──────────────────────────────────────────────
@pytest.mark.asyncio
async def test_list_threats_empty(client, auth_headers):
    resp = await client.get("/api/threats", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "operational"


# ── Sanitization Tests ─────────────────────────────────────────
def test_log_sanitization():
    from app.core.sanitize import sanitize_log_line
    dangerous = "normal log\x00\r\ninjected line\x1b[31mred"
    clean = sanitize_log_line(dangerous)
    assert "\x00" not in clean
    assert "\r" not in clean
    assert "\n" not in clean


def test_ip_validation():
    from app.core.sanitize import validate_ip
    assert validate_ip("192.168.1.1") is True
    assert validate_ip("256.0.0.1") is False
    assert validate_ip("not-an-ip") is False


# ── Threat Engine Tests ────────────────────────────────────────
def test_threat_classification():
    from app.services.threat_engine import classify_threat
    assert classify_threat("SSH brute force attack") == "brute_force"
    assert classify_threat("Malware C2 beacon detected") == "malware"
    assert classify_threat("Port scan detected nmap sweep") == "reconnaissance"
    assert classify_threat("Random log entry") == "unknown"


def test_threat_scoring():
    from app.services.threat_engine import compute_score
    score = compute_score("critical", "malware", destination_port=4444)
    assert score > 9.0
    low_score = compute_score("low", "reconnaissance")
    assert low_score < 3.0


# ── Log Parser Tests ──────────────────────────────────────────
def test_parse_auth_log():
    from app.services.log_parser import parse_log_line
    line = "Failed password for invalid user admin from 185.220.101.1 port 54321 ssh2"
    result = parse_log_line(line, "auth")
    assert result["source_ip"] == "185.220.101.1"
    assert result["level"] == "WARN"
