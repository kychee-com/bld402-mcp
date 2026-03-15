import { z } from "zod";
import {
  loadWallet,
  createWallet,
  checkBalance,
  updateWallet,
  subscribeTier,
  signWalletAuth,
  getPublicClient,
} from "../wallet.js";
import { getApiBase } from "../config.js";
import { getTemplate } from "../templates.js";
import { updateSession } from "../session.js";
import { text, error } from "../errors.js";

export const buildSchema = {
  name: z
    .string()
    .describe(
      "App name (used as project name and subdomain, e.g. 'my-todo-app')",
    ),
  template: z
    .string()
    .optional()
    .describe(
      "Template name to build from (e.g. 'shared-todo'). If omitted, must provide sql + files.",
    ),
  sql: z
    .string()
    .optional()
    .describe(
      "SQL migrations (CREATE TABLE, INSERT, etc.). Overrides template SQL if both provided.",
    ),
  rls: z
    .object({
      template: z.enum(["user_owns_rows", "public_read", "public_read_write"]),
      tables: z.array(
        z.object({
          table: z.string(),
          owner_column: z.string().optional(),
        }),
      ),
    })
    .optional()
    .describe(
      "Row-level security config. Overrides template RLS if both provided.",
    ),
  files: z
    .array(
      z.object({
        file: z.string(),
        data: z.string(),
        encoding: z.enum(["utf-8", "base64"]).optional(),
      }),
    )
    .optional()
    .describe(
      "Site files to deploy. Overrides template HTML if both provided. Must include index.html.",
    ),
  functions: z
    .array(
      z.object({
        name: z.string(),
        code: z.string(),
      }),
    )
    .optional()
    .describe(
      "Serverless functions to deploy. Overrides template functions if both provided.",
    ),
  secrets: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    )
    .optional()
    .describe(
      "Secrets to set (e.g. API keys). Injected as process.env in functions.",
    ),
  tier: z
    .enum(["prototype", "hobby", "team"])
    .default("prototype")
    .describe(
      "Tier: prototype ($0.10/7d), hobby ($5/30d), team ($20/30d). Default: prototype.",
    ),
};

