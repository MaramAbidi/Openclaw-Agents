import { z } from "zod";
import { getKpiHourlyPerformanceByDateAndSite, normalizeIsoDate } from "../db/mysql.js";
import { normalizeSiteInput } from "./site-utils.js";

export function registerPerformanceHourlyKpiTool(server) {
  server.registerTool(
    "performance_hourly_kpi",
    {
      title: "Hourly KPI Performance",
      description:
        "Returns hourly performance KPIs from v_kpi_hourly_performance for a required date and site. Use this for questions about preparation rate per hour, lines prepared per hour, or orders prepared per hour.",
      inputSchema: z
        .object({
          date: z
            .string()
            .trim()
            .min(1, "Le champ date est obligatoire (YYYY-MM-DD).")
            .refine((value) => normalizeIsoDate(value) !== null, "La date doit etre au format YYYY-MM-DD.")
            .describe("Date obligatoire au format YYYY-MM-DD"),
          site: z.string().trim().min(1, "Le champ site est obligatoire.").describe("Site obligatoire"),
        })
        .strict(),
    },
    async ({ date, site }) => {
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

        const result = await getKpiHourlyPerformanceByDateAndSite({ date: safeDate, site: safeSite });
        if (!result) {
          return {
            content: [{ type: "text", text: `Aucune donnee KPI trouvee pour ${safeDate} et ${safeSite}.` }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: `Hourly KPI ready for ${safeDate} | ${safeSite}.` }],
          structuredContent: result,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du hourly KPI: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
