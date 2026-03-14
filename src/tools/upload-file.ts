import { z } from "zod";
import { apiRequest } from "../client.js";
import { getSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const uploadFileSchema = {
  bucket: z.string().describe("Storage bucket name"),
  path: z
    .string()
    .describe("File path within the bucket (e.g. 'images/logo.png')"),
  content: z.string().describe("File content (text or base64-encoded)"),
  content_type: z
    .string()
    .default("text/plain")
    .describe("MIME type (default: text/plain)"),
  project_id: z
    .string()
    .optional()
    .describe("Project ID. If omitted, uses the current session project."),
};

export async function handleUploadFile(args: {
  bucket: string;
  path: string;
  content: string;
  content_type?: string;
  project_id?: string;
}) {
  const session = getSession();
  const anonKey = session.anonKey;

  if (!anonKey) {
    return error(`No active project. Run \`bld402_create_project\` first.`);
  }

  const contentType = args.content_type || "text/plain";

  const res = await apiRequest(
    `/storage/v1/object/${args.bucket}/${args.path}`,
    {
      method: "POST",
      rawBody: args.content,
      headers: {
        "Content-Type": contentType,
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
  );

  if (!res.ok) return formatApiError(res, "uploading file");

  const body = res.body as { key: string; size: number };
  return text(`File uploaded: **${body.key}** (${body.size} bytes)`);
}
