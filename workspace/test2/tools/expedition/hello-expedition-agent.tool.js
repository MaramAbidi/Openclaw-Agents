import { z } from "zod";

export function registerHelloExpeditionAgentTool(server) {
  server.registerTool(
    "hello_expedition_agent",
    {
      title: "Hello Expedition Agent",
      description: "Simple test tool to validate routing to the expedition agent.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: "Hi, I am Expedition Agent.",
          },
        ],
      };
    },
  );
}
