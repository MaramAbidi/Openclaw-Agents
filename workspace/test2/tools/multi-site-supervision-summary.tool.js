import { z } from "zod";
import { getMultiSiteSupervisionSummaryByDateAndScope, normalizeIsoDate } from "../db/mysql.js";

const supervisionScopeSchema = z.enum([
  "global_status",
  "risk_ranking",
  "performance_ranking",
  "staffing",
  "urgent_pressure",
  "anomalies",
]);

export function registerMultiSiteSupervisionSummaryTool(server) {
  server.registerTool(
    "multi_site_supervision_summary",
    {
      title: "Multi Site Supervision Summary",
      description:
        "Returns structured JSON from v_multi_site_supervision_daily for a required date and scope. Use global_status for the cross-site overview, risk_ranking for the highest risk sites, performance_ranking for the performance ordering, staffing for headcount pressure, urgent_pressure for urgent order pressure, and anomalies for flagged or escalated sites.",
      inputSchema: z
        .object({
          date: z
            .string()
            .trim()
            .min(1, "Le champ date est obligatoire (YYYY-MM-DD).")
            .refine((value) => normalizeIsoDate(value) !== null, "La date doit etre au format YYYY-MM-DD.")
            .describe("Date obligatoire au format YYYY-MM-DD"),
          scope: supervisionScopeSchema.describe("Scope supervision"),
        })
        .strict(),
    },
    async ({ date, scope }) => {
      try {
        const safeDate = normalizeIsoDate(date);

        if (!safeDate) {
          return {
            content: [{ type: "text", text: "Date invalide. Utilisez le format YYYY-MM-DD." }],
            isError: true,
          };
        }

        const summary = await getMultiSiteSupervisionSummaryByDateAndScope({ date: safeDate, scope });
        if (!summary) {
          return {
            content: [{ type: "text", text: `Aucune donnee trouvee pour la date ${safeDate} et le scope ${scope}.` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
          structuredContent: summary,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du multi-site supervision summary: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
