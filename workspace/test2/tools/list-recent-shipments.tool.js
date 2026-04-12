import { z } from "zod";
import { getRecentShipments } from "../db/mysql.js";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildStats(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const totalQty = safeRows.reduce((sum, row) => sum + toNumber(row.mysum), 0);

  const zoneMap = new Map();
  for (const row of safeRows) {
    const zone = row?.zonne_prep ? String(row.zonne_prep) : "Unknown";
    zoneMap.set(zone, (zoneMap.get(zone) ?? 0) + 1);
  }

  const byZone = [...zoneMap.entries()]
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count);

  return {
    rowCount: safeRows.length,
    totalQty: Number(totalQty.toFixed(2)),
    zoneCount: byZone.length,
    byZone,
  };
}

export function registerListRecentShipmentsTool(server) {
  server.registerTool(
    "list_recent_shipments",
    {
      title: "List Recent Shipments",
      description: "Returns recent shipments from MySQL database.",
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(50).optional(),
        })
        .strict(),
    },
    async ({ limit = 8 }) => {
      const fetchedAt = new Date().toISOString();
      try {
        const rows = await getRecentShipments({ limit });
        const stats = buildStats(rows);

        return {
          content: [{ type: "text", text: `Fetched ${rows.length} rows from MySQL.` }],
          structuredContent: {
            fetchedAt,
            rows,
            stats,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Database error: ${message}` }],
          structuredContent: {
            fetchedAt,
            rows: [],
            stats: buildStats([]),
            error: message,
          },
          isError: true,
        };
      }
    },
  );
}

