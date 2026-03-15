import { z } from "zod";
import { apiRequest } from "../client.js";
import { getSession, resetSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const removeSchema = {
  project_id: z
    .string()
    .optional()
    .describe(
      "Project ID to delete. If omitted, deletes the current session project.",
    ),
};

export async function handleRemove(args: { project_id?: string }) {
  const session = getSession();
  const projectId = args.project_id || session.projectId;
  const serviceKey = session.serviceKey;

  if (!projectId || !serviceKey) {
    return error(
      `No app deployed yet. Nothing to remove.`,
    );
  }

  const projectName = session.projectName || projectId;

  // --- Step 1: Release subdomain if one exists ---
  if (session.subdomain && session.serviceKey) {
    await apiRequest(`/subdomains/v1/${session.subdomain}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceKey}` },
    });
    // Ignore errors — subdomain may already be released
  }

  // --- Step 2: Delete/archive the project ---
  const res = await apiRequest(`/projects/v1/${projectId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${serviceKey}` },
  });

  if (!res.ok) {
    return formatApiError(res, "deleting project");
  }

  // --- Step 3: Clear session ---
  resetSession();

  return text(
    [
      `## App removed`,
      ``,
      `Project \`${projectName}\` (\`${projectId}\`) has been archived.`,
      session.subdomain
        ? `Subdomain \`${session.subdomain}.run402.com\` released.`
        : "",
      `Session cleared.`,
      ``,
      `Use \`bld402_build\` to create a new app.`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
