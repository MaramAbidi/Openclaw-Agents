import { z } from "zod";
import { getPreparationVolumeByDateAndSite } from "../db/mysql.js";
import { buildStatCard, imageContentFromBuffer } from "./image-utils.js";
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

export function registerVolumePreparationEnCartonImageTool(server) {
  server.registerTool(
    "volume_de_preparation_en_carton_image",
    {
      title: "Volume cartons — image PNG",
      description:
        "Génère et retourne une image PNG du volume total en cartons pour une date et un site. Appeler OBLIGATOIREMENT cet outil quand l'utilisateur demande le volume en carton avec les mots: image, photo, graphique, en image, génère une image, envoie une image. Paramètres obligatoires: date (YYYY-MM-DD) et site (fcy_0). Retourne un fichier PNG directement.",
      inputSchema: z
        .object({
          date: z
            .string()
            .trim()
            .min(1, "Le champ date est obligatoire (YYYY-MM-DD).")
            .refine((v) => sanitizeIsoDate(v) !== null, "La date doit être au format YYYY-MM-DD.")
            .describe("Date obligatoire au format YYYY-MM-DD"),
          site: z
            .string()
            .trim()
            .min(1, "Le champ site est obligatoire.")
            .describe("Site obligatoire (colonne fcy_0)"),
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

        const data = await getPreparationVolumeByDateAndSite({ date: safeDate, site: safeSite });
        const buffer = buildStatCard({
          value: data.totalQty,
          label: "Cartons",
          date: data.usedDate ?? safeDate,
          site: data.usedSite ?? safeSite,
        });

        return {
          content: [imageContentFromBuffer(buffer)],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Erreur génération image cartons: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
