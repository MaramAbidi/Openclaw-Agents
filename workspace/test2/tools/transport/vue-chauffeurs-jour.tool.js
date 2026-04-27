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
  code_chauffeur: "code_chauffeur",
  nom_complet: "nom_complet",
  nb_camions: "nb_camions",
  nb_voyages: "nb_voyages",
  prf_j: "prf_j",
  prf_c: "prf_c",
  heures_semaine: "heures_semaine",
  heures_mois: "heures_mois",
  statut_activite: "statut_activite",
  niveau_performance: "niveau_performance",
};

const sortBySchema = z.enum([
  "date_jour",
  "code_chauffeur",
  "nom_complet",
  "nb_camions",
  "nb_voyages",
  "prf_j",
  "prf_c",
  "heures_semaine",
  "heures_mois",
  "statut_activite",
  "niveau_performance",
]);

export function registerVueChauffeursJourTool(server) {
  server.registerTool(
    "vue_chauffeurs_jour",
    {
      title: "Vue Chauffeurs Jour",
      description:
        "Returns the daily driver activity from vue_chauffeurs_jour. Use it for driver ranking, driver productivity, active or inactive chauffeurs, and operational driver follow-up.",
      inputSchema: z
        .object({
          date_jour: z
            .string()
            .trim()
            .min(1)
            .refine((value) => sanitizeIsoDate(value) !== null, "The date must use YYYY-MM-DD.")
            .optional()
            .describe("Optional date filter in YYYY-MM-DD format"),
          code_chauffeur: z.string().trim().min(1).optional().describe("Optional chauffeur code filter"),
          nom_complet: z.string().trim().min(1).optional().describe("Optional driver name filter"),
          limit: z.number().int().min(1).max(100).optional().describe("Optional result limit"),
          sort_by: sortBySchema.optional().describe("Optional sort column"),
          order: z.enum(["asc", "desc"]).optional().describe("Optional sort direction"),
        })
        .strict(),
    },
    async ({ date_jour, code_chauffeur, nom_complet, limit, sort_by, order } = {}) => {
      try {
        const where = { clauses: [], params: [] };
        const dateClause = buildDateClause("date_jour", date_jour);
        const codeClause = buildTextClause("code_chauffeur", code_chauffeur);
        const nameClause = buildTextClause("nom_complet", nom_complet);
        appendClause(where, dateClause);
        appendClause(where, codeClause);
        appendClause(where, nameClause);

        const safeLimit = normalizeLimit(limit, 20, 100);
        const orderBy = resolveSortExpression(
          sort_by,
          order,
          sortMap,
          "prf_j DESC, nb_voyages DESC, nom_complet ASC",
        );

        const rows = await fetchTransportViewRows({
          viewName: "vue_chauffeurs_jour",
          whereClauses: where.clauses,
          params: where.params,
          orderBy,
          limit: safeLimit,
          maxLimit: 100,
        });

        return createRowsResponse({
          viewName: "vue_chauffeurs_jour",
          rows,
          meta: {
            filters: {
              date_jour: dateClause?.value ?? null,
              code_chauffeur: codeClause?.value ?? null,
              nom_complet: nameClause?.value ?? null,
            },
            limit: safeLimit,
            sort_by: sort_by ?? null,
            order: order ? String(order).toLowerCase() : null,
          },
          emptyMessage: "Aucune donnee trouvee dans vue_chauffeurs_jour.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du chargement de vue_chauffeurs_jour: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
