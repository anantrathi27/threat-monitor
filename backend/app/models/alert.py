from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Enum, ForeignKey
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100), nullable=False, index=True)
    level = Column(String(20), default="INFO")
    message = Column(Text, nullable=False)
    raw_line = Column(Text, nullable=True)
    source_ip = Column(String(45), index=True, nullable=True)
    parsed_fields = Column(Text, nullable=True)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AlertSeverity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False)
    threat_id = Column(Integer, ForeignKey("threat_events.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    notification_channels = Column(Text, nullable=True)  # JSON list
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
