import { z } from "zod";
import { apiRequest } from "../client.js";
import { getSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const invokeFunctionSchema = {
  name: z.string().describe("Function name to invoke"),
  method: z
    .string()
    .optional()
    .describe("HTTP method (default: POST)"),
  body: z
    .union([z.string(), z.record(z.unknown())])
    .optional()
    .describe("Request body (string or JSON object)"),
  headers: z
    .record(z.string())
    .optional()
    .describe("Additional request headers"),
  project_id: z
    .string()
    .optional()
    .describe("Project ID. If omitted, uses the current session project."),
};

export async function handleInvokeFunction(args: {
  name: string;
  method?: string;
  body?: string | Record<string, unknown>;
  headers?: Record<string, string>;
  project_id?: string;
}) {
  const session = getSession();
  const serviceKey = session.serviceKey;

  if (!serviceKey) {
    return error(`No active project. Run \`bld402_create_project\` first.`);
  }

  const method = args.method || "POST";
  const requestHeaders: Record<string, string> = {
    apikey: serviceKey,
    ...(args.headers || {}),
  };

  const startTime = Date.now();

  const res = await apiRequest(`/functions/v1/${args.name}`, {
    method,
    headers: requestHeaders,
    body: method !== "GET" && method !== "HEAD" ? args.body : undefined,
  });

  const durationMs = Date.now() - startTime;

  if (!res.ok) return formatApiError(res, "invoking function");

  const bodyStr =
    typeof res.body === "string"
      ? res.body
      : JSON.stringify(res.body, null, 2);

  const lines = [
    `## Function Response`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| status | ${res.status} |`,
    `| duration | ${durationMs}ms |`,
    ``,
    `**Response:**`,
    "```json",
    bodyStr,
    "```",
  ];

  return text(lines.join("\n"));
}
