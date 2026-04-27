import { z } from "zod";
import {
  appendClause,
  buildDateClause,
  buildTextClause,
  createRowsResponse,
  fetchTransportViewRows,
  normalizeLimit,
  resolveSortExpression,
  sanitizeIsoDate,
} from "./transport-view-utils.js";

const sortMap = {
  date_jour: "date_jour",
  type_entite: "type_entite",
  reference_entite: "reference_entite",
  prf_j: "prf_j",
  prf_c: "prf_c",
  delta_performance: "delta_performance",
};

const sortBySchema = z.enum([
  "date_jour",
  "type_entite",
  "reference_entite",
  "prf_j",
  "prf_c",
  "delta_performance",
]);

export function registerVuePerformanceCompareeTool(server) {
  server.registerTool(
    "vue_performance_comparee",
    {
      title: "Vue Performance Comparee",
      description:
        "Returns the day-versus-cumulative comparison from vue_performance_comparee. Use it for today versus cumulative performance, gap analysis, and entity comparison.",
      inputSchema: z
        .object({
          date_jour: z
            .string()
            .trim()
            .min(1)
            .refine((value) => sanitizeIsoDate(value) !== null, "The date must use YYYY-MM-DD.")
            .optional()
            .describe("Optional date filter in YYYY-MM-DD format"),
          immatriculation: z.string().trim().min(1).optional().describe("Optional truck plate filter"),
          code_chauffeur: z.string().trim().min(1).optional().describe("Optional chauffeur code filter"),
          nom_complet: z.string().trim().min(1).optional().describe("Optional driver name filter"),
          limit: z.number().int().min(1).max(100).optional().describe("Optional result limit"),
          sort_by: sortBySchema.optional().describe("Optional sort column"),
          order: z.enum(["asc", "desc"]).optional().describe("Optional sort direction"),
        })
        .strict(),
    },
    async ({ date_jour, immatriculation, code_chauffeur, nom_complet, limit, sort_by, order } = {}) => {
      try {
        const where = { clauses: [], params: [] };
        const dateClause = buildDateClause("date_jour", date_jour);
        appendClause(where, dateClause);

        if (immatriculation) {
          appendClause(where, buildTextClause("reference_entite", immatriculation));
          appendClause(where, {
            clause: "LOWER(TRIM(type_entite)) = ?",
            params: ["camion"],
          });
        }

        if (code_chauffeur) {
          appendClause(where, buildTextClause("reference_entite", code_chauffeur));
          appendClause(where, {
            clause: "LOWER(TRIM(type_entite)) = ?",
            params: ["chauffeur"],
          });
        }

        if (nom_complet) {
          appendClause(where, buildTextClause("reference_entite", nom_complet));
          appendClause(where, {
            clause: "LOWER(TRIM(type_entite)) = ?",
            params: ["chauffeur"],
          });
        }

        const safeLimit = normalizeLimit(limit, 20, 100);
        const orderBy = resolveSortExpression(
          sort_by,
          order,
          sortMap,
          "delta_performance DESC, reference_entite ASC",
        );

        const rows = await fetchTransportViewRows({
          viewName: "vue_performance_comparee",
          whereClauses: where.clauses,
          params: where.params,
          orderBy,
          limit: safeLimit,
          maxLimit: 100,
        });

        return createRowsResponse({
          viewName: "vue_performance_comparee",
          rows,
          meta: {
            filters: {
              date_jour: dateClause?.value ?? null,
              immatriculation: immatriculation ?? null,
              code_chauffeur: code_chauffeur ?? null,
              nom_complet: nom_complet ?? null,
            },
            limit: safeLimit,
            sort_by: sort_by ?? null,
            order: order ? String(order).toLowerCase() : null,
          },
          emptyMessage: "Aucune donnee trouvee dans vue_performance_comparee.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du chargement de vue_performance_comparee: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
