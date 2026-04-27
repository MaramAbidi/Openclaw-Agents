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
  type_alerte: "type_alerte",
};

const sortBySchema = z.enum(["date_jour", "type_entite", "reference_entite", "type_alerte"]);

function appendEntityFilter(where, { typeEntite, reference }) {
  if (!reference) return;
  appendClause(where, buildTextClause("reference_entite", reference));
  if (typeEntite) {
    appendClause(where, {
      clause: "LOWER(TRIM(type_entite)) = ?",
      params: [typeEntite.toLowerCase()],
    });
  }
}

export function registerVueAlertesTool(server) {
  server.registerTool(
    "vue_alertes",
    {
      title: "Vue Alertes",
      description:
        "Returns transport alerts and anomalies from vue_alertes. Use it for critical points, alerts, exceptions, and anomaly follow-up.",
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
          type_entite: z.enum(["camion", "chauffeur"]).optional().describe("Optional entity type filter"),
          type_alerte: z.string().trim().min(1).optional().describe("Optional alert type filter"),
          limit: z.number().int().min(1).max(100).optional().describe("Optional result limit"),
          sort_by: sortBySchema.optional().describe("Optional sort column"),
          order: z.enum(["asc", "desc"]).optional().describe("Optional sort direction"),
        })
        .strict(),
    },
    async ({
      date_jour,
      immatriculation,
      code_chauffeur,
      nom_complet,
      type_entite,
      type_alerte,
      limit,
      sort_by,
      order,
    } = {}) => {
      try {
        const where = { clauses: [], params: [] };
        const dateClause = buildDateClause("date_jour", date_jour);
        appendClause(where, dateClause);

        appendEntityFilter(where, { typeEntite: type_entite ?? null, reference: immatriculation ?? null });
        appendEntityFilter(where, { typeEntite: type_entite ?? "chauffeur", reference: code_chauffeur ?? null });
        appendEntityFilter(where, { typeEntite: type_entite ?? "chauffeur", reference: nom_complet ?? null });

        if (type_alerte) {
          appendClause(where, buildTextClause("type_alerte", type_alerte));
        }

        const safeLimit = normalizeLimit(limit, 25, 100);
        const orderBy = resolveSortExpression(
          sort_by,
          order,
          sortMap,
          "CASE type_alerte WHEN 'aucun_voyage' THEN 1 WHEN 'retard_entree' THEN 2 WHEN 'sur_exploitation' THEN 3 WHEN 'faible_performance' THEN 4 ELSE 9 END, date_jour DESC, type_entite ASC, reference_entite ASC",
        );

        const rows = await fetchTransportViewRows({
          viewName: "vue_alertes",
          whereClauses: where.clauses,
          params: where.params,
          orderBy,
          limit: safeLimit,
          maxLimit: 100,
        });

        return createRowsResponse({
          viewName: "vue_alertes",
          rows,
          meta: {
            filters: {
              date_jour: dateClause?.value ?? null,
              immatriculation: immatriculation ?? null,
              code_chauffeur: code_chauffeur ?? null,
              nom_complet: nom_complet ?? null,
              type_entite: type_entite ?? null,
              type_alerte: type_alerte ?? null,
            },
            limit: safeLimit,
            sort_by: sort_by ?? null,
            order: order ? String(order).toLowerCase() : null,
          },
          emptyMessage: "Aucune donnee trouvee dans vue_alertes.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du chargement de vue_alertes: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