export async function handleBuild(args: {
  name: string;
  template?: string;
  sql?: string;
  rls?: {
    template: string;
    tables: Array<{ table: string; owner_column?: string }>;
  };
  files?: Array<{ file: string; data: string; encoding?: string }>;
  functions?: Array<{ name: string; code: string }>;
  secrets?: Array<{ key: string; value: string }>;
  tier?: string;
}) {
  const tier = args.tier || "prototype";

  // Validate: need template or (sql + files)
  if (!args.template && !args.sql && !args.files) {
    return error(
      `Provide a template name or sql + files. Use \`bld402_browse\` with action \`"list"\` to see templates.`,
    );
  }

  // Resolve template data
  let migrations: string | undefined = args.sql;
  let rls: { template: string; tables: Array<{ table: string; owner_column?: string }> } | undefined = args.rls;
  let siteFiles: Array<{ file: string; data: string; encoding?: string }> | undefined = args.files;
  let functions: Array<{ name: string; code: string }> | undefined = args.functions;

  if (args.template) {
    const tpl = getTemplate(args.template);
    if (!tpl) {
      return error(
        `Template "${args.template}" not found. Use \`bld402_browse\` with action \`"list"\` to see available templates.`,
      );
    }

    // Template provides defaults; explicit args override
    if (!migrations && tpl.schema) {
      migrations = tpl.schema;
    }
    if (!rls && tpl.rls && typeof tpl.rls === "object" && "template" in (tpl.rls as Record<string, unknown>)) {
      rls = tpl.rls as { template: string; tables: Array<{ table: string; owner_column?: string }> };
    }
    if (!siteFiles && tpl.html) {
      siteFiles = [{ file: "index.html", data: tpl.html }];
    }
    if (!functions && tpl.functions) {
      functions = Object.entries(tpl.functions).map(([name, code]) => ({
        name,
        code,
      }));
    }
  }

  // Validate files have index.html if provided
  if (siteFiles && !siteFiles.some((f) => f.file === "index.html")) {
    return error(`Files must include index.html.`);
  }

  // --- Step 1: Wallet ---
  let wallet = loadWallet();
  if (!wallet) {
    wallet = createWallet();
  }

  // --- Step 2: Check balance & faucet if needed ---
  const MIN_FOR_TIER: Record<string, bigint> = {
    prototype: 100_000n,
    hobby: 5_000_000n,
    team: 20_000_000n,
  };
  const needed = MIN_FOR_TIER[tier] || 100_000n;

  let balance: bigint;
  try {
    balance = await checkBalance(wallet.address);
  } catch (err) {
    return error(
      `Could not check wallet balance: ${(err as Error).message}. Network issue — try again in a moment.`,
    );
  }

  if (balance < needed) {
    const apiBase = getApiBase();
    const faucetRes = await fetch(`${apiBase}/faucet/v1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet.address }),
    });

    if (!faucetRes.ok) {
      if (faucetRes.status === 429) {
        return error(
          `Faucet rate-limited (1 per 24h). Balance: ${(Number(balance) / 1_000_000).toFixed(2)} USDC. ` +
            `Wait 24 hours, or fund the wallet at: https://run402.com/billing?wallet=${wallet.address}`,
        );
      }
      const body = await faucetRes.json().catch(() => ({}));
      const msg =
        (body as Record<string, string>).error ||
        (body as Record<string, string>).message ||
        `HTTP ${faucetRes.status}`;
      return error(`Faucet request failed: ${msg}`);
    }

    const faucetBody = (await faucetRes.json()) as {
      transaction_hash?: string;
    };

    // Wait for tx confirmation
    if (faucetBody.transaction_hash) {
      try {
        const publicClient = getPublicClient();
        await publicClient.waitForTransactionReceipt({
          hash: faucetBody.transaction_hash as `0x${string}`,
        });
      } catch {
        await new Promise((r) => setTimeout(r, 6000));
      }
    }

    updateWallet({ funded: true });
  }

  // --- Step 3: Subscribe to tier ---
  try {
    const subResult = await subscribeTier(wallet, tier);
    if (!subResult.ok) {
      const body = subResult.body as Record<string, unknown>;
      return error(
        `Tier subscription failed: ${body.error || body.message || JSON.stringify(body)}. ` +
          `Check wallet balance and try again.`,
      );
    }
  } catch (err) {
    return error(
      `Tier subscription failed: ${(err as Error).message}. ` +
        `This usually means insufficient balance.`,
    );
  }

  // --- Step 4: Inject anon_key placeholder into HTML ---
  // The bundle deploy returns anon_key, so we inject it post-deploy.
  // But we need to prepare the site files with a placeholder that we can
  // replace after we get the key. Actually, the bundle deploy creates the
  // project AND deploys the site atomically, so we need to handle this.
  // Strategy: inject a CONFIG block placeholder; after bundle deploy returns
  // the anon_key, we'll do a quick redeploy with the key injected.

  // --- Step 5: Bundle deploy ---
  const walletHeaders = await signWalletAuth(wallet);
  const apiBase = getApiBase();

  const bundleBody: Record<string, unknown> = {
    name: args.name,
  };

  if (migrations) {
    bundleBody.migrations = migrations;
  }
  if (rls) {
    bundleBody.rls = rls;
  }
  if (args.secrets) {
    bundleBody.secrets = args.secrets;
  }
  if (functions) {
    bundleBody.functions = functions;
  }
  if (siteFiles) {
    bundleBody.site = siteFiles;
  }
  bundleBody.subdomain = args.name;

  const deployRes = await fetch(`${apiBase}/deploy/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...walletHeaders,
    },
    body: JSON.stringify(bundleBody),
  });

  if (!deployRes.ok) {
    const body = await deployRes.json().catch(() => ({}));
    const b = body as Record<string, string>;
    const msg = b.error || b.message || `HTTP ${deployRes.status}`;
    const hint = b.hint ? `\nHint: ${b.hint}` : "";
    return error(`Build failed: ${msg}${hint}`);
  }

  const result = (await deployRes.json()) as {
    project_id: string;
    anon_key: string;
    service_key: string;
    schema_slot: string;
    tier: string;
    lease_expires_at: string;
    site_url?: string;
    deployment_id?: string;
    subdomain_url?: string;
    functions?: Array<{ name: string; url: string }>;
  };

  // --- Step 6: Inject anon_key into HTML and redeploy ---
  if (siteFiles && result.anon_key) {
    const injectedFiles = injectAnonKey(siteFiles, result.anon_key, apiBase, result.project_id);

    // Check if injection actually changed any files
    const needsRedeploy = injectedFiles.some((f, i) => f.data !== siteFiles![i].data);

    if (needsRedeploy) {
      const redeployHeaders = await signWalletAuth(wallet);
      const redeployRes = await fetch(`${apiBase}/deployments/v1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...redeployHeaders,
        },
        body: JSON.stringify({
          name: args.name,
          project: result.project_id,
          files: injectedFiles,
        }),
      });

      if (redeployRes.ok) {
        const redeployBody = (await redeployRes.json()) as {
          id: string;
          url: string;
        };

        // Reassign subdomain to new deployment
        const { apiRequest } = await import("../client.js");
        await apiRequest("/subdomains/v1", {
          method: "POST",
          headers: { Authorization: `Bearer ${result.service_key}` },
          body: {
            name: args.name,
            deployment_id: redeployBody.id,
          },
        });
      }
    }
  }

  // --- Step 7: Track tables from SQL ---
  const tables: string[] = [];
  if (migrations) {
    const tableMatches = migrations.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi,
    );
    tables.push(...[...tableMatches].map((m) => m[1]));
  }

  // --- Step 8: Persist session ---
  updateSession({
    walletAddress: wallet.address,
    tier: result.tier || tier,
    tierActive: true,
    tierExpires: result.lease_expires_at,
    projectId: result.project_id,
    projectName: args.name,
    anonKey: result.anon_key,
    serviceKey: result.service_key,
    schemaSlot: result.schema_slot,
    leaseExpiresAt: result.lease_expires_at,
    tables: tables.length > 0 ? tables : undefined,
    deploymentId: result.deployment_id,
    deploymentUrl: result.site_url,
    subdomain: args.name,
    subdomainUrl: result.subdomain_url || `https://${args.name}.run402.com`,
  });

  // --- Step 9: Smoke test ---
  const liveUrl = result.subdomain_url || result.site_url || `https://${args.name}.run402.com`;
  let smokeOk = false;

  if (siteFiles) {
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
  }

  // --- Step 10: Return result ---
  const expiryDate = result.lease_expires_at
    ? result.lease_expires_at.split("T")[0]
    : "unknown";

  const lines = [
    `## Your app is live!`,
    ``,
    `**${liveUrl}**`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| project_id | \`${result.project_id}\` |`,
    `| anon_key | \`${result.anon_key.slice(0, 20)}...\` |`,
    `| tier | ${result.tier || tier} |`,
    `| expires | ${expiryDate} |`,
  ];

  if (tables.length > 0) {
    lines.push(`| tables | ${tables.join(", ")} |`);
  }

  if (result.functions && result.functions.length > 0) {
    lines.push(
      `| functions | ${result.functions.map((f) => f.name).join(", ")} |`,
    );
  }

  if (siteFiles && !smokeOk) {
    lines.push(
      ``,
      `The site may take a few seconds to propagate. The URL should work shortly.`,
    );
  }

  lines.push(
    ``,
    `Share this link with anyone. To make changes, use \`bld402_update\`.`,
    `Free redeploys — change as many times as you want.`,
  );

  return text(lines.join("\n"));
}

