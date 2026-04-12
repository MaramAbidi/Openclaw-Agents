import { z } from "zod";

export function registerGetCurrentDateTool(server) {
  server.registerTool(
    "get_current_date",
    {
      title: "Get current date",
      description:
        "Returns today's date, yesterday's date, and the current UTC timestamp. Use this before resolving relative dates like today/yesterday.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().slice(0, 10);

      return {
        content: [
          {
            type: "text",
            text: `today=${today}, yesterday=${yesterday}, utcNow=${now.toISOString()}`,
          },
        ],
        structuredContent: {
          today,
          yesterday,
          utcNow: now.toISOString(),
        },
      };
    },
  );
}
