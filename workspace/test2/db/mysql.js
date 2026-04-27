import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

let pool;

export function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number.parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "lumicore",
    waitForConnections: true,
    connectionLimit: Number.parseInt(process.env.MYSQL_POOL_SIZE || "10", 10),
    queueLimit: 0,
  });
  return pool;
}

export function normalizeIsoDate(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const dt = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
}

export async function getRecentShipments({ limit = 8 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 8, 50));
  const [rows] = await getPool().query(
    `
      SELECT
        id,
        shpnum_0,
        credat_date,
        dlvnam_1,
        zonne_prep,
        mysum,
        fcy_0,
        dep_0
      FROM shipments
      ORDER BY credat_0 DESC
      LIMIT ?
    `,
    [safeLimit],
  );

  return Array.isArray(rows) ? rows : [];
}

export async function getPreparationVolumeByDateAndSite({ date, site } = {}) {
  const safeDate = normalizeIsoDate(date);
  const safeSite = typeof site === "string" && site.trim() !== "" ? site.trim() : null;

  if (!safeDate || !safeSite) {
    return {
      totalQty: 0,
      usedDate: safeDate,
      usedSite: safeSite,
    };
  }

  const [rows] = await getPool().execute(
    `
      SELECT SUM(mysum) AS total
      FROM shipments
      WHERE DATE(credat_0) = ?
        AND fcy_0 = ?
    `,
    [safeDate, safeSite],
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    totalQty: Number(row?.total ?? 0),
    usedDate: safeDate,
    usedSite: safeSite,
  };
}

export async function getPreparationPaletteVolumeByDateAndSite() {
  const [rows] = await getPool().execute(
    `
      SELECT COUNT(DISTINCT shpnum_0) AS total
      FROM shipments
    `,
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    totalQty: Number(row?.total ?? 0),
    usedDate: null,
    usedSite: null,
  };
}

export async function getPreparationVolumeByMagazinDistinct() {
  const [rows] = await getPool().execute(
    `
      SELECT COUNT(DISTINCT dlvnam_1) AS total
      FROM shipments
      WHERE COALESCE(TRIM(dlvnam_1), '') <> ''
    `,
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    totalQty: Number(row?.total ?? 0),
  };
}

function formatDateTime(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.replace(" ", "T").replace(/\.\d+Z?$/, "");
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    const seconds = String(value.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  return String(value);
}

function formatDateOnly(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 10);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function formatTimeValue(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(11, 19);
  }

  return String(value);
}

function toNullableNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIntegerOrNull(value) {
  const numeric = toNullableNumber(value);
  return numeric == null ? null : Math.trunc(numeric);
}

