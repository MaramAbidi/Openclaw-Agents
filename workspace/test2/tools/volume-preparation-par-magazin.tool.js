import { z } from "zod";
import { getPreparationVolumeByMagazinDistinct } from "../db/mysql.js";

export function registerVolumePreparationParMagazinTool(server) {
  server.registerTool(
    "volume_de_preparation_par_magazin",
    {
      title: "Volume de preparation par magazin",
      description:
        "Calcule COUNT(DISTINCT(dlvnam_1)) depuis shipments. Aucun parametre obligatoire. Retour texte simple uniquement. Utiliser cet outil directement; ne pas lancer de commande shell ni analyser les fichiers pour recalculer.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      try {
        const { totalQty } = await getPreparationVolumeByMagazinDistinct();
        const formattedTotal = `${totalQty.toLocaleString("fr-FR")} magazins`;
        const message = `Result:

Type: magazin
Total: ${formattedTotal}`;
        return {
          content: [{ type: "text", text: message }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du calcul du volume magazin: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
