import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class PasswordReset(Base):
    """
    Password reset token and OTP storage model.
    Fields:
      - id: UUID Primary Key
      - user_id: Reference to users table
      - email: User's email address
      - token: Secure URL-safe token for direct reset link
      - otp: 6-digit numeric verification code
      - expires_at: Expiration timestamp (typically 15 minutes)
      - is_used: Flag indicating if the reset has already been redeemed
      - created_at: Creation timestamp
    """
    __tablename__ = "password_resets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(255), unique=True, index=True, nullable=True)
    otp = Column(String(10), nullable=True, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=True)
    otp_hash = Column(String(64), nullable=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_used = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")

    def __repr__(self) -> str:
        return f"<PasswordReset id={self.id} email={self.email} is_used={self.is_used}>"
