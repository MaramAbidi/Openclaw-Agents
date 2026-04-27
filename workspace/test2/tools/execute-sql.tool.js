import { z } from "zod";
import { classifySql, executeSql } from "../db/mysql.js";

function buildPreviewSql(sql) {
  const trimmed = typeof sql === "string" ? sql.trim() : "";
  return trimmed.endsWith(";") ? trimmed : `${trimmed};`;
}

function limitRows(rows, limit = 50) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const truncated = safeRows.length > limit;
  return {
    rows: truncated ? safeRows.slice(0, limit) : safeRows,
    truncated,
    rowCount: safeRows.length,
  };
}

export function registerExecuteSqlTool(server) {
  server.registerTool(
    "execute_sql",
    {
      title: "Execute SQL",
      description:
        "Preview and execute any single SQL statement against the LumiCore MySQL database. Read-only queries run immediately. Mutating statements require confirm=true after explicit user approval. Always return the real row count or affected rows.",
      inputSchema: z
        .object({
          sql: z.string().trim().min(1, "SQL is required."),
          confirm: z.boolean().optional().default(false),
        })
        .strict(),
    },
    async ({ sql, confirm = false }) => {
      const normalizedSql = sql.trim();
      const previewSql = buildPreviewSql(normalizedSql);
      const classification = classifySql(normalizedSql);

      try {
        if (classification.isMutating && !confirm) {
          return {
            content: [
              {
                type: "text",
                text: "Preview only. Confirm explicitly to execute this mutating SQL.",
              },
            ],
            structuredContent: {
              status: "preview",
              previewSql,
              confirm: false,
              keyword: classification.keyword,
              isReadOnly: false,
              isMutating: true,
            },
          };
        }

        const result = await executeSql(normalizedSql);

        if (result.kind === "rows") {
          const { rows, truncated, rowCount } = limitRows(result.rows, 50);
          return {
            content: [{ type: "text", text: `Returned ${rowCount} row(s).` }],
            structuredContent: {
              status: "ok",
              previewSql,
              confirm,
              keyword: classification.keyword,
              isReadOnly: classification.isReadOnly,
              isMutating: classification.isMutating,
              rowCount,
              truncated,
              rows,
              fields: result.fields,
            },
          };
        }

        if (Number(result.affectedRows ?? 0) <= 0) {
          return {
            content: [{ type: "text", text: "The SQL ran but changed 0 rows." }],
            structuredContent: {
              status: "no_rows_changed",
              previewSql,
              confirm,
              keyword: classification.keyword,
              isReadOnly: classification.isReadOnly,
              isMutating: classification.isMutating,
              affectedRows: 0,
              insertId: Number(result.insertId ?? 0),
              warningStatus: Number(result.warningStatus ?? 0),
              info: result.info,
            },
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: `Updated ${result.affectedRows} row(s).` }],
          structuredContent: {
            status: "updated",
            previewSql,
            confirm,
            keyword: classification.keyword,
            isReadOnly: classification.isReadOnly,
            isMutating: classification.isMutating,
            affectedRows: Number(result.affectedRows ?? 0),
            insertId: Number(result.insertId ?? 0),
            warningStatus: Number(result.warningStatus ?? 0),
            info: result.info,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error";
        return {
          content: [{ type: "text", text: `Database error: ${message}` }],
          structuredContent: {
            status: "error",
            previewSql,
            confirm,
            keyword: classification.keyword,
            isReadOnly: classification.isReadOnly,
            isMutating: classification.isMutating,
            error: message,
          },
          isError: true,
        };
      }
    },
  );
}
