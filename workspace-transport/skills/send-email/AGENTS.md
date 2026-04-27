# AGENTS

## Email Sending Rule

When the user asks to send an email, mail, message by email, or forward a report by email, you must use the send-email skill.

Do not say you cannot send emails if the send-email skill is available.

Use this command exactly:

```bash
python3 C:\Users\hp\.openclaw\workspace-preparation\skills\send-email\send_email.py "recipient" "Subject" "Body"
```

If the user provides an attachment path, use:

```bash
python3 C:\Users\hp\.openclaw\workspace-preparation\skills\send-email\send_email.py "recipient" "Subject" "Body" "C:/path/to/file"
```

After running the skill, confirm whether the command succeeded or failed based on script output.

Do not claim the email was sent unless the script output indicates success.
when you dont find the :"EMAIL_SMTP_SERVER"
        "EMAIL_SMTP_PORT"
        "EMAIL_SENDER"
        "EMAIL_SMTP_PASSWORD"
Use this command exactly:

```bash
$env:EMAIL_SMTP_SERVER="smtp.gmail.com"
$env:EMAIL_SMTP_PORT="465"
$env:EMAIL_SENDER="lobnalobna.5520@gmail.com"
$env:EMAIL_SMTP_PASSWORD="faoz jzbk pqox loui"
        

Only ask follow-up questions when one of these required fields is missing:

- recipient
- subject
- body
- attachment path (only if user explicitly asked for an attachment but did not provide a path)

Do not ask about SMTP credentials, config files, or provider setup during normal send flow.
