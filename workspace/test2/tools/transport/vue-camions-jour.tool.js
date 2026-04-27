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
  immatriculation: "immatriculation",
  nb_chauffeurs: "nb_chauffeurs",
  nb_voyages: "nb_voyages",
  prf_j: "prf_j",
  prf_c: "prf_c",
  performance_jour: "performance_jour",
  performance_cumulee: "performance_cumulee",
  statut_activite: "statut_activite",
  niveau_exploitation: "niveau_exploitation",
};

const sortBySchema = z.enum([
  "date_jour",
  "immatriculation",
  "nb_chauffeurs",
  "nb_voyages",
  "prf_j",
  "prf_c",
  "performance_jour",
  "performance_cumulee",
  "statut_activite",
  "niveau_exploitation",
]);

export function registerVueCamionsJourTool(server) {
  server.registerTool(
    "vue_camions_jour",
    {
      title: "Vue Camions Jour",
      description:
        "Returns the daily truck activity from vue_camions_jour. Use it for truck ranking, truck performance, active or inactive trucks, and operational truck follow-up.",
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
          limit: z.number().int().min(1).max(100).optional().describe("Optional result limit"),
          sort_by: sortBySchema.optional().describe("Optional sort column"),
          order: z.enum(["asc", "desc"]).optional().describe("Optional sort direction"),
        })
        .strict(),
    },
    async ({ date_jour, immatriculation, limit, sort_by, order } = {}) => {
      try {
        const where = { clauses: [], params: [] };
        const dateClause = buildDateClause("date_jour", date_jour);
        const immatriculationClause = buildTextClause("immatriculation", immatriculation);
        appendClause(where, dateClause);
        appendClause(where, immatriculationClause);

        const safeLimit = normalizeLimit(limit, 20, 100);
        const orderBy = resolveSortExpression(
          sort_by,
          order,
          sortMap,
          "performance_jour DESC, nb_voyages DESC, immatriculation ASC",
        );

        const rows = await fetchTransportViewRows({
          viewName: "vue_camions_jour",
          whereClauses: where.clauses,
          params: where.params,
          orderBy,
          limit: safeLimit,
          maxLimit: 100,
        });

        return createRowsResponse({
          viewName: "vue_camions_jour",
          rows,
          meta: {
            filters: {
              date_jour: dateClause?.value ?? null,
              immatriculation: immatriculationClause?.value ?? null,
            },
            limit: safeLimit,
            sort_by: sort_by ?? null,
            order: order ? String(order).toLowerCase() : null,
          },
          emptyMessage: "Aucune donnee trouvee dans vue_camions_jour.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du chargement de vue_camions_jour: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
