import { z } from "zod";
import { apiRequest } from "../client.js";
import { getSession, updateSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const runSqlSchema = {
  sql: z
    .string()
    .describe(
      "SQL to execute (CREATE TABLE, ALTER TABLE, INSERT, SELECT, etc.).",
    ),
  project_id: z
    .string()
    .optional()
    .describe(
      "Project ID. If omitted, uses the current session project from bld402_create_project.",
    ),
};

export async function handleRunSql(args: {
  sql: string;
  project_id?: string;
}) {
  const session = getSession();
  const projectId = args.project_id || session.projectId;
  const serviceKey = session.serviceKey;

  if (!projectId || !serviceKey) {
    return error(
      `No active project. Run \`bld402_create_project\` first.`,
    );
  }

  const res = await apiRequest(
    `/projects/v1/admin/${projectId}/sql`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Bearer ${serviceKey}`,
      },
      rawBody: args.sql,
    },
  );

  if (!res.ok) return formatApiError(res, "running SQL");

  // Track created tables
  const tableMatches = args.sql.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi,
  );
  const newTables = [...tableMatches].map((m) => m[1]);
  if (newTables.length > 0) {
    const existing = session.tables || [];
    updateSession({ tables: [...existing, ...newTables] });
  }

  const lines = [`## SQL Executed`, ``];

  if (typeof res.body === "string") {
    lines.push(res.body);
  } else if (Array.isArray(res.body)) {
    // Format query results as markdown table
    const rows = res.body as Record<string, unknown>[];
    if (rows.length > 0) {
      const cols = Object.keys(rows[0]);
      lines.push(`| ${cols.join(" | ")} |`);
      lines.push(`| ${cols.map(() => "---").join(" | ")} |`);
      for (const row of rows.slice(0, 50)) {
        lines.push(
          `| ${cols.map((c) => String(row[c] ?? "")).join(" | ")} |`,
        );
      }
      if (rows.length > 50) {
        lines.push(`\n... and ${rows.length - 50} more rows`);
      }
    } else {
      lines.push(`Query returned no rows.`);
    }
  } else {
    lines.push("```json", JSON.stringify(res.body, null, 2), "```");
  }

  if (newTables.length > 0) {
    lines.push(
      ``,
      `Tables created: ${newTables.map((t) => `\`${t}\``).join(", ")}`,
      ``,
      `**Note:** Wait 500ms before the next API call to allow schema reload.`,
    );
  }

  return text(lines.join("\n"));
}
