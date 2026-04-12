import { z } from "zod";
import { getPreparationPaletteVolumeByDateAndSite } from "../db/mysql.js";
import { buildStatCard, imageContentFromBuffer } from "./image-utils.js";

export function registerVolumePreparationEnPaletteImageTool(server) {
  server.registerTool(
    "volume_de_preparation_en_palette_image",
    {
      title: "Volume palette — image PNG",
      description:
        "Génère et retourne une image PNG du volume total en palette (COUNT DISTINCT shpnum_0). Appeler OBLIGATOIREMENT cet outil quand l'utilisateur demande le volume en palette avec les mots: image, photo, graphique, en image, génère une image, envoie une image. Retourne un fichier PNG directement.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      try {
        const data = await getPreparationPaletteVolumeByDateAndSite();
        const today = new Date().toISOString().slice(0, 10);
        const buffer = buildStatCard({
          value: data.totalQty,
          label: "Palettes",
          date: today,
          site: null,
        });

        return {
          content: [imageContentFromBuffer(buffer)],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Erreur génération image palette: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
