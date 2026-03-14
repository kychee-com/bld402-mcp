/**
 * Session state — persisted to disk so MCP server restarts don't lose progress.
 * Stored at ~/.config/run402/bld402-session.json alongside the wallet.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export interface SessionState {
  walletAddress?: string;
  tierActive?: boolean;
  tierExpires?: string;
  tier?: string;
  projectId?: string;
  projectName?: string;
  anonKey?: string;
  serviceKey?: string;
  schemaSlot?: string;
  leaseExpiresAt?: string;
  tables?: string[];
  rlsConfig?: Record<string, string>;
  deploymentId?: string;
  deploymentUrl?: string;
  subdomain?: string;
  subdomainUrl?: string;
}

function getSessionPath(): string {
  const dir =
    process.env.RUN402_CONFIG_DIR || join(homedir(), ".config", "run402");
  return join(dir, "bld402-session.json");
}

let session: SessionState | null = null;

function load(): SessionState {
  if (session !== null) return session;
  const p = getSessionPath();
  try {
    if (existsSync(p)) {
      session = JSON.parse(readFileSync(p, "utf-8")) as SessionState;
      return session;
    }
  } catch {
    // corrupt file — start fresh
  }
  session = {};
  return session;
}

function persist(): void {
  const p = getSessionPath();
  const dir = dirname(p);
  mkdirSync(dir, { recursive: true });
  writeFileSync(p, JSON.stringify(session, null, 2), { mode: 0o600 });
}

export function getSession(): SessionState {
  return load();
}

export function updateSession(updates: Partial<SessionState>): void {
  load();
  session = { ...session, ...updates };
  persist();
}

export function resetSession(): void {
  session = {};
  persist();
}
