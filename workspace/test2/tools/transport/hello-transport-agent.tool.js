import { z } from "zod";

export function registerHelloTransportAgentTool(server) {
  server.registerTool(
    "hello_transport_agent",
    {
      title: "Hello Transport Agent",
      description: "Simple test tool to validate routing to the transport agent.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: "Hi, I am Transport Agent.",
          },
        ],
      };
    },
  );
}
