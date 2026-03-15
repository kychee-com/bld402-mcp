import { z } from "zod";
import { loadWallet, signWalletAuth } from "../wallet.js";
import { apiRequest } from "../client.js";
import { getApiBase } from "../config.js";
import { getSession, updateSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";
import { injectAnonKey } from "../inject.js";

export const updateSchema = {
  files: z
    .array(
      z.object({
        file: z.string(),
        data: z.string(),
        encoding: z.enum(["utf-8", "base64"]).optional(),
      }),
    )
    .optional()
    .describe("Updated site files to deploy. Must include index.html if provided."),
  sql: z
    .string()
    .optional()
    .describe(
      "Additional SQL to run before redeploy (ALTER TABLE, INSERT, etc.)",
    ),
  functions: z
    .array(
      z.object({
        name: z.string(),
        code: z.string(),
      }),
    )
    .optional()
    .describe("Functions to deploy or update."),
  secrets: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    )
    .optional()
    .describe("Secrets to add or update."),
};

export async function handleUpdate(args: {
  files?: Array<{ file: string; data: string; encoding?: string }>;
  sql?: string;
  functions?: Array<{ name: string; code: string }>;
  secrets?: Array<{ key: string; value: string }>;
}) {
  const session = getSession();
  const wallet = loadWallet();

  // Validate session
  if (!session.projectId || !session.serviceKey) {
    return error(
      `No app deployed yet. Use \`bld402_build\` first.`,
    );
  }

  if (!wallet) {
    return error(
      `No wallet found. Use \`bld402_build\` to start fresh.`,
    );
  }

  // Validate files have index.html (only when files are provided)
  if (args.files && !args.files.some((f) => f.file === "index.html")) {
    return error(`Files must include index.html.`);
  }

  const changes: string[] = [];

  // --- Step 1: Run SQL if provided ---
  if (args.sql) {
    const sqlRes = await apiRequest(
      `/projects/v1/admin/${session.projectId}/sql`,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Authorization: `Bearer ${session.serviceKey}`,
        },
        rawBody: args.sql,
      },
    );

    if (!sqlRes.ok) {
      return formatApiError(sqlRes, "running SQL");
    }

    // Track new tables
    const tableMatches = args.sql.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi,
    );
    const newTables = [...tableMatches].map((m) => m[1]);

    // Track ALTER TABLE changes
    const alterMatches = args.sql.matchAll(
      /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/gi,
    );
    const alterChanges = [...alterMatches].map(
      (m) => `Added column \`${m[2]}\` to table \`${m[1]}\``,
    );

    if (newTables.length > 0) {
      const existing = session.tables || [];
      updateSession({ tables: [...existing, ...newTables] });
      changes.push(
        `Created table${newTables.length > 1 ? "s" : ""}: ${newTables.map((t) => `\`${t}\``).join(", ")}`,
      );
    }
    if (alterChanges.length > 0) {
      changes.push(...alterChanges);
    }
    if (newTables.length === 0 && alterChanges.length === 0) {
      changes.push(`Executed SQL updates`);
    }

    // Wait for schema reload
    await new Promise((r) => setTimeout(r, 500));
  }

  // --- Step 2: Deploy functions if provided ---
  if (args.functions) {
    for (const fn of args.functions) {
      const fnRes = await apiRequest(
        `/projects/v1/admin/${session.projectId}/functions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.serviceKey}` },
          body: { name: fn.name, code: fn.code },
        },
      );

      if (!fnRes.ok) {
        return formatApiError(fnRes, `deploying function "${fn.name}"`);
      }

      changes.push(`Deployed function \`${fn.name}\``);
    }
  }

  // --- Step 3: Set secrets if provided ---
  if (args.secrets) {
    for (const secret of args.secrets) {
      const secretRes = await apiRequest(
        `/projects/v1/admin/${session.projectId}/secrets`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.serviceKey}` },
          body: { key: secret.key, value: secret.value },
        },
      );

      if (!secretRes.ok) {
        return formatApiError(secretRes, `setting secret "${secret.key}"`);
      }

      changes.push(`Set secret \`${secret.key}\``);
    }
  }

  // --- Steps 4-7 only run when files are provided ---
  if (args.files) {
    // --- Step 4: Inject anon_key into HTML ---
    const injectedFiles = session.anonKey
      ? injectAnonKey(args.files, session.anonKey, getApiBase(), session.projectId!)
      : args.files;

    // --- Step 5: Redeploy site ---
    const walletHeaders = await signWalletAuth(wallet);
    const deployRes = await fetch(`${getApiBase()}/deployments/v1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...walletHeaders,
      },
      body: JSON.stringify({
        name: session.projectName || "bld402-app",
        project: session.projectId,
        files: injectedFiles,
      }),
    });

    if (!deployRes.ok) {
      const body = await deployRes.json().catch(() => ({}));
      const msg =
        (body as Record<string, string>).error ||
        (body as Record<string, string>).message ||
        `HTTP ${deployRes.status}`;
      return error(`Redeploy failed: ${msg}`);
    }

    const deployBody = (await deployRes.json()) as {
      id: string;
      url: string;
    };

    updateSession({
      deploymentId: deployBody.id,
      deploymentUrl: deployBody.url,
    });

    changes.push(
      `Redeployed site (${args.files.length} file${args.files.length > 1 ? "s" : ""})`,
    );

    // --- Step 6: Reassign subdomain ---
    const subdomainName = session.subdomain || session.projectName;
    if (subdomainName && session.serviceKey) {
      const subRes = await apiRequest("/subdomains/v1", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.serviceKey}` },
        body: {
          name: subdomainName,
          deployment_id: deployBody.id,
        },
      });

      if (subRes.ok) {
        const subBody = subRes.body as { url?: string };
        updateSession({
          subdomainUrl: subBody.url || `https://${subdomainName}.run402.com`,
        });
      }
    }

    // --- Step 7: Smoke test ---
    const liveUrl =
      session.subdomainUrl || deployBody.url;

    let smokeOk = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(liveUrl);
        if (r.ok) {
          smokeOk = true;
          break;
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    // --- Step 8: Return result ---
    const lines = [
      `## App updated!`,
      ``,
      `**${liveUrl}** (same link still works)`,
      ``,
      `Changes applied:`,
      ...changes.map((c) => `- ${c}`),
    ];

    if (!smokeOk) {
      lines.push(
        ``,
        `The site may take a few seconds to propagate. The URL should work shortly.`,
      );
    }

    return text(lines.join("\n"));
  }

  // --- No files: return result without redeploy ---
  const lines = [
    `## App updated!`,
    ``,
    `Changes applied:`,
    ...changes.map((c) => `- ${c}`),
  ];

  const liveUrl = session.subdomainUrl || session.deploymentUrl;
  if (liveUrl) {
    lines.push(``, `Live at: **${liveUrl}**`);
  }

  return text(lines.join("\n"));
}
