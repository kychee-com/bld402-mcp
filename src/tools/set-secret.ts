import { z } from "zod";
import { apiRequest } from "../client.js";
import { getSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const setSecretSchema = {
  key: z
    .string()
    .describe(
      "Secret key (uppercase + underscores, e.g. 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY')",
    ),
  value: z
    .string()
    .describe("Secret value. Injected as process.env in serverless functions."),
  project_id: z
    .string()
    .optional()
    .describe("Project ID. If omitted, uses the current session project."),
};

export async function handleSetSecret(args: {
  key: string;
  value: string;
  project_id?: string;
}) {
  const session = getSession();
  const projectId = args.project_id || session.projectId;
  const serviceKey = session.serviceKey;

  if (!projectId || !serviceKey) {
    return error(`No active project. Run \`bld402_create_project\` first.`);
  }

  const res = await apiRequest(
    `/projects/v1/admin/${projectId}/secrets`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}` },
      body: { key: args.key, value: args.value },
    },
  );

  if (!res.ok) return formatApiError(res, "setting secret");

  return text(
    `## Secret Set\n\nSecret \`${args.key}\` saved for project \`${projectId}\`.\n\nAccess it in functions via \`process.env.${args.key}\`.`,
  );
}
