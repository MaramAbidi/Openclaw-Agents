import { registerGetCurrentDateTool } from "./tools/get-current-date.tool.js";
import { registerListRecentShipmentsTool } from "./tools/list-recent-shipments.tool.js";
import { registerVolumePreparationTool } from "./tools/volume-preparation.tool.js";
import { registerVolumePreparationEnCartonTool } from "./tools/volume-preparation-en-carton.tool.js";
import { registerVolumePreparationEnPaletteTool } from "./tools/volume-preparation-en-palette.tool.js";
import { registerVolumePreparationParMagazinTool } from "./tools/volume-preparation-par-magazin.tool.js";
import { registerVolumePreparationEnCartonImageTool } from "./tools/volume-preparation-en-carton-image.tool.js";
import { registerVolumePreparationEnPaletteImageTool } from "./tools/volume-preparation-en-palette-image.tool.js";
import { registerVolumePreparationParMagazinImageTool } from "./tools/volume-preparation-par-magazin-image.tool.js";
import { registerHelloReceptionAgentTool } from "./tools/reception/hello-reception-agent.tool.js";
import { registerHelloExpeditionAgentTool } from "./tools/expedition/hello-expedition-agent.tool.js";

export function registerAllTools(server) {
  registerGetCurrentDateTool(server);
  registerListRecentShipmentsTool(server);
  registerVolumePreparationTool(server);
  registerVolumePreparationEnCartonTool(server);
  registerVolumePreparationEnPaletteTool(server);
  registerVolumePreparationParMagazinTool(server);
  registerVolumePreparationEnCartonImageTool(server);
  registerVolumePreparationEnPaletteImageTool(server);
  registerVolumePreparationParMagazinImageTool(server);
  registerHelloReceptionAgentTool(server);
  registerHelloExpeditionAgentTool(server);
}
