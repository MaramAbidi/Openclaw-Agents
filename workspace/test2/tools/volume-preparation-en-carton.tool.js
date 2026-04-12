import { z } from "zod";
import { getPreparationVolumeByDateAndSite } from "../db/mysql.js";
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

export function registerVolumePreparationEnCartonTool(server) {
  const dateSchema = z
    .string()
    .trim()
    .min(1, "Le champ date est obligatoire (YYYY-MM-DD).")
    .refine((value) => sanitizeIsoDate(value) !== null, "La date doit etre au format YYYY-MM-DD.");

  const siteSchema = z
    .string()
    .trim()
    .min(1, "Le champ site est obligatoire.");

  server.registerTool(
    "volume_de_preparation_en_carton",
    {
      title: "Volume de preparation en carton",
      description:
        "Calcule le total mysum (cartons) pour une date et un site. Parametres obligatoires: date (YYYY-MM-DD) et site (fcy_0). Appelle immediatement cet outil sans poser de questions supplementaires. Reponds toujours en une seule ligne courte.",
      inputSchema: z
        .object({
          date: dateSchema.describe("Date obligatoire au format YYYY-MM-DD"),
          site: siteSchema.describe("Site obligatoire (colonne fcy_0)"),
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

        if (safeSite.length === 0) {
          return {
            content: [{ type: "text", text: "Site obligatoire. Fournissez une valeur pour le site." }],
            isError: true,
          };
        }

        const { totalQty, usedDate, usedSite } = await getPreparationVolumeByDateAndSite({
          date: safeDate,
          site: safeSite,
        });
        const usedDateValue = usedDate ?? safeDate;
        const usedSiteValue = usedSite ?? safeSite;
        const formattedTotal = `${totalQty.toLocaleString("fr-FR")} cartons`;
        const message = `${usedSiteValue} | ${usedDateValue} | ${formattedTotal}`;
        return {
          content: [{ type: "text", text: message }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du calcul du volume: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
