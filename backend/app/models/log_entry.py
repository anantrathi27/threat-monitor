from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
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
