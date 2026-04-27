import { z } from "zod";
import {
  appendClause,
  buildTextClause,
  createRowsResponse,
  fetchTransportViewRows,
  normalizeLimit,
  resolveSortExpression,
} from "./transport-view-utils.js";

const sortMap = {
  camion_id: "camion_id",
  immatriculation: "immatriculation",
  moyenne_7j: "moyenne_7j",
  j1: "j1",
  j2: "j2",
  j3: "j3",
  j4: "j4",
  j5: "j5",
  j6: "j6",
  j7: "j7",
  tendance: "tendance",
};

const sortBySchema = z.enum([
  "camion_id",
  "immatriculation",
  "moyenne_7j",
  "j1",
  "j2",
  "j3",
  "j4",
  "j5",
  "j6",
  "j7",
  "tendance",
]);

export function registerVueSuivi7jTool(server) {
  server.registerTool(
    "vue_suivi_7j",
    {
      title: "Vue Suivi 7J",
      description:
        "Returns the 7-day truck trend from vue_suivi_7j. Use it for weekly trends, momentum, and day-by-day truck performance comparison.",
      inputSchema: z
        .object({
          immatriculation: z.string().trim().min(1).optional().describe("Optional truck plate filter"),
          limit: z.number().int().min(1).max(100).optional().describe("Optional result limit"),
          sort_by: sortBySchema.optional().describe("Optional sort column"),
          order: z.enum(["asc", "desc"]).optional().describe("Optional sort direction"),
        })
        .strict(),
    },
    async ({ immatriculation, limit, sort_by, order } = {}) => {
      try {
        const where = { clauses: [], params: [] };
        const immatriculationClause = buildTextClause("immatriculation", immatriculation);
        appendClause(where, immatriculationClause);

        const safeLimit = normalizeLimit(limit, 20, 100);
        const orderBy = resolveSortExpression(sort_by, order, sortMap, "moyenne_7j DESC, immatriculation ASC");

        const rows = await fetchTransportViewRows({
          viewName: "vue_suivi_7j",
          whereClauses: where.clauses,
          params: where.params,
          orderBy,
          limit: safeLimit,
          maxLimit: 100,
        });

        return createRowsResponse({
          viewName: "vue_suivi_7j",
          rows,
          meta: {
            filters: {
              immatriculation: immatriculationClause?.value ?? null,
            },
            limit: safeLimit,
            sort_by: sort_by ?? null,
            order: order ? String(order).toLowerCase() : null,
          },
          emptyMessage: "Aucune donnee trouvee dans vue_suivi_7j.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du chargement de vue_suivi_7j: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
