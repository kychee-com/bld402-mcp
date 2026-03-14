import { z } from "zod";
import {
  loadWallet,
  createWallet,
  checkBalance,
  updateWallet,
  subscribeTier,
  getPublicClient,
} from "../wallet.js";
import { apiRequest } from "../client.js";
import { updateSession } from "../session.js";
import { text, error, formatApiError } from "../errors.js";

export const setupSchema = {
  tier: z
    .enum(["prototype", "hobby", "team"])
    .default("prototype")
    .describe(
      "Tier to subscribe to: prototype ($0.10/7d), hobby ($5/30d), team ($20/30d). Defaults to prototype.",
    ),
};

export async function handleSetup(args: { tier?: string }) {
  const tier = args.tier || "prototype";
  const lines: string[] = [];

  // Step 1: Wallet
  let wallet = loadWallet();
  if (!wallet) {
    wallet = createWallet();
    lines.push(`Wallet created: \`${wallet.address}\``);
  } else {
    lines.push(`Wallet loaded: \`${wallet.address}\``);
  }

  // Step 2: Check balance
  let balance: bigint;
  try {
    balance = await checkBalance(wallet.address);
  } catch (err) {
    return error(
      `Could not check wallet balance: ${(err as Error).message}. ` +
        `Network issue — try again in a moment.`,
    );
  }

  const MIN_FOR_TIER: Record<string, bigint> = {
    prototype: 100_000n, // $0.10
    hobby: 5_000_000n, // $5.00
    team: 20_000_000n, // $20.00
  };
  const needed = MIN_FOR_TIER[tier] || 100_000n;

  lines.push(
    `Balance: ${(Number(balance) / 1_000_000).toFixed(2)} USDC`,
  );

  // Step 3: Faucet if needed
  if (balance < needed) {
    lines.push(`Requesting faucet funds...`);
    const faucetRes = await apiRequest("/faucet/v1", {
      method: "POST",
      body: { address: wallet.address },
    });

    if (!faucetRes.ok) {
      if (faucetRes.status === 429) {
        return error(
          `Faucet rate-limited (1 per 24h per IP). Current balance: ${(Number(balance) / 1_000_000).toFixed(2)} USDC. ` +
            `Wait 24 hours, or fund the wallet at: https://run402.com/billing?wallet=${wallet.address}`,
        );
      }
      return formatApiError(faucetRes, "requesting faucet");
    }

    const faucetBody = faucetRes.body as {
      transaction_hash: string;
      amount_usd_micros: number;
    };
    lines.push(
      `Faucet funded: +$${((faucetBody.amount_usd_micros || 250000) / 1_000_000).toFixed(2)} USDC (tx: \`${faucetBody.transaction_hash}\`)`,
    );

    // Wait for tx confirmation
    if (faucetBody.transaction_hash) {
      lines.push(`Waiting for transaction confirmation...`);
      try {
        const publicClient = getPublicClient();
        await publicClient.waitForTransactionReceipt({
          hash: faucetBody.transaction_hash as `0x${string}`,
        });
        lines.push(`Transaction confirmed.`);
      } catch {
        // If waitForTransactionReceipt fails, wait a fixed delay
        await new Promise((r) => setTimeout(r, 6000));
        lines.push(`Waited 6 seconds for confirmation.`);
      }
    }

    updateWallet({ funded: true });
  }

  // Step 4: Subscribe to tier
  lines.push(`Subscribing to **${tier}** tier...`);
  try {
    const subResult = await subscribeTier(wallet, tier);
    if (!subResult.ok) {
      const body = subResult.body as Record<string, unknown>;
      return error(
        `Tier subscription failed: ${body.error || body.message || JSON.stringify(body)}. ` +
          `Check wallet balance and try again.`,
      );
    }

    const subBody = subResult.body as {
      wallet: string;
      tier: string;
      lease_expires_at: string;
    };

    updateSession({
      walletAddress: wallet.address,
      tier: subBody.tier || tier,
      tierActive: true,
      tierExpires: subBody.lease_expires_at,
    });

    lines.push(
      `Subscribed to **${subBody.tier || tier}** tier. Expires: ${subBody.lease_expires_at || "7 days"}.`,
    );
  } catch (err) {
    return error(
      `Tier subscription failed: ${(err as Error).message}. ` +
        `This usually means insufficient balance. Check with \`bld402_status\`.`,
    );
  }

  lines.push(
    ``,
    `## Setup Complete`,
    ``,
    `Wallet: \`${wallet.address}\``,
    `Tier: **${tier}** (active)`,
    ``,
    `Next: Use \`bld402_create_project\` to create a project.`,
  );

  return text(lines.join("\n"));
}
