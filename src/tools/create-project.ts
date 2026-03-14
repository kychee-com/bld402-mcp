import { z } from "zod";
import { loadWallet, signWalletAuth } from "../wallet.js";
import { getApiBase } from "../config.js";
import { updateSession } from "../session.js";
import { text, error } from "../errors.js";

export const createProjectSchema = {
  name: z
    .string()
    .describe(
      "Project name slug (lowercase, hyphens, e.g. 'my-todo-app'). Used as default subdomain.",
    ),
};

export async function handleCreateProject(args: { name: string }) {
  const wallet = loadWallet();
  if (!wallet) {
    return error(
      `No wallet found. Run \`bld402_setup\` first to create a wallet and subscribe to a tier.`,
    );
  }

  const headers = await signWalletAuth(wallet);

  const res = await fetch(`${getApiBase()}/projects/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ name: args.name }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as Record<string, string>).error ||
      (body as Record<string, string>).message ||
      `HTTP ${res.status}`;
    return error(
      `Failed to create project: ${msg}. ` +
        `Make sure you ran \`bld402_setup\` and have an active tier subscription.`,
    );
  }

  const body = (await res.json()) as {
    project_id: string;
    anon_key: string;
    service_key: string;
    schema_slot: string;
    tier: string;
    lease_expires_at: string;
  };

  updateSession({
    projectId: body.project_id,
    projectName: args.name,
    anonKey: body.anon_key,
    serviceKey: body.service_key,
    schemaSlot: body.schema_slot,
    leaseExpiresAt: body.lease_expires_at,
  });

  const lines = [
    `## Project Created`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| project_id | \`${body.project_id}\` |`,
    `| name | ${args.name} |`,
    `| tier | ${body.tier} |`,
    `| schema | ${body.schema_slot} |`,
    `| expires | ${body.lease_expires_at} |`,
    `| anon_key | \`${body.anon_key.slice(0, 20)}...\` |`,
    ``,
    `**IMPORTANT:** The \`anon_key\` is safe for frontend code. The \`service_key\` is stored securely and used internally — never expose it in client code.`,
    ``,
    `Next: Use \`bld402_run_sql\` to create tables, then \`bld402_setup_rls\` to configure access.`,
  ];

  return text(lines.join("\n"));
}
