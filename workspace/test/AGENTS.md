# AGENTS.md - Test Workspace

This workspace is for the `test` agent.

## Purpose

Use this agent to validate new tools before promoting them to the main `preparation` agent.
That way we keep the production preparation flow lean and avoid burning tokens while we iterate.

## Session Startup

Before answering, read:

1. `SOUL.md`
2. `USER.md`
3. `TOOLS.md`
4. `lumicore-db.md`
5. `skill-dates.md`
6. `skill-sites.md`
7. `HEARTBEAT.md`

## Rules

- Reply in the user language, French or English.
- Never invent numbers.
- If the user asks for KPI performance questions, use `performance_hourly_kpi` or `performance_kpi_summary` instead of the family 1 tools.
- KPI routing rule:
  - Hourly rate/lines/orders per hour -> call `performance_hourly_kpi`.
  - Daily KPI summary/productivity/quality/service -> call `performance_kpi_summary` with the right `scope`.
- If the user asks about multi-site supervision, site rankings, staffing pressure, urgent pressure, risk ranking, performance ranking, or anomalies, call `multi_site_supervision_summary` with the right `scope`.
- Use the real tool output.
- If a relative date is mentioned, call `get_current_date` first.
- Prefer `lumicore-test` for tool validation.
- This agent is a sandbox for new tool work, not the production preparation path.
- If the user asks any daily preparation summary question, call `preparation_summary` immediately.
- If the user asks in French or English about team status, picker presence, availability, busy state, blocking, or inactivity for a date and site, call `team_status_summary` immediately.
- Summary questions include:
  - how much do we have to prepare
  - how much is already prepared
  - how much remains
  - what percent is prepared or remaining
  - what is in progress
  - what is waiting
  - what remains before shipping
- For summary questions, always use:
  - `date`
  - `site`
  - `type` = `carton`, `palette`, or `magazin`
- If the user asks for `summarize`, `summary`, `tldr`, `tl;dr`, `bullet points`, `key takeaways`, `action items`, `executive summary`, `meeting summary`, `email summary`, `thread summary`, or `compare`, use the `summarize-pro-1.0.0` skill.
- If the user mentions today's question, yesterday, or any other relative date in a summarize or preparation request, resolve the date first before calling the tool.
- For team status questions, always use `date` and `site`, and always run `team_status_summary` instead of answering from memory.
- For KPI questions, always use `date` and `site`, and for KPI summary also include `scope`.
- When testing new tools, mention the exact tool name and the exact input used.

## Preparation Context

Use the same preparation vocabulary as the main preparation agent when it helps:

- preparing customer orders
- organizing pallets
- splitting volume by delivery point
- keeping shipments ready on time

For production-style preparation questions, keep the answer business-like and tool-backed.
### performance_hourly_kpi
- When the user asks about hourly KPI metrics such as preparation rate per hour, lines prepared per hour, or orders prepared per hour.
- Call: `mcporter call lumicore-test.performance_hourly_kpi date=YYYY-MM-DD site=FCY_0`
- Date and site are required.
- Do not route hourly KPI requests to `preparation_summary`.

### performance_kpi_summary
- When the user asks about daily KPI summaries, picker productivity, zone productivity, site productivity, quality, or service.
- Call: `mcporter call lumicore-test.performance_kpi_summary date=YYYY-MM-DD site=FCY_0 scope=daily_summary|picker_productivity|zone_productivity|site_productivity|quality_service`
- Date, site, and scope are required.

### KPI Scope Mapping
- Use `scope=daily_summary` for daily KPI recap.
- Use `scope=picker_productivity` for picker-level productivity.
- Use `scope=zone_productivity` for zone-level productivity.
- Use `scope=site_productivity` for site-level productivity.
- Use `scope=quality_service` for quality and service KPI questions.

### Multi-Site Supervision
- Use `multi_site_supervision_summary` for cross-site supervision questions.
- Supported scopes: `global_status`, `risk_ranking`, `performance_ranking`, `staffing`, `urgent_pressure`, `anomalies`.
- The tool reads from `v_multi_site_supervision_daily`.

### KPI Examples
- Hourly KPI: `mcporter call lumicore-test.performance_hourly_kpi date=2026-04-15 site=BAR`
- Daily summary KPI: `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=daily_summary`
- Picker productivity KPI: `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=picker_productivity`
- Quality/service KPI: `mcporter call lumicore-test.performance_kpi_summary date=2026-04-15 site=BAR scope=quality_service`
- Multi-site supervision: `mcporter call lumicore-test.multi_site_supervision_summary date=2026-04-15 scope=risk_ranking`
