import { z } from "zod";
import {
  getPreparationVolumeByMagazinDistinct,
  getPreparationPaletteVolumeByDateAndSite,
  getPreparationVolumeByDateAndSite,
} from "../db/mysql.js";
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

export function registerVolumePreparationTool(server) {
  const dateSchema = z
    .string()
    .trim()
    .optional();

  const siteSchema = z
    .string()
    .trim()
    .optional();

  server.registerTool(
    "volume_de_preparation",
    {
      title: "Volume de preparation",
      description:
        "Tool generique. Si le type n'est pas precise, utiliser carton par defaut. Pour carton: date et site obligatoires. Pour palette: COUNT(DISTINCT(shpnum_0)) sans parametres obligatoires. Pour magazin: COUNT(DISTINCT(dlvnam_1)) sans parametres obligatoires. Appeler cet outil directement et ne pas utiliser de shell pour recalculer.",
      inputSchema: z
        .object({
          date: dateSchema.describe("Date au format YYYY-MM-DD (obligatoire pour carton)"),
          site: siteSchema.describe("Site (colonne fcy_0, obligatoire pour carton)"),
          type: z
            .enum(["carton", "palette", "magazin"])
            .optional()
            .describe("Type de preparation (defaut: carton)"),
        })
        .strict(),
    },
    async ({ date, site, type }) => {
      try {
        const safeDate = sanitizeIsoDate(date);
        const safeSite = normalizeSiteInput(site);
        const safeType = type === "palette" || type === "magazin" ? type : "carton";

        if (safeType === "palette") {
          const data = await getPreparationPaletteVolumeByDateAndSite();
          const formattedTotal = `${data.totalQty.toLocaleString("fr-FR")} palettes`;
          return {
            content: [
              {
                type: "text",
                text: `Result:

Type: ${safeType}
Total: ${formattedTotal}`,
              },
            ],
          };
        }

        if (safeType === "magazin") {
          const data = await getPreparationVolumeByMagazinDistinct();
          const formattedTotal = `${data.totalQty.toLocaleString("fr-FR")} magazins`;
          return {
            content: [
              {
                type: "text",
                text: `Result:

Type: ${safeType}
Total: ${formattedTotal}`,
              },
            ],
          };
        }

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

        const data = await getPreparationVolumeByDateAndSite({ date: safeDate, site: safeSite });

        const usedDateValue = data.usedDate ?? safeDate;
        const usedSiteValue = data.usedSite ?? safeSite;
        const formattedTotal = `${data.totalQty.toLocaleString("fr-FR")} cartons`;

        return {
          content: [
            {
              type: "text",
              text: `Result:

Site: ${usedSiteValue}
Date: ${usedDateValue}
Type: ${safeType}
Total: ${formattedTotal}`,
            },
          ],
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
