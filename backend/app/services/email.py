import logging
import smtplib
from email.message import EmailMessage
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """
    Dispatch an email via SMTP.
    If SMTP_HOST is not configured, logs the email content to stdout for development.
    """
    from_email = settings.SMTP_FROM_EMAIL or (
        f"noreply@{settings.SMTP_HOST}" if settings.SMTP_HOST else "noreply@accessportal.local"
    )
    from_header = f"{settings.SMTP_FROM_NAME} <{from_email}>"

    # If SMTP is not configured, log to console for development simulation
    if not settings.SMTP_HOST:
        logger.warning(
            "\n" + "=" * 70 + "\n"
            f"[EMAIL SIMULATION - SMTP NOT CONFIGURED]\n"
            f"To: {to_email}\n"
            f"From: {from_header}\n"
            f"Subject: {subject}\n"
            f"Content:\n{text_content or html_content}\n"
            + "=" * 70
        )
        return True

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = from_header
        msg["To"] = to_email

        if text_content:
            msg.set_content(text_content)
            msg.add_alternative(html_content, subtype="html")
        else:
            msg.set_content(html_content, subtype="html")

        if settings.SMTP_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

        logger.info(f"Email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {str(e)}")
        # Output simulation fallback so testing is not blocked
        logger.warning(
            f"[FALLBACK LOG] Email to: {to_email} | Subject: {subject} | Content: {text_content or html_content}"
        )
        return False


def send_password_reset_email(
    to_email: str,
    user_name: str,
    otp: str,
    reset_token: str,
) -> bool:
    """
    Send password reset instructions with both 6-digit OTP and clickable Reset Link.
    """
    reset_link = f"{settings.FRONTEND_URL}/verify-otp?email={to_email}&otp={otp}"
    subject = "Password Reset Request - Access Portal"

    text_body = f"""Hello {user_name},

We received a request to reset your password for your account.

Your 6-digit verification OTP code is:
{otp}

Alternatively, you can click the following link to reset your password directly:
{reset_link}

This code and link will expire in 15 minutes.
If you did not request this password reset, please ignore this email or contact security immediately.

Regards,
{settings.SMTP_FROM_NAME}
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <tr>
      <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f3f4f6;">
        <h2 style="margin: 0; color: #1e3a8a; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Access Portal</h2>
        <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px;">Security & Account Management</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Password Recovery</h3>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
          Hello <strong>{user_name}</strong>,<br>
          We received a request to reset your password. You can use either the 6-digit verification code below or click the reset link.
        </p>

        <!-- OTP Code Box -->
        <div style="margin: 24px 0; padding: 18px; background: #f0fdf4; border: 1px dashed #86efac; border-radius: 8px; text-align: center;">
          <span style="display: block; font-size: 12px; font-weight: 600; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Your One-Time Code (OTP)</span>
          <span style="display: inline-block; font-family: monospace, Consolas, Monaco; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #166534;">{otp}</span>
        </div>

        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563; text-align: center;">
          Or click the button below to set a new password directly in your browser:
        </p>

        <!-- Direct Reset Link Button -->
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="{reset_link}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(37,99,235,0.2);">
            Reset My Password
          </a>
        </div>

        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
          This code and link are valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this message.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
          © 2026 Access Portal. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    return send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_body,
        text_content=text_body,
    )
