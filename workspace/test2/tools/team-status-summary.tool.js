import { z } from "zod";
import { getTeamStatusSummaryByDateAndSite } from "../db/mysql.js";
import { normalizeSiteInput } from "./site-utils.js";

function sanitizeIsoDate(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const dt = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
}

export function registerTeamStatusSummaryTool(server) {
  server.registerTool(
    "team_status_summary",
    {
      title: "Team Status Summary",
      description:
        "Returns the daily team management status from v_team_status_daily for a required date and site. The tool aggregates present, absent, available, busy, blocked, and inactive pickers into structured JSON.",
      inputSchema: z
        .object({
          date: z
            .string()
            .trim()
            .min(1, "Le champ date est obligatoire (YYYY-MM-DD).")
            .refine((value) => sanitizeIsoDate(value) !== null, "La date doit etre au format YYYY-MM-DD.")
            .describe("Date obligatoire au format YYYY-MM-DD"),
          site: z.string().trim().min(1, "Le champ site est obligatoire.").describe("Site obligatoire"),
        })
        .strict(),
    },
    async ({ date, site }) => {
      try {
        const safeDate = sanitizeIsoDate(date);
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

        const summary = await getTeamStatusSummaryByDateAndSite({ date: safeDate, site: safeSite });
        if (!summary) {
          return {
            content: [{ type: "text", text: `Aucune donnee trouvee pour la date ${safeDate} et le site ${safeSite}.` }],
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
          content: [{ type: "text", text: `Erreur lors du team status summary: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
