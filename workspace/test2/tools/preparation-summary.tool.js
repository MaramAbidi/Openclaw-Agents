import { z } from "zod";
import { getPreparationSummaryByDateAndSite } from "../db/mysql.js";
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

function pickSummary(values, type) {
  const selected = values?.[type];
  if (!selected) return null;

  return {
    to_prepare: selected.toPrepare,
    prepared: selected.prepared,
    remaining: selected.remaining,
    prepared_percent: selected.preparedPercent,
    remaining_percent: selected.remainingPercent,
    in_progress: selected.inProgress,
    waiting: selected.waiting,
  };
}

export function registerPreparationSummaryTool(server) {
  server.registerTool(
    "preparation_summary",
    {
      title: "Preparation Summary",
      description:
        "Returns the daily preparation summary from v_preparation_summary_family1 for a required date, site, and type (carton, palette, or magazin). The tool returns structured JSON and fails if no row exists.",
      inputSchema: z
        .object({
          date: z
            .string()
            .trim()
            .min(1, "Le champ date est obligatoire (YYYY-MM-DD).")
            .refine((value) => sanitizeIsoDate(value) !== null, "La date doit etre au format YYYY-MM-DD.")
            .describe("Date obligatoire au format YYYY-MM-DD"),
          site: z.string().trim().min(1, "Le champ site est obligatoire.").describe("Site obligatoire"),
          type: z.enum(["carton", "palette", "magazin"]).describe("Type de preparation"),
        })
        .strict(),
    },
    async ({ date, site, type }) => {
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

        const row = await getPreparationSummaryByDateAndSite({ date: safeDate, site: safeSite });
        if (!row) {
          return {
            content: [
              {
                type: "text",
                text: `Aucune ligne trouvee pour la date ${safeDate} et le site ${safeSite}.`,
              },
            ],
            isError: true,
          };
        }

        const summary = pickSummary(row.values, type);
        if (!summary) {
          return {
            content: [{ type: "text", text: `Type invalide: ${type}` }],
            isError: true,
          };
        }

        const structuredContent = {
          date: row.date,
          site: row.site,
          type,
          ...summary,
          last_update: row.lastUpdate,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors de la preparation summary: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
