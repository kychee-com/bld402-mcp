import { z } from "zod";
import { apiRequest } from "../client.js";
import { getSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const getFunctionLogsSchema = {
  name: z.string().describe("Function name to get logs for"),
  tail: z
    .number()
    .optional()
    .describe("Number of log lines to return (default: 50, max: 200)"),
  project_id: z
    .string()
    .optional()
    .describe("Project ID. If omitted, uses the current session project."),
};

export async function handleGetFunctionLogs(args: {
  name: string;
  tail?: number;
  project_id?: string;
}) {
  const session = getSession();
  const projectId = args.project_id || session.projectId;
  const serviceKey = session.serviceKey;

  if (!projectId || !serviceKey) {
    return error(`No active project. Run \`bld402_create_project\` first.`);
  }

  const tail = args.tail || 50;

  const res = await apiRequest(
    `/projects/v1/admin/${projectId}/functions/${encodeURIComponent(args.name)}/logs?tail=${tail}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${serviceKey}` },
    },
  );

  if (!res.ok) return formatApiError(res, "fetching function logs");

  const body = res.body as {
    logs: Array<{ timestamp: string; message: string }>;
  };
  const logs = body.logs || [];

  if (logs.length === 0) {
    return text(
      `## Function Logs: ${args.name}\n\n_No logs found. The function may not have been invoked yet._`,
    );
  }

  const logLines = logs.map((l) => `[${l.timestamp}] ${l.message}`);

  const lines = [
    `## Function Logs: ${args.name}`,
    ``,
    "```",
    ...logLines,
    "```",
    ``,
    `_${logs.length} log entries_`,
  ];

  return text(lines.join("\n"));
}
