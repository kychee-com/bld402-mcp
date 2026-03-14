import { z } from "zod";
import { apiRequest } from "../client.js";
import { getSession, updateSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const setupRlsSchema = {
  template: z
    .enum(["user_owns_rows", "public_read", "public_read_write"])
    .describe(
      "RLS template: user_owns_rows (users access own rows, requires owner_column), " +
        "public_read (anyone reads, authenticated users write), " +
        "public_read_write (anyone reads and writes).",
    ),
  tables: z
    .array(
      z.object({
        table: z.string().describe("Table name"),
        owner_column: z
          .string()
          .optional()
          .describe(
            "Column containing user ID (required for user_owns_rows template)",
          ),
      }),
    )
    .describe("Tables to apply RLS policies to."),
  project_id: z
    .string()
    .optional()
    .describe(
      "Project ID. If omitted, uses the current session project.",
    ),
};

export async function handleSetupRls(args: {
  template: string;
  tables: Array<{ table: string; owner_column?: string }>;
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
    `/projects/v1/admin/${projectId}/rls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
      },
      body: {
        template: args.template,
        tables: args.tables,
      },
    },
  );

  if (!res.ok) return formatApiError(res, "setting up RLS");

  const body = res.body as {
    status: string;
    template: string;
    tables: string[];
  };

  // Track RLS config
  const existing = session.rlsConfig || {};
  for (const t of body.tables || args.tables.map((t) => t.table)) {
    existing[t] = args.template;
  }
  updateSession({ rlsConfig: existing });

  const lines = [
    `## RLS Applied`,
    ``,
    `Template **${body.template || args.template}** applied to: ${(body.tables || args.tables.map((t) => t.table)).map((t) => `\`${t}\``).join(", ")}`,
    ``,
  ];

  switch (args.template) {
    case "public_read":
      lines.push(
        `Everyone can read. Only signed-in users can create/edit/delete.`,
      );
      break;
    case "public_read_write":
      lines.push(`Everyone can read and write — no sign-in needed.`);
      break;
    case "user_owns_rows":
      lines.push(`Each user can only see and edit their own rows.`);
      break;
  }

  return text(lines.join("\n"));
}
