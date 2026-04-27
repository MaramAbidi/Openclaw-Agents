import { queryRows } from "../../db/mysql.js";

function assertSafeViewName(viewName) {
  if (typeof viewName !== "string" || !/^[A-Za-z0-9_]+$/.test(viewName.trim())) {
    throw new Error("Invalid transport view name.");
  }
  return viewName.trim();
}

export function sanitizeIsoDate(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const dt = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
}

export function normalizeTextInput(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeLimit(value, defaultValue = 20, maxValue = 100) {
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

export function normalizeOrderDirection(value, defaultValue = "desc") {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "asc" || raw === "desc") {
    return raw.toUpperCase();
  }

  return defaultValue.toUpperCase();
}

export function buildDateClause(column, value) {
  const safeDate = sanitizeIsoDate(value);
  if (!safeDate) return null;
  return {
    clause: `DATE(${column}) = ?`,
    params: [safeDate],
    value: safeDate,
  };
}

export function buildTextClause(column, value) {
  const safeText = normalizeTextInput(value);
  if (!safeText) return null;
  return {
    clause: `LOWER(TRIM(${column})) LIKE ?`,
    params: [`%${safeText.toLowerCase()}%`],
    value: safeText,
  };
}

export function buildEqualsClause(column, value) {
  const safeText = normalizeTextInput(value);
  if (!safeText) return null;
  return {
    clause: `LOWER(TRIM(${column})) = ?`,
    params: [safeText.toLowerCase()],
    value: safeText,
  };
}

export function appendClause(target, clause) {
  if (!clause) return target;
  target.clauses.push(clause.clause);
  target.params.push(...clause.params);
  return target;
}

export function resolveSortExpression(sortBy, order, sortMap, defaultOrderBy) {
  if (!sortBy) {
    return defaultOrderBy;
  }

  const normalizedSortBy = normalizeTextInput(sortBy);
  if (!normalizedSortBy || !sortMap || !Object.prototype.hasOwnProperty.call(sortMap, normalizedSortBy)) {
    throw new Error(`Invalid sort_by value: ${sortBy}`);
  }

  const expression = sortMap[normalizedSortBy];
  const direction = normalizeOrderDirection(order, "desc");
  return `${expression} ${direction}`;
}

export async function fetchTransportViewRows({
  viewName,
  whereClauses = [],
  params = [],
  orderBy = "",
  limit = 20,
  maxLimit = 100,
}) {
  const safeViewName = assertSafeViewName(viewName);
  const safeLimit = normalizeLimit(limit, 20, maxLimit);
  const clauses = Array.isArray(whereClauses) ? whereClauses.filter(Boolean) : [];
  const safeParams = Array.isArray(params) ? [...params] : [];

  const sql = `
    SELECT *
    FROM ${safeViewName}
    ${clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""}
    ${orderBy ? `ORDER BY ${orderBy}` : ""}
    LIMIT ?
  `;

  safeParams.push(safeLimit);
  return queryRows(sql, safeParams);
}

export function createRowsResponse({
  viewName,
  rows,
  meta = {},
  emptyMessage,
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const payload = {
    view: viewName,
    ...meta,
    row_count: safeRows.length,
    rows: safeRows,
  };

  if (safeRows.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: emptyMessage ?? `Aucune donnee trouvee dans ${viewName}.`,
        },
      ],
      structuredContent: payload,
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export function createSingleRowResponse({
  viewName,
  row,
  meta = {},
  emptyMessage,
}) {
  const payload = {
    view: viewName,
    ...meta,
    row: row ?? null,
  };

  if (!row) {
    return {
      content: [
        {
          type: "text",
          text: emptyMessage ?? `Aucune donnee trouvee dans ${viewName}.`,
        },
      ],
      structuredContent: payload,
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}
