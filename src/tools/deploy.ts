import { z } from "zod";
import { loadWallet, signWalletAuth } from "../wallet.js";
import { apiRequest } from "../client.js";
import { getApiBase } from "../config.js";
import { getSession, updateSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const deploySchema = {
  files: z
    .array(
      z.object({
        file: z
          .string()
          .describe("File path (e.g. 'index.html', 'style.css')"),
        data: z.string().describe("File content"),
        encoding: z
          .enum(["utf-8", "base64"])
          .optional()
          .describe("Encoding: utf-8 (default) or base64 for binary"),
      }),
    )
    .describe("Files to deploy. Must include at least index.html."),
  subdomain: z
    .string()
    .optional()
    .describe(
      "Custom subdomain (e.g. 'myapp' → myapp.run402.com). Defaults to project name.",
    ),
  project_id: z
    .string()
    .optional()
    .describe("Project ID. If omitted, uses the current session project."),
};

export async function handleDeploy(args: {
  files: Array<{ file: string; data: string; encoding?: string }>;
  subdomain?: string;
  project_id?: string;
}) {
  const session = getSession();
  const projectId = args.project_id || session.projectId;
  const wallet = loadWallet();

  if (!wallet) {
    return error(`No wallet found. Run \`bld402_setup\` first.`);
  }

  // Deploy site
  const walletHeaders = await signWalletAuth(wallet);

  const deployRes = await fetch(`${getApiBase()}/deployments/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...walletHeaders,
    },
    body: JSON.stringify({
      name: session.projectName || "bld402-app",
      project: projectId,
      files: args.files,
    }),
  });

  if (!deployRes.ok) {
    const body = await deployRes.json().catch(() => ({}));
    const msg =
      (body as Record<string, string>).error ||
      (body as Record<string, string>).message ||
      `HTTP ${deployRes.status}`;
    return error(`Deploy failed: ${msg}`);
  }

  const deployBody = (await deployRes.json()) as {
    id: string;
    url: string;
    status: string;
  };

  updateSession({
    deploymentId: deployBody.id,
    deploymentUrl: deployBody.url,
  });

  const lines = [
    `## Site Deployed`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| deployment_id | \`${deployBody.id}\` |`,
    `| url | ${deployBody.url} |`,
    `| status | ${deployBody.status} |`,
  ];

  // Claim subdomain
  const subdomainName =
    args.subdomain || session.subdomain || session.projectName;
  if (subdomainName && session.serviceKey) {
    const subRes = await apiRequest("/subdomains/v1", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.serviceKey}`,
      },
      body: {
        name: subdomainName,
        deployment_id: deployBody.id,
      },
    });

    if (subRes.ok) {
      const subBody = subRes.body as { name: string; url: string };
      updateSession({
        subdomain: subBody.name || subdomainName,
        subdomainUrl: subBody.url || `https://${subdomainName}.run402.com`,
      });
      lines.push(
        `| subdomain | ${subBody.url || `https://${subdomainName}.run402.com`} |`,
      );
    } else {
      lines.push(
        ``,
        `Subdomain claim failed — using deployment URL instead.`,
      );
    }
  }

  // Smoke test
  const liveUrl =
    session.subdomainUrl || deployBody.url;
  lines.push(``, `Smoke-testing ${liveUrl}...`);

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

  if (smokeOk) {
    lines.push(`Smoke test passed.`);
  } else {
    lines.push(
      `Smoke test did not pass yet — the site may take a few more seconds to propagate. The URL should work shortly.`,
    );
  }

  lines.push(
    ``,
    `## Your app is live!`,
    ``,
    `**${session.subdomainUrl || deployBody.url}**`,
    ``,
    `Share this link with anyone. To make changes, update the files and run \`bld402_deploy\` again — redeployment is free.`,
  );

  return text(lines.join("\n"));
}
