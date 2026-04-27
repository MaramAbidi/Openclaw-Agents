# Test2 Integration

The preparation agent should use the real MySQL access layer from the `test2` workspace when it needs the canonical connection pattern or schema behavior.

The mcporter server name is `lumicore`. `test2` is the source workspace, not the MCP server name.

## Source of truth

- `C:\Users\hp\.openclaw\workspace\test2\db\mysql.js`
- `C:\Users\hp\.openclaw\workspace\test2\package.json`

## What to reuse

- `mysql2/promise` pool settings
- environment variable names:
  - `MYSQL_HOST`
  - `MYSQL_PORT`
  - `MYSQL_USER`
  - `MYSQL_PASSWORD`
  - `MYSQL_DATABASE`
- the helper script can auto-load these from:
  - `C:\Users\hp\.openclaw\workspace\test2\.env`
  - or any file passed through `MYSQL_ENV_FILE`

## Helper script

Use `mcporter` against server `lumicore` and tool `execute_sql` to run SQL quickly:

```powershell
preview:
mcporter call lumicore.execute_sql sql="UPDATE shipments SET zonne_prep = 'X' WHERE id = 123;" confirm=false

execute after confirmation:
mcporter call lumicore.execute_sql sql="UPDATE shipments SET zonne_prep = 'X' WHERE id = 123;" confirm=true
```

The assistant must still ask the user for confirmation before any mutating query.
