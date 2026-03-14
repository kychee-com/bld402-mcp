import { z } from "zod";
import { loadWallet, checkBalance } from "../wallet.js";
import { getSession } from "../session.js";
import { text } from "../errors.js";

export const statusSchema = {};

export async function handleStatus(
  _args: Record<string, never>,
) {
  const session = getSession();
  const wallet = loadWallet();

  const lines = [`## bld402 Session Status`, ``];

  // Wallet
  if (wallet) {
    lines.push(`### Wallet`);
    lines.push(`- Address: \`${wallet.address}\``);
    try {
      const balance = await checkBalance(wallet.address);
      lines.push(
        `- Balance: ${(Number(balance) / 1_000_000).toFixed(2)} USDC`,
      );
    } catch {
      lines.push(`- Balance: (could not check)`);
    }
    lines.push(``);
  } else {
    lines.push(`### Wallet`, `No wallet found. Run \`bld402_setup\`.`, ``);
  }

  // Tier
  if (session.tierActive) {
    lines.push(`### Tier`);
    lines.push(`- Tier: **${session.tier || "prototype"}**`);
    lines.push(`- Expires: ${session.tierExpires || "unknown"}`);
    lines.push(``);
  }

  // Project
  if (session.projectId) {
    lines.push(`### Project`);
    lines.push(`- ID: \`${session.projectId}\``);
    lines.push(`- Name: ${session.projectName || "unnamed"}`);
    lines.push(`- Schema: ${session.schemaSlot || "unknown"}`);
    lines.push(`- Expires: ${session.leaseExpiresAt || "unknown"}`);
    lines.push(`- anon_key: \`${(session.anonKey || "").slice(0, 20)}...\``);
    if (session.tables && session.tables.length > 0) {
      lines.push(
        `- Tables: ${session.tables.map((t) => `\`${t}\``).join(", ")}`,
      );
    }
    if (session.rlsConfig) {
      lines.push(
        `- RLS: ${Object.entries(session.rlsConfig)
          .map(([t, tpl]) => `\`${t}\` → ${tpl}`)
          .join(", ")}`,
      );
    }
    lines.push(``);
  }

  // Deployment
  if (session.deploymentUrl) {
    lines.push(`### Deployment`);
    lines.push(`- URL: ${session.deploymentUrl}`);
    if (session.subdomainUrl) {
      lines.push(`- Subdomain: ${session.subdomainUrl}`);
    }
    lines.push(``);
  }

  if (!wallet && !session.projectId) {
    lines.push(
      `Nothing set up yet. Start with \`bld402_setup\` to create a wallet and subscribe to a tier.`,
    );
  }

  return text(lines.join("\n"));
}
