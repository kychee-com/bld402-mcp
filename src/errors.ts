export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function formatApiError(
  res: { status: number; body: unknown },
  context: string,
): ToolResult {
  const body =
    res.body && typeof res.body === "object"
      ? (res.body as Record<string, unknown>)
      : null;

  const primary = body
    ? (body.message as string) || (body.error as string) || "Unknown error"
    : typeof res.body === "string"
      ? (res.body as string)
      : "Unknown error";

  const lines: string[] = [
    `Error ${context}: ${primary} (HTTP ${res.status})`,
  ];

  if (body) {
    if (body.hint) lines.push(`Hint: ${body.hint}`);
    if (body.retry_after)
      lines.push(`Retry after: ${body.retry_after} seconds`);
  }

  switch (res.status) {
    case 401:
      lines.push(
        `\nNext step: Check wallet or service key. Re-run \`bld402_setup\` if needed.`,
      );
      break;
    case 403:
      lines.push(
        `\nNext step: Tier may have expired. Re-run \`bld402_setup\` to renew.`,
      );
      break;
    case 404:
      lines.push(
        `\nNext step: Check that the resource name and project ID are correct.`,
      );
      break;
    case 429:
      lines.push(`\nNext step: Rate limit hit. Wait and retry.`);
      break;
    default:
      if (res.status >= 500) {
        lines.push(`\nNext step: Server error. Try again in a moment.`);
      }
  }

  return { content: [{ type: "text", text: lines.join("\n") }], isError: true };
}

export function text(msg: string): ToolResult {
  return { content: [{ type: "text", text: msg }] };
}

export function error(msg: string): ToolResult {
  return { content: [{ type: "text", text: msg }], isError: true };
}
