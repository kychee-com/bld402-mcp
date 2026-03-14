import { z } from "zod";
import { apiRequest } from "../client.js";
import { getSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const deployFunctionSchema = {
  name: z
    .string()
    .describe(
      "Function name (URL-safe slug: lowercase, hyphens, e.g. 'create-note')",
    ),
  code: z
    .string()
    .describe(
      "TypeScript/JavaScript source. Must export default: export default async (req: Request) => Response. Pre-bundled: stripe, openai, @anthropic-ai/sdk, resend, zod, uuid, jsonwebtoken, bcryptjs, cheerio, csv-parse.",
    ),
  config: z
    .object({
      timeout: z
        .number()
        .optional()
        .describe("Timeout in seconds (default: tier max)"),
      memory: z
        .number()
        .optional()
        .describe("Memory in MB (default: tier max)"),
    })
    .optional()
    .describe("Optional function configuration"),
  project_id: z
    .string()
    .optional()
    .describe("Project ID. If omitted, uses the current session project."),
};

export async function handleDeployFunction(args: {
  name: string;
  code: string;
  config?: { timeout?: number; memory?: number };
  project_id?: string;
}) {
  const session = getSession();
  const projectId = args.project_id || session.projectId;
  const serviceKey = session.serviceKey;

  if (!projectId || !serviceKey) {
    return error(`No active project. Run \`bld402_create_project\` first.`);
  }

  const res = await apiRequest(
    `/projects/v1/admin/${projectId}/functions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}` },
      body: {
        name: args.name,
        code: args.code,
        config: args.config,
      },
    },
  );

  if (!res.ok) return formatApiError(res, "deploying function");

  const body = res.body as {
    name: string;
    url: string;
    status: string;
    runtime: string;
    timeout: number;
    memory: number;
  };

  const lines = [
    `## Function Deployed`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| name | \`${body.name}\` |`,
    `| url | ${body.url} |`,
    `| status | ${body.status} |`,
    `| runtime | ${body.runtime} |`,
    `| timeout | ${body.timeout}s |`,
    `| memory | ${body.memory}MB |`,
    ``,
    `Invoke with \`bld402_invoke_function\` or from the frontend via \`/functions/v1/${body.name}\`.`,
  ];

  return text(lines.join("\n"));
}
