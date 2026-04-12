import { z } from "zod";
import { getPreparationVolumeByMagazinDistinct } from "../db/mysql.js";
import { buildStatCard, imageContentFromBuffer } from "./image-utils.js";

export function registerVolumePreparationParMagazinImageTool(server) {
  server.registerTool(
    "volume_de_preparation_par_magazin_image",
    {
      title: "Volume magasins — image PNG",
      description:
        "Génère et retourne une image PNG du nombre de magasins actifs (COUNT DISTINCT dlvnam_1). Appeler OBLIGATOIREMENT cet outil quand l'utilisateur demande le volume par magasin avec les mots: image, photo, graphique, en image, génère une image, envoie une image. Retourne un fichier PNG directement.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      try {
        const data = await getPreparationVolumeByMagazinDistinct();
        const today = new Date().toISOString().slice(0, 10);
        const buffer = buildStatCard({
          value: data.totalQty,
          label: "Magasins actifs",
          date: today,
          site: null,
        });

        return {
          content: [imageContentFromBuffer(buffer)],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Erreur génération image magasins: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
