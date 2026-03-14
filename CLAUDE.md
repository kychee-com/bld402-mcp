# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An MCP (Model Context Protocol) server that lets AI agents build and deploy web apps on the run402 platform. It provides 15 tools covering the full lifecycle: wallet setup, project creation, database management, serverless functions, file storage, image generation, and deployment — all backed by blockchain micropayments on Base Sepolia testnet.

## Commands

```bash
npm run build     # Compile TypeScript (src/ → dist/)
npm run dev       # Run in dev mode via tsx (no compile step)
npm start         # Run compiled server (must build first)
```

No test suite exists yet. The tsconfig excludes `src/**/*.test.ts` in anticipation of future tests.

## Architecture

### MCP Server (stdio transport)

`src/index.ts` registers 15 tools on an `McpServer` instance using `server.tool(name, description, zodSchema, handler)`, then connects via `StdioServerTransport`. Each tool lives in its own file under `src/tools/`.

### Tool Implementation Pattern

Every tool file exports a Zod schema object and an async handler function:

```
src/tools/{name}.ts
  ├── export const toolSchema = { ... }     // Zod fields with .describe()
  └── export async function handleTool()    // Returns ToolResult (text/error)
```

Handlers follow a consistent flow: load session → load wallet (if needed) → validate preconditions → call run402 API → update session → return formatted markdown.

### Core Modules

- **`src/session.ts`** — In-memory session state backed by `~/.config/run402/bld402-session.json`. Loaded once, persisted atomically on every `updateSession()` call. Tracks wallet, tier, project credentials (anonKey/serviceKey), tables, RLS config, and deployment state.
- **`src/wallet.ts`** — Creates secp256k1 keypair, derives Ethereum address via Keccak-256. Persisted at `~/.config/run402/wallet.json` (mode 0o600). Also handles wallet signing (`signWalletAuth`) and x402 payment flow (`subscribeTier`) with dynamic imports of `@x402/fetch` and `@x402/evm`.
- **`src/client.ts`** — `apiRequest(path, opts)` wrapper around fetch. Handles JSON/raw body serialization, 402 payment detection, and error response parsing.
- **`src/errors.ts`** — `text()`, `error()`, and `formatApiError()` helpers that return `ToolResult` objects. `formatApiError` adds actionable next-step guidance based on HTTP status codes.
- **`src/config.ts`** — Resolves `RUN402_API_BASE` and `RUN402_CONFIG_DIR` env vars with defaults.
- **`src/templates.ts`** — Hardcoded metadata for 13 templates. `getTemplate()` reads files from `templates/{category}/{name}/` at runtime, with fallback between dist and dev layouts.

### API Authentication

Two auth mechanisms used across tools:
1. **Wallet signing** — `signWalletAuth()` produces `X-Run402-Wallet`, `X-Run402-Signature`, `X-Run402-Timestamp` headers for project creation, deployment, and tier subscription.
2. **Service key** — `Authorization: Bearer {serviceKey}` for database, functions, secrets, and RLS endpoints. Obtained from `create-project` and stored in session.

### Template System

13 templates in `templates/utility/` and `templates/games/`. Each contains `schema.sql`, `rls.json`, `index.html`, `README.md`, and optional `.js` function files. Reusable code patterns live in `templates/patterns/` (auth, CRUD, polling, etc.).

## Key Conventions

- ES modules throughout (`"type": "module"` in package.json, ESNext module target)
- All file imports use `.js` extensions (required for ESM even in TypeScript source)
- Strict TypeScript with `ES2022` target
- Session and wallet files use mode `0o600` for security
- x402 payment libraries are dynamically imported only when needed to keep startup fast
- Tool results use markdown formatting (tables, code blocks, headers) for readability in Claude conversations
