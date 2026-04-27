# OpenClaw Workflow

This folder is the runtime home for OpenClaw on this machine.
It contains the agent configs, workspaces, memory, credentials, queues, and gateway state that make the assistants receive messages, think, and reply.

## High-Level Flow

1. A message arrives from a channel such as Telegram or webchat.
2. OpenClaw matches that message against `openclaw.json`.
3. The matching agent workspace is loaded.
4. The agent reads its startup files and local memory.
5. If needed, the agent calls a skill or a tool through MCP.
6. The tool returns structured data.
7. The agent formats a reply.
8. The reply is delivered back through the same channel.

If delivery fails, OpenClaw keeps the failed payload in the delivery queue for troubleshooting.

## Core Files

### `openclaw.json`

This is the main router.

It defines:

- the agent list
- the workspace path for each agent
- the agent directory for each agent
- channel bindings
- Telegram account configuration
- gateway settings
- skill and tool platform settings

This file decides which agent receives which channel message.

### `agents/<agent>/agent/openclaw.json`

This is the per-agent runtime MCP config.

It points the agent to the MCP server it should use, usually `lumicore`, with the right workspace and environment variables.

### `workspace-*/`

Each workspace is the human-readable context for one agent.

It usually contains:

- `AGENTS.md`
- `SOUL.md`
- `USER.md`
- `TOOLS.md`
- `BOOTSTRAP.md`
- `IDENTITY.md`
- `HEARTBEAT.md`
- `memory/`

These files define the agent role, user profile, tool routing, startup behavior, and continuity notes.

### `memory/`

This stores short and long-term notes.

- daily notes live in dated files
- durable memory lives in `MEMORY.md` when used by the main workspace

### `credentials/`

This stores channel and platform credentials.

Examples include:

- Telegram allow lists
- WhatsApp device data
- auth tokens

Secrets stay here and are not part of the public workflow logic.

### `telegram/`

This stores Telegram update offsets.

Each account keeps track of the last processed update so OpenClaw does not re-read old messages.

### `delivery-queue/`

This is the outgoing message queue.

When an agent produces a reply, OpenClaw hands it to the delivery layer. If delivery fails, the failed payload can stay here for inspection.

### `sessions/` under each agent

This stores agent session state.

It helps OpenClaw remember the live conversation context, session ids, and compacted history between turns.

### `logs/`

This stores operational logs and config health checks.

It is useful when something in routing or delivery is broken.

### `flows/`, `subagents/`, `tasks/`, `browser/`, `canvas/`

These folders support the broader OpenClaw runtime:

- `flows/` for flow state
- `subagents/` for delegated agent runs
- `tasks/` for task tracking state
- `browser/` for browser session data
- `canvas/` for canvas-related runtime data

## How An Agent Receives A Message

The receive path is mostly configuration-driven.

1. The channel event enters OpenClaw.
2. `openclaw.json` matches the event to an agent id.
3. OpenClaw loads that agent’s workspace.
4. The agent reads the startup chain:
   - `SOUL.md`
   - `USER.md`
   - `TOOLS.md`
   - optional `BOOTSTRAP.md`
   - recent `memory/` files
5. The agent decides whether the user needs a direct answer or a tool-backed answer.

If the user asks for logistics data, the agent should use the documented tool path instead of guessing.

## How An Agent Responds

The response flow is:

1. The agent writes the answer text.
2. If the answer depends on live data, the agent calls the right tool or skill.
3. The tool returns structured JSON or a plain result.
4. The agent turns that result into a user-facing response.
5. OpenClaw delivers the response through the channel binding.

For WhatsApp and Telegram, the response must stay short, practical, and channel-safe.

## How Tools Fit In

Tools are not hardcoded into the conversation.
They are declared in the workspace instructions and implemented in the MCP backend.

The normal path is:

1. The workspace `TOOLS.md` tells the agent which tool to use.
2. The agent calls MCP through `mcporter` or the local bridge.
3. The MCP server runs the actual database or utility logic.
4. The tool returns structured output.
5. The agent relays the result to the user.

For LumiCore logistics, the important pattern is:

- use `get_current_date` for relative dates
- map site names to the correct code before tool calls
- never invent quantities
- always use the matching tool for the question

## Channel Routing

The current setup uses separate agents for different operational areas.

- `preparation` for preparation and KPI workflows
- `test` for validating new tools
- `transport` for transport and dispatch work
- `main` for general OpenClaw behavior

Routing happens in `openclaw.json`.

If you add a new agent later, you need to update:

- `openclaw.json`
- the agent directory in `agents/<name>/agent/`
- the workspace folder in `workspace-<name>/`
- any channel bindings or Telegram account entries

## Startup Order

The usual startup order for an agent workspace is:

1. Read the agent role from `SOUL.md`.
2. Read who the user is from `USER.md`.
3. Read the tool rules from `TOOLS.md`.
4. Read any bootstrap prompt if it exists.
5. Read recent memory files.
6. Start handling messages.

## Failure Handling

When something fails, OpenClaw usually leaves evidence in one of these places:

- `logs/`
- `delivery-queue/failed/`
- `telegram/update-offset-*.json`
- the agent session files
- the agent workspace memory files

That is where to look first when a message is not answered correctly or a tool call does not behave as expected.

## Practical Rule

If you want to understand a specific agent, read these files in that agent’s workspace:

- `SOUL.md`
- `USER.md`
- `TOOLS.md`
- `AGENTS.md`
- `BOOTSTRAP.md` if it exists

That is usually enough to understand how the agent thinks, what it answers, and what tool it should call.
