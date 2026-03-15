import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  chmodSync,
} from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { getWalletPath } from "./config.js";

export interface WalletData {
  address: string;
  privateKey: `0x${string}`;
  created: string;
  funded: boolean;
}

/** Load wallet from disk, or return null if none exists. */
export function loadWallet(): WalletData | null {
  const p = getWalletPath();
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as WalletData;
  } catch {
    return null;
  }
}

/** Create a new wallet and save to disk. Returns the wallet data. */
export function createWallet(): WalletData {
  const p = getWalletPath();
  if (existsSync(p)) {
    const existing = loadWallet();
    if (existing) return existing;
  }

  const privateKeyBytes = randomBytes(32);
  const privateKey = `0x${privateKeyBytes.toString("hex")}` as `0x${string}`;

  const account = privateKeyToAccount(privateKey);
  const address = account.address;

  const wallet: WalletData = {
    address,
    privateKey,
    created: new Date().toISOString(),
    funded: false,
  };

  const dir = dirname(p);
  mkdirSync(dir, { recursive: true });
  writeFileSync(p, JSON.stringify(wallet, null, 2), { mode: 0o600 });
  try {
    chmodSync(p, 0o600);
  } catch {
    // chmod may fail on Windows — non-fatal
  }

  return wallet;
}

/** Update the wallet file (e.g. mark as funded). */
export function updateWallet(updates: Partial<WalletData>): void {
  const wallet = loadWallet();
  if (!wallet) return;
  const updated = { ...wallet, ...updates };
  const p = getWalletPath();
  writeFileSync(p, JSON.stringify(updated, null, 2), { mode: 0o600 });
}

/** Get a viem Account object from the wallet private key. */
export function getAccount(wallet: WalletData) {
  return privateKeyToAccount(wallet.privateKey);
}

/** Get a viem public client for Base Sepolia. */
export function getPublicClient() {
  return createPublicClient({ chain: baseSepolia, transport: http() });
}

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Check USDC balance on Base Sepolia. Returns balance in micros (6 decimals). */
export async function checkBalance(address: string): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: USDC_ADDRESS,
    abi: BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  });
}

/** Sign wallet auth headers for run402 API calls. */
export async function signWalletAuth(wallet: WalletData): Promise<{
  "X-Run402-Wallet": string;
  "X-Run402-Signature": string;
  "X-Run402-Timestamp": string;
}> {
  const account = getAccount(wallet);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await account.signMessage({
    message: `run402:${timestamp}`,
  });
  return {
    "X-Run402-Wallet": account.address,
    "X-Run402-Signature": signature,
    "X-Run402-Timestamp": timestamp,
  };
}

/** Subscribe to a tier using x402 payment. */
export async function subscribeTier(
  wallet: WalletData,
  tier: string,
): Promise<{ ok: boolean; body: unknown }> {
  // Dynamic imports to avoid loading crypto libs until needed
  const [{ x402Client, wrapFetchWithPayment }, { ExactEvmScheme }, { toClientEvmSigner }] =
    await Promise.all([
      import("@x402/fetch"),
      import("@x402/evm/exact/client"),
      import("@x402/evm"),
    ]);

  const account = getAccount(wallet);
  const publicClient = getPublicClient();
  const signer = toClientEvmSigner(account, publicClient);

  const client = new x402Client();
  client.register("eip155:84532", new ExactEvmScheme(signer));
  const fetchPaid = wrapFetchWithPayment(fetch, client);

  const apiBase =
    process.env.RUN402_API_BASE || "https://api.run402.com";
  const res = await fetchPaid(
    `${apiBase}/tiers/v1/${tier}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );

  const body = await res.json();
  return { ok: res.ok, body };
}