function roundNumber(value, digits = 2) {
  const numeric = toNullableNumber(value);
  if (numeric == null) return null;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

async function fetchRows(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return Array.isArray(rows) ? rows : [];
}

export async function queryRows(sql, params = []) {
  return fetchRows(sql, params);
}

export async function queryRow(sql, params = []) {
  const rows = await fetchRows(sql, params);
  return rows[0] ?? null;
}

function normalizeKpiContext({ date, site } = {}) {
  const safeDate = normalizeIsoDate(date);
  const safeSite = typeof site === "string" && site.trim() !== "" ? site.trim() : null;
  if (!safeDate || !safeSite) {
    return { date: null, site: null };
  }
  return { date: safeDate, site: safeSite };
}

function mapHourlyKpiRow(row) {
  return {
    hour: toIntegerOrNull(row?.kpi_hour),
    lines_prepared: Number(row?.lines_prepared_per_hour ?? 0),
    orders_prepared: Number(row?.orders_prepared_per_hour ?? 0),
    cartons_prepared: Number(row?.cartons_prepared_per_hour ?? 0),
    palettes_prepared: Number(row?.palettes_prepared_per_hour ?? 0),
  };
}

function mapPickerProductivityRow(row) {
  return {
    employee_code: row?.employee_code ?? null,
    full_name: row?.full_name ?? null,
    zone_code: row?.zone_code ?? null,
    cartons_prepared: Number(row?.cartons_prepared ?? 0),
    palettes_prepared: Number(row?.palettes_prepared ?? 0),
    completed_lines: Number(row?.completed_lines ?? 0),
    completed_orders: Number(row?.completed_orders ?? 0),
    productive_minutes: Number(row?.productive_minutes ?? 0),
    cartons_per_hour: roundNumber(row?.cartons_per_hour),
    lines_per_hour: roundNumber(row?.lines_per_hour),
  };
}

function buildProductivityAggregate(rows, { groupByZone = false } = {}) {
  const grouped = new Map();

  for (const row of rows) {
    const key = groupByZone ? String(row?.zone_code ?? "").trim() || "__NO_ZONE__" : "__SITE__";
    const current = grouped.get(key) ?? {
      zone_code: groupByZone ? (row?.zone_code ?? null) : null,
      zone_name: groupByZone ? (row?.zone_name ?? null) : null,
      employee_count: 0,
      cartons_prepared: 0,
      palettes_prepared: 0,
      completed_lines: 0,
      completed_orders: 0,
      productive_minutes: 0,
      weighted_line_minutes: 0,
    };

    const cartonsPrepared = Number(row?.cartons_prepared ?? 0);
    const palettesPrepared = Number(row?.palettes_prepared ?? 0);
    const completedLines = Number(row?.completed_lines ?? 0);
    const completedOrders = Number(row?.completed_orders ?? 0);
    const productiveMinutes = Number(row?.productive_minutes ?? 0);
    const avgLinePrepMinutes = toNullableNumber(row?.avg_line_prep_minutes);

    current.employee_count += 1;
    current.cartons_prepared += cartonsPrepared;
    current.palettes_prepared += palettesPrepared;
    current.completed_lines += completedLines;
    current.completed_orders += completedOrders;
    current.productive_minutes += productiveMinutes;

    if (avgLinePrepMinutes != null && completedLines > 0) {
      current.weighted_line_minutes += avgLinePrepMinutes * completedLines;
    }

    grouped.set(key, current);
  }

  const aggregates = [...grouped.values()].map((group) => {
    const productiveHours = group.productive_minutes / 60;
    const avgLinePrepMinutes = group.completed_lines > 0
      ? roundNumber(group.weighted_line_minutes / group.completed_lines, 2)
      : null;

    return {
      zone_code: group.zone_code,
      zone_name: group.zone_name,
      employee_count: group.employee_count,
      cartons_prepared: group.cartons_prepared,
      palettes_prepared: group.palettes_prepared,
      completed_lines: group.completed_lines,
      completed_orders: group.completed_orders,
      productive_minutes: group.productive_minutes,
      cartons_per_hour: productiveHours > 0 ? roundNumber(group.cartons_prepared / productiveHours, 2) : null,
      lines_per_hour: productiveHours > 0 ? roundNumber(group.completed_lines / productiveHours, 2) : null,
      avg_line_prep_minutes: avgLinePrepMinutes,
    };
  });

  aggregates.sort((left, right) => {
    const leftKey = String(left.zone_code ?? "").localeCompare(String(right.zone_code ?? ""));
    if (leftKey !== 0) return leftKey;
    return String(left.zone_name ?? "").localeCompare(String(right.zone_name ?? ""));
  });

  return aggregates;
}

function buildSiteProductivityAggregate(rows) {
  const aggregate = buildProductivityAggregate(rows, { groupByZone: false })[0] ?? {
    employee_count: 0,
    cartons_prepared: 0,
    palettes_prepared: 0,
    completed_lines: 0,
    completed_orders: 0,
    productive_minutes: 0,
    cartons_per_hour: null,
    lines_per_hour: null,
    avg_line_prep_minutes: null,
  };

  return {
    total_employees: aggregate.employee_count,
    cartons_prepared: aggregate.cartons_prepared,
    palettes_prepared: aggregate.palettes_prepared,
    completed_lines: aggregate.completed_lines,
    completed_orders: aggregate.completed_orders,
    productive_minutes: aggregate.productive_minutes,
    cartons_per_hour: aggregate.cartons_per_hour,
    lines_per_hour: aggregate.lines_per_hour,
    avg_line_prep_minutes: aggregate.avg_line_prep_minutes,
  };
}

export async function getPreparationSummaryByDateAndSite({ date, site } = {}) {
  const safeDate = normalizeIsoDate(date);
  const safeSite = typeof site === "string" && site.trim() !== "" ? site.trim() : null;

  if (!safeDate || !safeSite) {
    return null;
  }

  const [rows] = await getPool().execute(
    `
      SELECT
        prep_date,
        site_id,
        site_code,
        site_name,
        cartons_to_prepare,
        cartons_prepared,
        cartons_remaining,
        cartons_prepared_percent,
        cartons_remaining_percent,
        cartons_in_progress,
        cartons_waiting,
        palettes_to_prepare,
        palettes_prepared,
        palettes_remaining,
        palettes_prepared_percent,
        palettes_remaining_percent,
        palettes_in_progress,
        palettes_waiting,
        stores_to_prepare,
        stores_prepared,
        stores_remaining,
        stores_prepared_percent,
        stores_remaining_percent,
        stores_in_progress,
        stores_waiting,
        last_update
      FROM v_preparation_summary_family1
      WHERE prep_date = ?
        AND site_code = ?
      LIMIT 1
    `,
    [safeDate, safeSite],
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    return null;
  }

  return {
    date: safeDate,
    site: String(row.site_code ?? safeSite).trim(),
    siteId: row.site_id ?? null,
    siteName: row.site_name ?? null,
    lastUpdate: formatDateTime(row.last_update),
    values: {
      carton: {
        toPrepare: Number(row.cartons_to_prepare ?? 0),
        prepared: Number(row.cartons_prepared ?? 0),
        remaining: Number(row.cartons_remaining ?? 0),
        preparedPercent: Number(row.cartons_prepared_percent ?? 0),
        remainingPercent: Number(row.cartons_remaining_percent ?? 0),
        inProgress: Number(row.cartons_in_progress ?? 0),
        waiting: Number(row.cartons_waiting ?? 0),
      },
      palette: {
        toPrepare: Number(row.palettes_to_prepare ?? 0),
        prepared: Number(row.palettes_prepared ?? 0),
        remaining: Number(row.palettes_remaining ?? 0),
        preparedPercent: Number(row.palettes_prepared_percent ?? 0),
        remainingPercent: Number(row.palettes_remaining_percent ?? 0),
        inProgress: Number(row.palettes_in_progress ?? 0),
        waiting: Number(row.palettes_waiting ?? 0),
      },
      magazin: {
        toPrepare: Number(row.stores_to_prepare ?? 0),
        prepared: Number(row.stores_prepared ?? 0),
        remaining: Number(row.stores_remaining ?? 0),
        preparedPercent: Number(row.stores_prepared_percent ?? 0),
        remainingPercent: Number(row.stores_remaining_percent ?? 0),
        inProgress: Number(row.stores_in_progress ?? 0),
        waiting: Number(row.stores_waiting ?? 0),
      },
    },
  };
}

function buildTeamPickerEntry(row, { includeTaskId = false, includeBlockReason = false } = {}) {
  const entry = {
    employee_code: row?.employee_code ?? null,
    full_name: row?.full_name ?? null,
    zone: row?.current_zone_code ?? null,
    idle_minutes: toNullableNumber(row?.idle_minutes),
  };

  if (includeTaskId) {
    entry.current_task_id = toNullableNumber(row?.current_task_id);
  }

  if (includeBlockReason) {
    entry.block_reason = row?.block_reason ?? null;
  }

  return entry;
}

function roundToTwo(value) {
  return roundNumber(value, 2);
}

function mapSupervisionRow(row) {
  return {
    supervision_date: formatDateOnly(row?.supervision_date_iso ?? row?.supervision_date),
    site_id: Number(row?.site_id ?? 0),
    site_code: row?.site_code ?? null,
    site_name: row?.site_name ?? null,
    city: row?.city ?? null,
    region_name: row?.region_name ?? null,
    total_orders: Number(row?.total_orders ?? 0),
    urgent_orders: Number(row?.urgent_orders ?? 0),
    total_cartons: Number(row?.total_cartons ?? 0),
    total_pallets: Number(row?.total_pallets ?? 0),
    total_stores: Number(row?.total_stores ?? 0),
    prepared_orders: Number(row?.prepared_orders ?? 0),
    prepared_cartons: Number(row?.prepared_cartons ?? 0),
    prepared_pallets: Number(row?.prepared_pallets ?? 0),
    prepared_stores: Number(row?.prepared_stores ?? 0),
    remaining_orders: Number(row?.remaining_orders ?? 0),
    remaining_cartons: Number(row?.remaining_cartons ?? 0),
    remaining_pallets: Number(row?.remaining_pallets ?? 0),
    remaining_stores: Number(row?.remaining_stores ?? 0),
    progress_pct: roundToTwo(row?.progress_pct),
    service_level_pct: roundToTwo(row?.service_level_pct),
    productivity_score: roundToTwo(row?.productivity_score),
    error_rate_pct: roundToTwo(row?.error_rate_pct),
    available_headcount: Number(row?.available_headcount ?? 0),
    required_headcount: Number(row?.required_headcount ?? 0),
    staffing_gap: Number(row?.staffing_gap ?? 0),
    can_finish_on_time: Number(row?.can_finish_on_time ?? 0) === 1,
    late_risk_level: row?.late_risk_level ?? null,
    anomaly_flag: Number(row?.anomaly_flag ?? 0) === 1,
    anomaly_reason: row?.anomaly_reason ?? null,
    escalation_flag: Number(row?.escalation_flag ?? 0) === 1,
    escalation_reason: row?.escalation_reason ?? null,
    performance_score: roundToTwo(row?.performance_score),
    risk_score: roundToTwo(row?.risk_score),
    client_pressure_score: roundToTwo(row?.client_pressure_score),
    cut_off_time: formatTimeValue(row?.cut_off_time),
    estimated_completion_time: formatTimeValue(row?.estimated_completion_time),
    risk_band: row?.risk_band ?? null,
    performance_band: row?.performance_band ?? null,
    supervisor_recommendation: row?.supervisor_recommendation ?? null,
    updated_at: formatDateTime(row?.updated_at_iso ?? row?.updated_at),
  };
}

export async function getMultiSiteSupervisionSummaryByDateAndScope({ date, scope } = {}) {
  const safeDate = normalizeIsoDate(date);
  const safeScope = typeof scope === "string" ? scope.trim() : "";

  if (!safeDate || !safeScope) {
    return null;
  }

  const rows = await fetchRows(
    `
      SELECT
        v.*,
        DATE_FORMAT(v.supervision_date, '%Y-%m-%d') AS supervision_date_iso,
        DATE_FORMAT(v.updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at_iso
      FROM v_multi_site_supervision_daily v
      WHERE v.supervision_date = ?
    `,
    [safeDate],
  );

  if (rows.length === 0) {
    return null;
  }

  const normalizedRows = rows.map(mapSupervisionRow);
  let items = normalizedRows;

  if (safeScope === "risk_ranking") {
    items = [...normalizedRows].sort((left, right) => {
      const riskDiff = Number(right.risk_score ?? 0) - Number(left.risk_score ?? 0);
      if (riskDiff !== 0) return riskDiff;
      const pressureDiff = Number(right.client_pressure_score ?? 0) - Number(left.client_pressure_score ?? 0);
      if (pressureDiff !== 0) return pressureDiff;
      return String(left.site_code ?? "").localeCompare(String(right.site_code ?? ""));
    });
  } else if (safeScope === "performance_ranking") {
    items = [...normalizedRows].sort((left, right) => {
      const performanceDiff = Number(right.performance_score ?? 0) - Number(left.performance_score ?? 0);
      if (performanceDiff !== 0) return performanceDiff;
      const progressDiff = Number(right.progress_pct ?? 0) - Number(left.progress_pct ?? 0);
      if (progressDiff !== 0) return progressDiff;
      return String(left.site_code ?? "").localeCompare(String(right.site_code ?? ""));
    });
  } else if (safeScope === "staffing") {
    items = [...normalizedRows].sort((left, right) => {
      const staffingDiff = Number(right.staffing_gap ?? 0) - Number(left.staffing_gap ?? 0);
      if (staffingDiff !== 0) return staffingDiff;
      return String(left.site_code ?? "").localeCompare(String(right.site_code ?? ""));
    });
  } else if (safeScope === "urgent_pressure") {
    items = [...normalizedRows].sort((left, right) => {
      const urgentDiff = Number(right.urgent_orders ?? 0) - Number(left.urgent_orders ?? 0);
      if (urgentDiff !== 0) return urgentDiff;
      const pressureDiff = Number(right.client_pressure_score ?? 0) - Number(left.client_pressure_score ?? 0);
      if (pressureDiff !== 0) return pressureDiff;
      return String(left.site_code ?? "").localeCompare(String(right.site_code ?? ""));
    });
  } else if (safeScope === "anomalies") {
    items = normalizedRows
      .filter((row) => row.anomaly_flag || row.escalation_flag)
      .sort((left, right) => {
        const escalationDiff = Number(right.escalation_flag ?? 0) - Number(left.escalation_flag ?? 0);
        if (escalationDiff !== 0) return escalationDiff;
        const anomalyDiff = Number(right.anomaly_flag ?? 0) - Number(left.anomaly_flag ?? 0);
        if (anomalyDiff !== 0) return anomalyDiff;
        return Number(right.risk_score ?? 0) - Number(left.risk_score ?? 0);
      });
  } else if (safeScope === "global_status") {
    items = [...normalizedRows].sort((left, right) => String(left.site_code ?? "").localeCompare(String(right.site_code ?? "")));
  } else {
    return null;
  }

  const latestUpdate = items.reduce((latest, row) => {
    const candidate = typeof row.updated_at === "string" ? row.updated_at : "";
    if (!candidate) return latest;
    return candidate > latest ? candidate : latest;
  }, "");

  return {
    date: safeDate,
    scope: safeScope,
    total_sites: normalizedRows.length,
    returned_sites: items.length,
    generated_at: latestUpdate || null,
    items,
  };
}

export async function getTeamStatusSummaryByDateAndSite({ date, site } = {}) {
  const safeDate = normalizeIsoDate(date);
  const safeSite = typeof site === "string" && site.trim() !== "" ? site.trim() : null;

  if (!safeDate || !safeSite) {
    return null;
  }

  const [rows] = await getPool().execute(
    `
      SELECT *
      FROM v_team_status_daily
      WHERE status_date = ?
        AND site_code = ?
      ORDER BY full_name
    `,
    [safeDate, safeSite],
  );

  const teamRows = Array.isArray(rows) ? rows : [];
  const summary = {
    date: safeDate,
    site: safeSite,
    present_count: 0,
    absent_count: 0,
    available_pickers: [],
    busy_pickers: [],
    blocked_pickers: [],
    inactive_pickers: [],
  };

  for (const row of teamRows) {
    summary.present_count += Number(row?.present_flag ?? 0) || 0;
    summary.absent_count += Number(row?.absent_flag ?? 0) || 0;

    if (Number(row?.available_flag ?? 0) === 1) {
      summary.available_pickers.push(buildTeamPickerEntry(row));
    }

    if (Number(row?.busy_flag ?? 0) === 1) {
      summary.busy_pickers.push(buildTeamPickerEntry(row, { includeTaskId: true }));
    }

    if (Number(row?.blocked_flag ?? 0) === 1) {
      summary.blocked_pickers.push(buildTeamPickerEntry(row, { includeTaskId: true, includeBlockReason: true }));
    }

    if (Number(row?.inactive_flag ?? 0) === 1) {
      summary.inactive_pickers.push(buildTeamPickerEntry(row));
    }
  }

  return summary;
}

export async function getKpiHourlyPerformanceByDateAndSite({ date, site } = {}) {
  const { date: safeDate, site: safeSite } = normalizeKpiContext({ date, site });
  if (!safeDate || !safeSite) {
    return null;
  }

  const rows = await fetchRows(
    `
      SELECT *
      FROM v_kpi_hourly_performance
      WHERE kpi_date = ?
        AND site_code = ?
      ORDER BY kpi_hour
    `,
    [safeDate, safeSite],
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    date: safeDate,
    site: safeSite,
    hourly_kpis: rows.map(mapHourlyKpiRow),
  };
}

export async function getKpiSummaryByDateAndSite({ date, site, scope } = {}) {
  const { date: safeDate, site: safeSite } = normalizeKpiContext({ date, site });
  const safeScope = typeof scope === "string" ? scope.trim() : "";

  if (!safeDate || !safeSite || !safeScope) {
    return null;
  }

  if (safeScope === "picker_productivity" || safeScope === "zone_productivity" || safeScope === "site_productivity") {
    const rows = await fetchRows(
      `
        SELECT *
        FROM v_kpi_productivity_daily
        WHERE kpi_date = ?
          AND site_code = ?
        ORDER BY cartons_per_hour DESC, full_name
      `,
      [safeDate, safeSite],
    );

    if (rows.length === 0) {
      return null;
    }

    if (safeScope === "picker_productivity") {
      return {
        date: safeDate,
        site: safeSite,
        scope: safeScope,
        pickers: rows.map(mapPickerProductivityRow),
      };
    }

    if (safeScope === "zone_productivity") {
      return {
        date: safeDate,
        site: safeSite,
        scope: safeScope,
        zones: buildProductivityAggregate(rows, { groupByZone: true }),
      };
    }

    return {
      date: safeDate,
      site: safeSite,
      scope: safeScope,
      ...buildSiteProductivityAggregate(rows),
    };
  }

  if (safeScope === "daily_summary") {
    const rows = await fetchRows(
      `
        SELECT *
        FROM v_kpi_daily_summary
        WHERE kpi_date = ?
          AND site_code = ?
        LIMIT 1
      `,
      [safeDate, safeSite],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      date: safeDate,
      site: safeSite,
      scope: safeScope,
      total_orders: Number(row.total_orders ?? 0),
      completed_orders: Number(row.completed_orders ?? 0),
      orders_on_time: Number(row.orders_on_time ?? 0),
      orders_late: Number(row.orders_late ?? 0),
      orders_at_risk: Number(row.orders_at_risk ?? 0),
      total_lines: Number(row.total_lines ?? 0),
      total_errors: Number(row.total_errors ?? 0),
      error_rate_pct: roundNumber(row.error_rate_pct, 2),
      service_level_pct: roundNumber(row.service_level_pct, 2),
      total_cartons_done: roundNumber(row.total_cartons_done, 2),
      total_lines_done: roundNumber(row.total_lines_done, 2),
      avg_cartons_per_hour_by_picker: roundNumber(row.avg_cartons_per_hour_by_picker, 2),
      avg_lines_per_hour_by_picker: roundNumber(row.avg_lines_per_hour_by_picker, 2),
      cartons_per_hour_target: roundNumber(row.cartons_per_hour_target, 2),
      lines_per_hour_target: roundNumber(row.lines_per_hour_target, 2),
      service_level_target_pct: roundNumber(row.service_level_target_pct, 2),
      error_rate_target_pct: roundNumber(row.error_rate_target_pct, 2),
      cartons_vs_target_gap: roundNumber(row.cartons_vs_target_gap, 2),
      service_level_gap_pct: roundNumber(row.service_level_gap_pct, 2),
      error_rate_gap_pct: roundNumber(row.error_rate_gap_pct, 2),
    };
  }

  if (safeScope === "quality_service") {
    const rows = await fetchRows(
      `
        SELECT *
        FROM v_kpi_quality_service_daily
        WHERE kpi_date = ?
          AND site_code = ?
        LIMIT 1
      `,
      [safeDate, safeSite],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      date: safeDate,
      site: safeSite,
      scope: safeScope,
      total_orders: Number(row.total_orders ?? 0),
      completed_orders: Number(row.completed_orders ?? 0),
      orders_on_time: Number(row.orders_on_time ?? 0),
      orders_late: Number(row.orders_late ?? 0),
      orders_at_risk: Number(row.orders_at_risk ?? 0),
      total_lines: Number(row.total_lines ?? 0),
      total_errors: Number(row.total_errors ?? 0),
      error_rate_pct: roundNumber(row.error_rate_pct, 2),
      service_level_pct: roundNumber(row.service_level_pct, 2),
    };
  }

  return null;
}

function normalizeTransportLimit(value, defaultValue = 20, maxValue = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  const safeLimit = Math.trunc(parsed);
  if (safeLimit < 1) {
    return defaultValue;
  }

  return Math.min(safeLimit, maxValue);
}

function assertSafeViewName(viewName) {
  if (typeof viewName !== "string" || !/^[A-Za-z0-9_]+$/.test(viewName.trim())) {
    throw new Error("Invalid transport view name.");
  }
  return viewName.trim();
}

async function fetchTransportViewRows(viewName, { orderBy = "", limit = 20 } = {}) {
  const safeViewName = assertSafeViewName(viewName);
  const safeLimit = normalizeTransportLimit(limit);
  const safeOrderBy = typeof orderBy === "string" ? orderBy.trim() : "";

  const sql = `
    SELECT *
    FROM ${safeViewName}
    ${safeOrderBy ? `ORDER BY ${safeOrderBy}` : ""}
    LIMIT ?
  `;

  return fetchRows(sql, [safeLimit]);
}

export async function getTransportViewRows(viewName, options = {}) {
  return fetchTransportViewRows(viewName, options);
}

export async function getTransportViewRow(viewName) {
  const rows = await fetchTransportViewRows(viewName, { limit: 1 });
  return rows[0] ?? null;
}

function normalizeSql(sql) {
  if (typeof sql !== "string") return "";
  return sql.trim();
}

function getFirstKeyword(sql) {
  const normalized = normalizeSql(sql)
    .replace(/^(?:--.*\n|\/\*[\s\S]*?\*\/\s*)+/g, "")
    .trimStart();
  const match = normalized.match(/^([a-zA-Z]+)/);
  return match ? match[1].toLowerCase() : "";
}

function hasMultipleStatements(sql) {
  const normalized = normalizeSql(sql);
  if (normalized.length === 0) return false;
  const trimmed = normalized.replace(/;+\s*$/, "");
  return trimmed.includes(";");
}

export function classifySql(sql) {
  const keyword = getFirstKeyword(sql);
  const readOnlyKeywords = new Set(["select", "show", "describe", "desc", "explain", "with"]);
  const mutatingKeywords = new Set(["insert", "update", "delete", "alter", "drop", "truncate", "create", "replace", "rename", "grant", "revoke"]);

  return {
    keyword,
    isReadOnly: readOnlyKeywords.has(keyword),
    isMutating: mutatingKeywords.has(keyword),
  };
}

export async function executeSql(sql) {
  const normalizedSql = normalizeSql(sql);
  if (normalizedSql.length === 0) {
    throw new Error("SQL is required.");
  }

  if (hasMultipleStatements(normalizedSql)) {
    throw new Error("Only one SQL statement is allowed at a time.");
  }

  const connection = await getPool().getConnection();
  try {
    const [result, fields] = await connection.query(normalizedSql);

    if (Array.isArray(result)) {
      return {
        kind: "rows",
        rows: result,
        fields: Array.isArray(fields) ? fields.map((field) => field.name) : [],
        rowCount: result.length,
      };
    }

    return {
      kind: "write",
      affectedRows: Number(result?.affectedRows ?? 0),
      insertId: Number(result?.insertId ?? 0),
      warningStatus: Number(result?.warningStatus ?? 0),
      info: typeof result?.info === "string" ? result.info : "",
    };
  } finally {
    connection.release();
  }
}
