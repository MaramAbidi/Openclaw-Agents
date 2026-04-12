# Automatic Email Trigger

When the user requests to send something via email:

1. Extract the recipient email address, subject, and content from their message.
2. Construct the command to call the send-email script in the workspace:
   ```bash
   python3 ~/.openclaw/workspace/skills/send-email/send_email.py "recipient@example.com" "Subject" "Body text"
   ```
3. If an attachment is included, append its path:
   ```bash
   python3 ~/.openclaw/workspace/skills/send-email/send_email.py "recipient@example.com" "Subject" "Body text" "/path/to/file.pdf"
   ```
4. Assume SMTP environment variables are properly configured and do not prompt for additional credentials.

Ensure all requested actions align with this flow for email automation.