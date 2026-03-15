#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { browseSchema, handleBrowse } from "./tools/browse.js";
import { buildSchema, handleBuild } from "./tools/build.js";
import { updateSchema, handleUpdate } from "./tools/update.js";
import { statusSchema, handleStatus } from "./tools/status.js";

const server = new McpServer({
  name: "bld402",
  version: "0.2.0",
});

// ─── Browse templates & guide ───────────────────────────────────────────────

server.tool(
  "bld402_browse",
  "Browse 13 ready-made app templates, get full source code, or read the build guide.",
  browseSchema,
  async (args) => handleBrowse(args),
);

// ─── Build & deploy in one call ─────────────────────────────────────────────

server.tool(
  "bld402_build",
  "Build and deploy a complete web app in one call. Handles everything: wallet, payments, database, security, hosting. Returns a live URL.",
  buildSchema,
  async (args) => handleBuild(args),
);

// ─── Update & redeploy ──────────────────────────────────────────────────────

server.tool(
  "bld402_update",
  "Update a deployed app: change the UI, add database columns, update functions. Redeploy is free.",
  updateSchema,
  async (args) => handleUpdate(args),
);

// ─── Status ─────────────────────────────────────────────────────────────────

server.tool(
  "bld402_status",
  "Check what's deployed: wallet, project, database tables, live URL.",
  statusSchema,
  async (args) => handleStatus(args),
);

const transport = new StdioServerTransport();
await server.connect(transport);
