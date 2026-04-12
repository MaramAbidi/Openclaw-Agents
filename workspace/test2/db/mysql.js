import mysql from "mysql2/promise";

let pool;

function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number.parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "company_ops",
    waitForConnections: true,
    connectionLimit: Number.parseInt(process.env.MYSQL_POOL_SIZE || "10", 10),
    queueLimit: 0,
  });
  return pool;
}

function normalizeIsoDate(value) {
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
