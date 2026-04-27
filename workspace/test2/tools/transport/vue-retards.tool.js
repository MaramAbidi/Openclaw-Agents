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
  retard_entree_min: "retard_entree_min",
  retard_sortie_min: "retard_sortie_min",
  en_retard_entree: "en_retard_entree",
};

const sortBySchema = z.enum([
  "date_jour",
  "code_chauffeur",
  "nom_complet",
  "retard_entree_min",
  "retard_sortie_min",
  "en_retard_entree",
]);

export function registerVueRetardsTool(server) {
  server.registerTool(
    "vue_retards",
    {
      title: "Vue Retards",
      description:
        "Returns the driver delay breakdown from vue_retards. Use it for late arrivals, late departures, and operational delay analysis.",
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
          "retard_entree_min DESC, retard_sortie_min DESC, nom_complet ASC",
        );

        const rows = await fetchTransportViewRows({
          viewName: "vue_retards",
          whereClauses: where.clauses,
          params: where.params,
          orderBy,
          limit: safeLimit,
          maxLimit: 100,
        });

        return createRowsResponse({
          viewName: "vue_retards",
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
          emptyMessage: "Aucune donnee trouvee dans vue_retards.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du chargement de vue_retards: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
