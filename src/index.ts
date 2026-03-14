#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  listTemplatesSchema,
  handleListTemplates,
} from "./tools/list-templates.js";
import {
  getTemplateSchema,
  handleGetTemplate,
} from "./tools/get-template.js";
import { getGuideSchema, handleGetGuide } from "./tools/get-guide.js";
import { setupSchema, handleSetup } from "./tools/setup.js";
import {
  createProjectSchema,
  handleCreateProject,
} from "./tools/create-project.js";
import { runSqlSchema, handleRunSql } from "./tools/run-sql.js";
import { setupRlsSchema, handleSetupRls } from "./tools/setup-rls.js";
import { deploySchema, handleDeploy } from "./tools/deploy.js";
import { statusSchema, handleStatus } from "./tools/status.js";

const server = new McpServer({
  name: "bld402",
  version: "0.1.0",
});

// ─── Template & guide tools ────────────────────────────────────────────────

server.tool(
  "bld402_list_templates",
  "Browse 13 ready-made app templates (todo lists, games, blogs, etc.). Each template includes database schema, security rules, and a complete frontend.",
  listTemplatesSchema,
  async (args) => handleListTemplates(args),
);

server.tool(
  "bld402_get_template",
  "Get the full source code for a template: SQL schema, RLS config, HTML frontend, and serverless functions. Use this to start building, then customize.",
  getTemplateSchema,
  async (args) => handleGetTemplate(args),
);

server.tool(
  "bld402_get_guide",
  "Get the bld402 build guide: what run402 can/cannot do, design rules, code patterns, and API reference. Read this before building from scratch.",
  getGuideSchema,
  async (args) => handleGetGuide(args),
);

// ─── Setup & project tools ─────────────────────────────────────────────────

server.tool(
  "bld402_setup",
  "Set up everything needed to build: create a crypto wallet (if needed), get free testnet funds, and subscribe to a tier. Run this first — it handles all the payment complexity automatically.",
  setupSchema,
  async (args) => handleSetup(args),
);

server.tool(
  "bld402_create_project",
  "Create a new run402 project (database + API). Returns project credentials. Run bld402_setup first.",
  createProjectSchema,
  async (args) => handleCreateProject(args),
);

// ─── Database tools ────────────────────────────────────────────────────────

server.tool(
  "bld402_run_sql",
  "Execute SQL against the project database: CREATE TABLE, INSERT, SELECT, ALTER TABLE, etc. Use this to set up your app's data structure.",
  runSqlSchema,
  async (args) => handleRunSql(args),
);

server.tool(
  "bld402_setup_rls",
  "Apply row-level security to tables. Templates: public_read (anyone reads, signed-in users write), public_read_write (anyone reads and writes), user_owns_rows (each user sees only their data).",
  setupRlsSchema,
  async (args) => handleSetupRls(args),
);

// ─── Deploy tools ──────────────────────────────────────────────────────────

server.tool(
  "bld402_deploy",
  "Deploy your app and get a live URL. Uploads HTML/CSS/JS files, claims a subdomain (e.g. myapp.run402.com), and runs a smoke test. Redeployment is free — call this again after making changes.",
  deploySchema,
  async (args) => handleDeploy(args),
);

// ─── Status tool ───────────────────────────────────────────────────────────

server.tool(
  "bld402_status",
  "Check current session status: wallet, tier, project, deployment URL, and database tables.",
  statusSchema,
  async (args) => handleStatus(args),
);

const transport = new StdioServerTransport();
await server.connect(transport);
