import { z } from "zod";
import {
  appendClause,
  buildDateClause,
  createSingleRowResponse,
  fetchTransportViewRows,
  sanitizeIsoDate,
} from "./transport-view-utils.js";

export function registerVueResumeJourTool(server) {
  server.registerTool(
    "vue_resume_jour",
    {
      title: "Vue Resume Jour",
      description:
        "Returns the manager daily transport summary from vue_resume_jour. Use it for the day recap, top truck, top driver, alerts count, and overall transport status.",
      inputSchema: z
        .object({
          date_jour: z
            .string()
            .trim()
            .min(1)
            .refine((value) => sanitizeIsoDate(value) !== null, "The date must use YYYY-MM-DD.")
            .optional()
            .describe("Optional date filter in YYYY-MM-DD format"),
        })
        .strict(),
    },
    async ({ date_jour } = {}) => {
      try {
        const where = { clauses: [], params: [] };
        const dateClause = buildDateClause("date_jour", date_jour);
        appendClause(where, dateClause);

        const rows = await fetchTransportViewRows({
          viewName: "vue_resume_jour",
          whereClauses: where.clauses,
          params: where.params,
          orderBy: "DATE(date_jour) DESC",
          limit: 1,
          maxLimit: 1,
        });

        return createSingleRowResponse({
          viewName: "vue_resume_jour",
          row: rows[0] ?? null,
          meta: {
            filters: {
              date_jour: dateClause?.value ?? null,
            },
          },
          emptyMessage: "Aucune donnee trouvee dans vue_resume_jour.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du chargement de vue_resume_jour: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
