# LumiCore x OpenClaw (Preparation Agent) - Setup Notes

This README explains what was configured so the **Preparation** agent can call your MySQL-backed tools through MCP and return real results.

## Goal

Enable the `preparation` OpenClaw agent to:

1. call business tools (volume, shipments, image tools),
2. execute MySQL queries through those tools,
3. return the tool result back to the user (Telegram/OpenClaw chat).

## Main Folders and Their Roles

- `tools/`  
  Business tools exposed to MCP (`list_recent_shipments`, `volume_de_preparation_*`, etc.).

- `db/`  
  MySQL access layer used by tools (`db/mysql.js`).

- `agents/`  
  Documentation for your agent split (`preparation`, `reception`, `expedition`).

- `config/`  
  Local `mcporter` project config (`config/mcporter.json`) with MCP server entries.

- `C:\Users\hp\.openclaw\workspace-preparation\`  
  Preparation agent prompt/context files used at runtime (`AGENTS.md`, `TOOLS.md`, etc.).

- `C:\Users\hp\.openclaw\agents\preparation\agent\openclaw.json`  
  Per-agent OpenClaw config for the preparation agent.

- `C:\Users\hp\.mcporter\mcporter.json`  
  Global mcporter config (important so `lumicore` is visible from any working directory).

## Files Updated and Why

### 1) MCP/Tool Server Files

- `mcp-server.js`
  - Added explicit `.env` loading using absolute path from file location.
  - Reason: when launched from another CWD, DB env vars still load correctly.

- `index.js`
  - Same `.env` absolute loading fix for HTTP mode.

### 2) Tool Definitions

Several files in `tools/` were adjusted to use valid Zod object schemas (instead of plain JS objects) for `inputSchema`.

Examples:
- `tools/get-current-date.tool.js`
- `tools/list-recent-shipments.tool.js`
- `tools/volume-preparation*.tool.js`
- `tools/reception/hello-reception-agent.tool.js`
- `tools/expedition/hello-expedition-agent.tool.js`

Reason: MCP registration/runtime expects proper schema objects; invalid schemas can cause tools to be available in prompt but fail on call.

### 3) Preparation Agent Runtime Instructions

- `C:\Users\hp\.openclaw\workspace-preparation\TOOLS.md`
- `C:\Users\hp\.openclaw\workspace-preparation\AGENTS.md`

Updated to instruct the agent to call tools with the correct mcporter syntax:

- `mcporter call lumicore.get_current_date`
- `mcporter call lumicore.list_recent_shipments limit=8`
- `mcporter call lumicore.volume_de_preparation_en_carton date=YYYY-MM-DD site=FCY_0`
- etc.

Reason: previous calls used wrong syntax or unknown server names.

### 4) OpenClaw Agent Config (Preparation)

- `C:\Users\hp\.openclaw\agents\preparation\agent\openclaw.json`
  - Added/normalized MCP settings (`transport: "stdio"`, `cwd`, MySQL env names).

Reason: ensure preparation agent can spawn and use MCP tooling correctly.

### 5) mcporter Configuration

- Project config: `config/mcporter.json`
  - Added MCP server alias `lumicore` -> `node C:\Users\hp\Downloads\test2\mcp-server.js`.

- Global config: `C:\Users\hp\.mcporter\mcporter.json`
  - Added the same `lumicore` server globally.

Reason: subagents may run in other directories; global config prevents `Unknown MCP server 'lumicore'`.

## Commands Used for Verification

- Direct MCP call checks:
  - `mcporter call lumicore.get_current_date --output json`
  - `mcporter call lumicore.list_recent_shipments limit=3 --output json`

- Preparation agent runtime test:
  - `openclaw agent --agent preparation -m "donne-moi les dernières expéditions" --json --verbose on`

Observed successful subagent execution with:
- `mcporter call lumicore.list_recent_shipments limit=8`
- Returned real rows and stats from MySQL.

## Startup

From project folder:

- `start.bat`

This launches:
- MCP server process (`mcp-server.js`)
- OpenClaw gateway

## Current Status (Preparation Agent)

Preparation pipeline is now operational:

- MCP server reachable (`lumicore`)
- MySQL-backed tools callable
- Agent can return actual shipment data

---

When you confirm stable behavior in Telegram, we can apply the same pattern to `reception` and `expedition`.
