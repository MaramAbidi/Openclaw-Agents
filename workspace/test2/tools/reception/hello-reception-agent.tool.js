import { z } from "zod";

export function registerHelloReceptionAgentTool(server) {
  server.registerTool(
    "hello_reception_agent",
    {
      title: "Hello Reception Agent",
      description: "Simple test tool to validate routing to the reception agent.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: "Hi, I am Reception Agent.",
          },
        ],
      };
    },
  );
}
