import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tool-registry.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ensure DB env vars are loaded even when the MCP server is spawned from another working dir.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const server = new McpServer(
  {
    name: "lumicore-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