/** Inject anon_key into site files by replacing placeholders or adding a CONFIG block. */
function injectAnonKey(
  files: Array<{ file: string; data: string; encoding?: string }>,
  anonKey: string,
  apiBase: string,
  projectId: string,
): Array<{ file: string; data: string; encoding?: string }> {
  return files.map((f) => {
    if (f.file !== "index.html" || f.encoding === "base64") return f;

    let html = f.data;

    // Replace placeholder patterns
    if (html.includes("{ANON_KEY}")) {
      html = html.replace(/\{ANON_KEY\}/g, anonKey);
    } else if (html.includes("'ANON_KEY_PLACEHOLDER'")) {
      html = html.replace(/'ANON_KEY_PLACEHOLDER'/g, `'${anonKey}'`);
    } else if (html.includes('"ANON_KEY_PLACEHOLDER"')) {
      html = html.replace(/"ANON_KEY_PLACEHOLDER"/g, `"${anonKey}"`);
    } else if (html.includes("ANON_KEY_PLACEHOLDER")) {
      html = html.replace(/ANON_KEY_PLACEHOLDER/g, anonKey);
    }

    // Replace API URL placeholder
    if (html.includes("{API_URL}")) {
      html = html.replace(/\{API_URL\}/g, apiBase);
    } else if (html.includes("API_URL_PLACEHOLDER")) {
      html = html.replace(/API_URL_PLACEHOLDER/g, apiBase);
    }

    // If no placeholder was found and no CONFIG block exists, inject one
    if (
      !f.data.includes("ANON_KEY") &&
      !html.includes("window.BLD402_CONFIG")
    ) {
      const configBlock = `<script>window.BLD402_CONFIG = { API_URL: "${apiBase}", ANON_KEY: "${anonKey}", PROJECT_ID: "${projectId}" };</script>`;
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${configBlock}\n</head>`);
      } else if (html.includes("<body")) {
        html = html.replace(/<body[^>]*>/, `$&\n${configBlock}`);
      }
    }

    return { ...f, data: html };
  });
}
