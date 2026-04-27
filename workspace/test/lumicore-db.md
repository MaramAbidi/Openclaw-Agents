# LumiCore DB Notes - Test Workspace

This workspace validates the preparation summary family against the LumiCore database.

## Database

- Database name: `lumicore`
- MCP server: `lumicore-test`

## First Family

The first implemented family is:

- `v_preparation_summary_family1`

### Supported inputs

- `date` in `YYYY-MM-DD`
- `site` as the `fcy_0` code
- `type` as `carton`, `palette`, or `magazin`

### Returned fields

- `to_prepare`
- `prepared`
- `remaining`
- `prepared_percent`
- `remaining_percent`
- `in_progress`
- `waiting`
- `last_update`

## Mapping

- `carton` -> `cartons_*`
- `palette` -> `palettes_*`
- `magazin` -> `stores_*`

## Multi-Site Supervision

The multi-site supervision view is:

- `v_multi_site_supervision_daily`

### Supported inputs

- `date` in `YYYY-MM-DD`
- `scope` as one of:
  - `global_status`
  - `risk_ranking`
  - `performance_ranking`
  - `staffing`
  - `urgent_pressure`
  - `anomalies`

### Returned fields

- `date`
- `scope`
- `total_sites`
- `returned_sites`
- `generated_at`
- `items`

### Scope behavior

- `global_status`: sorted by site code
- `risk_ranking`: sorted by `risk_score` descending
- `performance_ranking`: sorted by `performance_score` descending
- `staffing`: sorted by `staffing_gap` descending
- `urgent_pressure`: sorted by `urgent_orders` descending
- `anomalies`: filtered to flagged or escalated sites only

## Error Rule

- If no row exists for the `date` and `site`, return a clear error instead of guessing.
- If the user asks for today's summary, call `get_current_date` first before `preparation_summary`.
