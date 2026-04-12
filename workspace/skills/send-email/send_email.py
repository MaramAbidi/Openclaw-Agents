#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Send Email skill for OpenClaw.
Supports command-line arguments and environment-variable configuration.
"""

import os
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr


# Configuration - read only from environment variables, no defaults.
SMTP_SERVER = os.getenv("EMAIL_SMTP_SERVER")
_port = os.getenv("EMAIL_SMTP_PORT")
SMTP_PORT = int(_port) if _port else None
SENDER_EMAIL = os.getenv("EMAIL_SENDER")
AUTHORIZATION_CODE = os.getenv("EMAIL_SMTP_PASSWORD")
USE_TLS = (os.getenv("EMAIL_USE_TLS") or "false").lower() == "true"


def send_email(to_email, subject, content, attachment_path=None):
    """Send an email."""
    if not all([SMTP_SERVER, SMTP_PORT, SENDER_EMAIL, AUTHORIZATION_CODE]):
        print(
            "ERROR: Please configure EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT, "
            "EMAIL_SENDER, and EMAIL_SMTP_PASSWORD in ~/.openclaw/openclaw.json "
            "under skills.entries.send-email.env."
        )
        return False

    try:
        msg = MIMEMultipart()
        msg.attach(MIMEText(content, "plain", "utf-8"))

        if attachment_path and os.path.exists(attachment_path):
            from email import encoders
            from email.mime.base import MIMEBase

            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="{os.path.basename(attachment_path)}"',
                )
                msg.attach(part)

        msg["From"] = formataddr(["OpenClaw", SENDER_EMAIL])
        msg["To"] = to_email
        msg["Subject"] = subject

        if USE_TLS:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)

        server.login(SENDER_EMAIL, AUTHORIZATION_CODE)
        server.sendmail(SENDER_EMAIL, [to_email], msg.as_string())
        server.quit()

        print(f"SUCCESS: Email sent to: {to_email}")
        if attachment_path:
            print(f"Attachment: {os.path.basename(attachment_path)}")
        return True

    except Exception as e:
        print(f"ERROR: Send failed: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: send_email.py <recipient> <subject> <body> [attachment_path]")
        print("\nEnvironment variables:")
        print("  EMAIL_SMTP_SERVER     SMTP server (required)")
        print("  EMAIL_SMTP_PORT       SMTP port (required)")
        print("  EMAIL_SENDER          Sender email (required)")
        print("  EMAIL_SMTP_PASSWORD   SMTP password/app password (required)")
        print("  EMAIL_USE_TLS         true uses TLS, otherwise SSL (optional)")
        sys.exit(1)

    to_email = sys.argv[1]
    subject = sys.argv[2]
    content = sys.argv[3]
    attachment = sys.argv[4] if len(sys.argv) > 4 else None

    success = send_email(to_email, subject, content, attachment)
    sys.exit(0 if success else 1)
