/** In-memory session state, shared across tool calls within one MCP session. */

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

let session: SessionState = {};

export function getSession(): SessionState {
  return session;
}

export function updateSession(updates: Partial<SessionState>): void {
  session = { ...session, ...updates };
}

export function resetSession(): void {
  session = {};
}
