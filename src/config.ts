import { homedir } from "node:os";
import { join } from "node:path";

export function getApiBase(): string {
  return process.env.RUN402_API_BASE || "https://api.run402.com";
}

function getConfigDir(): string {
  return process.env.RUN402_CONFIG_DIR || join(homedir(), ".config", "run402");
}

export function getWalletPath(): string {
  return join(getConfigDir(), "wallet.json");
}

export function getKeystorePath(): string {
  return join(getConfigDir(), "projects.json");
}
