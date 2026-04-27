# Long-Term Memory

- User wants the project focus to stay on Telegram bot agents, agent workflows, and tools rather than browser dashboard UI.
- When cleaning the workspace, remove UI/dashboard launch paths and docs that pull the project away from the Telegram-bot direction.
- For homepage work, the user wants the provided archive/design implemented as-is when possible, with unnecessary custom frontend files removed afterward.
- For the `test2` homepage, the user wanted an English landing page with a video hero background and the downloaded Lumiere logo used in the layout.
- For the `test2` homepage, the user prefers Lumiere Logistique to be introduced first, with Lumicore x OpenClaw presented as the personalized multi-agent AI layer beneath it.
- For the `test2` homepage, the Lumicore/OpenClaw section should use a compact inserted card image inside the dashboard block, not a full-width banner replacement.
- For `test2`, the homepage now includes footer links to dedicated `/login` and `/register` auth pages that share the same theme and use `lumicore-openclaw.png`.
- For `test2`, registration writes to the MySQL-backed `users` table with the schema `first_name`, `last_name`, `email`, `password_hash`, `role`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`.
- For `test2`, login blocks accounts until an admin approves them in the database, and the verified approval behavior is `403` while the account is still pending and `200` after `status` is changed to `approved`.
- For `test2`, `approved_by` is a foreign key to `users.id`, so approval should use a real user id or simply rely on `status` and `approved_at`.
