import { z } from "zod";
import { getPreparationPaletteVolumeByDateAndSite } from "../db/mysql.js";

export function registerVolumePreparationEnPaletteTool(server) {
  server.registerTool(
    "volume_de_preparation_en_palette",
    {
      title: "Volume de preparation en palette",
      description:
        "Calcule COUNT(DISTINCT(shpnum_0)) sur shipments. Aucun parametre obligatoire. Retour texte simple uniquement. Utiliser cet outil directement; ne pas lancer de commande shell ni analyser les fichiers pour recalculer.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      try {
        const { totalQty } = await getPreparationPaletteVolumeByDateAndSite();
        const formattedTotal = `${totalQty.toLocaleString("fr-FR")} palettes`;
        const message = `Result:
Total: ${formattedTotal}`;
        return {
          content: [{ type: "text", text: message }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Erreur lors du calcul du volume palette: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
