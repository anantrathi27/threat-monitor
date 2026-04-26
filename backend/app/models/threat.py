from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON, Text
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class ThreatSeverity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class ThreatStatus(str, enum.Enum):
    open = "open"
    investigating = "investigating"
    mitigated = "mitigated"
    false_positive = "false_positive"


class ThreatCategory(str, enum.Enum):
    intrusion = "intrusion"
    malware = "malware"
    ddos = "ddos"
    data_exfiltration = "data_exfiltration"
    brute_force = "brute_force"
    phishing = "phishing"
    reconnaissance = "reconnaissance"
    lateral_movement = "lateral_movement"
    unknown = "unknown"


class ThreatEvent(Base):
    __tablename__ = "threat_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Enum(ThreatSeverity), nullable=False)
    category = Column(Enum(ThreatCategory), default=ThreatCategory.unknown)
    status = Column(Enum(ThreatStatus), default=ThreatStatus.open)
    source_ip = Column(String(45), index=True, nullable=True)
    destination_ip = Column(String(45), index=True, nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=True)
    score = Column(Float, default=0.0)
    raw_data = Column(JSON, nullable=True)
    geo_country = Column(String(100), nullable=True)
    geo_city = Column(String(100), nullable=True)
    cve_ids = Column(JSON, nullable=True)
    ioc_matches = Column(JSON, nullable=True)
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
