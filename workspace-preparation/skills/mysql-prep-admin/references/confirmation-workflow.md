# Confirmation Workflow

Use this workflow any time a user asks for a MySQL change on preparation data.

## 1. Understand the request

- Identify the table, row, and field involved.
- If anything is missing, ask one short clarification question.
- Do not guess values or keys.

## 2. Prepare the SQL

- Draft the exact statement.
- Prefer the narrowest possible `WHERE` clause.
- If the request can touch more than one row, say so explicitly.

## 3. Ask for confirmation

Show:

- the target change
- the SQL to be executed
- the risk level if multiple rows may be affected

Wait for an explicit confirmation before executing.

## 4. Execute only after confirmation

- Run the approved SQL with the configured `mysql.exe` client.
- Do not add extra changes while executing.
- If the user revises the request, stop and reconfirm.

## 5. Report back

- state whether the query succeeded
- include rows affected when available
- surface any database error clearly
