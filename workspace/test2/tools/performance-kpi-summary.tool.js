import { z } from "zod";
import { getKpiSummaryByDateAndSite, normalizeIsoDate } from "../db/mysql.js";
import { normalizeSiteInput } from "./site-utils.js";

const scopeSchema = z.enum([
  "daily_summary",
  "picker_productivity",
  "zone_productivity",
  "site_productivity",
  "quality_service",
]);

export function registerPerformanceKpiSummaryTool(server) {
  server.registerTool(
    "performance_kpi_summary",
    {
      title: "Performance KPI Summary",
      description:
        "Returns KPI summaries from v_kpi_daily_summary, v_kpi_productivity_daily, or v_kpi_quality_service_daily depending on scope. Use daily_summary for the main indicators, picker_productivity for picker rows, zone_productivity for zone aggregates, site_productivity for site totals, and quality_service for quality/service indicators.",
      inputSchema: z
        .object({
          date: z
            .string()
            .trim()
            .min(1, "Le champ date est obligatoire (YYYY-MM-DD).")
            .refine((value) => normalizeIsoDate(value) !== null, "La date doit etre au format YYYY-MM-DD.")
            .describe("Date obligatoire au format YYYY-MM-DD"),
          site: z.string().trim().min(1, "Le champ site est obligatoire.").describe("Site obligatoire"),
          scope: scopeSchema.describe("Scope KPI"),
        })
        .strict(),
    },
    async ({ date, site, scope }) => {
      try {
        const safeDate = normalizeIsoDate(date);
        const safeSite = normalizeSiteInput(site);

        if (!safeDate) {
          return {
            content: [{ type: "text", text: "Date invalide. Utilisez le format YYYY-MM-DD." }],
            isError: true,
          };
        }

        if (!safeSite) {
          return {
            content: [{ type: "text", text: "Site obligatoire. Fournissez une valeur pour le site." }],
            isError: true,
          };
        }

        const result = await getKpiSummaryByDateAndSite({ date: safeDate, site: safeSite, scope });
        if (!result) {
          return {
            content: [{ type: "text", text: `Aucune donnee KPI trouvee pour ${safeDate}, ${safeSite}, scope=${scope}.` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: `KPI summary ready for ${safeDate} | ${safeSite} | ${scope}.` }],
          structuredContent: result,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du KPI summary: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
