# TOOLS.md - Test Workspace

This workspace is for testing and validating new LumiCore tools.
Use it to exercise the new tool flow without loading the main preparation workspace.

## MCP Server

- Preferred server for tests: `lumicore-test`
- Shared server alias: `lumicore`

## Current Tools

| Tool | Use | Example |
|---|---|---|
| `get_current_date` | Resolve today/yesterday before using a relative date | `mcporter call lumicore-test.get_current_date` |
| `preparation_summary` | Daily family 1 summary for carton, palette, or magazin | `mcporter call lumicore-test.preparation_summary date=2026-04-15 site=BAR type=carton` |
| `team_status_summary` | Daily team status for picker presence, availability, busy, blocked, or inactive state | `mcporter call lumicore-test.team_status_summary date=2026-04-15 site=BAR` |
| `performance_hourly_kpi` | Hourly KPI metrics (rate/hour, lines/hour, orders/hour) | `mcporter call lumicore-test.performance_hourly_kpi date=2026-04-15 site=BAR` |
| `performance_kpi_summary` | Daily KPI summaries for productivity, quality, and service by scope | `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=daily_summary` |
| `multi_site_supervision_summary` | Multi-site supervision for date + scope | `mcporter call lumicore-test.multi_site_supervision_summary date=2026-04-15 scope=global_status` |
| `execute_sql` | Ad hoc SQL checks during tool debugging | `mcporter call lumicore-test.execute_sql sql="SELECT 1;" confirm=false` |

## Added Skills

| Skill | Use | Trigger examples |
|---|---|---|
| `summarize-pro-1.0.0` | Summaries, TL;DRs, key takeaways, action items, comparisons, and short business recaps | `summarize`, `summary`, `tldr`, `bullet points`, `key takeaways`, `action items`, `executive summary`, `meeting summary`, `compare` |

## Test Workflow

1. If the user says today/yesterday, call `get_current_date` first.
2. Map the site code before calling a summary tool.
3. Call `preparation_summary` with `date`, `site`, and `type`.
4. Return the structured result exactly as the tool gives it.
5. If the user is asking for a summary or TL;DR instead of preparation data, route to `summarize-pro-1.0.0`.
6. If the user is asking in French or English about team status for a date and site, route to `team_status_summary`.
7. If the user asks hourly KPI metrics, route to `performance_hourly_kpi`.
8. If the user asks daily KPI/productivity/quality/service, route to `performance_kpi_summary` with the right `scope`.
9. If the user asks for multi-site supervision, ranking, staffing pressure, urgent pressure, or anomalies, route to `multi_site_supervision_summary` with the right `scope`.

## Hard Routing Rule

If the user asks for any of these, do not answer from memory:

- how much do we have to prepare today
- how much is already prepared today
- how much remains to prepare today
- what percent is already prepared today
- what percent remains today
- how much is in progress
- how much is waiting
- how much remains before shipping

Instead, call `preparation_summary` through `mcporter`.

Examples:

- `mcporter call lumicore-test.preparation_summary date=2026-04-15 site=BAR type=carton`
- `mcporter call lumicore-test.preparation_summary date=2026-04-15 site=BAR type=palette`
- `mcporter call lumicore-test.preparation_summary date=2026-04-15 site=BAR type=magazin`

If the date is relative, call `mcporter call lumicore-test.get_current_date` first, then use the returned absolute date.

## KPI Routing Rule

If the user asks KPI performance questions, do not answer from memory.

- Hourly KPI intent (rate/hour, lines/hour, orders/hour):
	- Call `mcporter call lumicore-test.performance_hourly_kpi date=YYYY-MM-DD site=FCY_0`
- Daily KPI intent (summary, picker productivity, zone productivity, site productivity, quality, service):
	- Call `mcporter call lumicore-test.performance_kpi_summary date=YYYY-MM-DD site=FCY_0 scope=...`

## Multi-Site Supervision

Use `multi_site_supervision_summary` for cross-site supervision questions.

Supported scopes:

- `global_status`
- `risk_ranking`
- `performance_ranking`
- `staffing`
- `urgent_pressure`
- `anomalies`

The tool reads from `v_multi_site_supervision_daily`.

Scope mapping:

- `daily_summary`
- `picker_productivity`
- `zone_productivity`
- `site_productivity`
- `quality_service`

Examples:

- `mcporter call lumicore-test.performance_hourly_kpi date=2026-04-15 site=BAR`
- `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=daily_summary`
- `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=picker_productivity`
- `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=zone_productivity`
- `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=site_productivity`
- `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=quality_service`
- `mcporter call lumicore-test.multi_site_supervision_summary date=2026-04-15 scope=risk_ranking`

## Summary Family

The first business family is the daily preparation summary.

Supported types:

- `carton`
- `palette`
- `magazin`

The tool reads from `v_preparation_summary_family1` and returns:

- `to_prepare`
- `prepared`
- `remaining`
- `prepared_percent`
- `remaining_percent`
- `in_progress`
- `waiting`
- `last_update`

## Team Status

Use `team_status_summary` for picker presence and availability questions in French or English.

Supported outputs:

- `present_count`
- `absent_count`
- `available_pickers`
- `busy_pickers`
- `blocked_pickers`
- `inactive_pickers`

## Summarize Routing

If the user asks to summarize content, do not answer from memory. Use `summarize-pro-1.0.0` and keep the output compact and faithful to the source text.

## Site Mapping

Always convert the site name to the `fcy_0` code first:

- Bouargoub -> `BAR`
- Bareket el Sehel -> `BKS`
- Sahline -> `SAL`
- Gabes -> `GAB`
- Sfax -> `SFX`
- Tunis -> `TUN`

## Response Style

- Be concise and business-like.
- Never estimate or invent values.
- For multi-site supervision questions, always use `date` and `scope`, and do not invent a site.
- When testing a new tool, mention the exact input used and the tool result.
- If a tool fails, explain the error clearly.
- Do not say a database table is missing unless the tool actually returned that exact error.
