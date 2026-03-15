import { z } from "zod";
import { listTemplates, getTemplate, getPatterns } from "../templates.js";
import { text, error } from "../errors.js";

export const browseSchema = {
  action: z
    .enum(["list", "template", "guide"])
    .describe(
      "list = show all 13 templates, template = get full source code for one, guide = get build capabilities and rules",
    ),
  name: z
    .string()
    .optional()
    .describe("Template name (required when action is 'template')"),
  section: z
    .enum(["capabilities", "design", "patterns", "api", "all"])
    .optional()
    .describe(
      "Guide section (only used when action is 'guide', defaults to 'all')",
    ),
};

const CAPABILITIES = `## What run402 CAN Do

- Postgres database (tables, columns, constraints, indexes, SQL)
- REST API (full CRUD with filtering, pagination, ordering via PostgREST)
- Row-level security (user_owns_rows, public_read, public_read_write)
- User authentication (email/password signup, login, token refresh, logout)
- File storage (upload, download, signed URLs, S3-backed)
- Static site hosting (deploy HTML/CSS/JS, get a shareable URL)
- Serverless functions (Node.js — for server-side logic)
- AI image generation ($0.03/image)
- Subdomains (myapp.run402.com — free)
- Testnet (Base Sepolia) — completely free via faucet

## What run402 CANNOT Do

| Not Possible | Alternative |
|---|---|
| Custom domains (myapp.com) | Use myapp.run402.com subdomain |
| WebSocket / real-time | Polling (fetch every 3-10 seconds) |
| Email / SMS / push notifications | In-app notifications |
| OAuth / social login | Email/password auth (built in) |
| Payment processing (credit cards) | Track balances in the database |
| Custom database extensions | Standard PostgreSQL features |
| Files over 50 MB per deploy | Optimize images, external hosting |
| More than 100 req/sec sustained | Client-side caching |`;

const DESIGN = `## Design Rules

- Use \`height: 100dvh\` on body, flexbox layout
- Mobile breakpoint at 600px
- System font stack: \`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif\`
- Primary color: #0066cc
- Always use \`<script type="module">\` — top-level await only works in module scripts
- Generate a single \`index.html\` with inline CSS and JS
- Never expose \`service_key\` in frontend code
- All API calls need \`apikey\` header with the \`anon_key\`

## Banned Words in User-Facing Text

Never use these in the app UI: API, endpoint, schema, payload, query, webhook, middleware, database, server, cluster, deployment, container, embedding, vector, tokenize, inference, LLM, GPT.

Rewrite: "Querying the database..." → "Loading your data..."`;

const API_REF = `## API Reference

**Base URL:** \`https://api.run402.com\`

### Client API (anon_key / access_token)

| Action | Method | Endpoint | Auth |
|--------|--------|----------|------|
| CRUD data | GET/POST/PATCH/DELETE | /rest/v1/:table | apikey header |
| Signup | POST | /auth/v1/signup | apikey header |
| Login | POST | /auth/v1/token | apikey header |
| Refresh token | POST | /auth/v1/token?grant_type=refresh_token | apikey header |
| Get current user | GET | /auth/v1/user | Bearer token |
| Upload file | POST | /storage/v1/object/:bucket/* | apikey header |
| Invoke function | POST | /functions/v1/:name | apikey header |

### RLS Templates

| Template | Read | Write | Use when |
|----------|------|-------|----------|
| public_read | Everyone | Authenticated users | Public content, signed-in users create/edit |
| public_read_write | Everyone | Everyone | Open collaboration, no auth needed |
| user_owns_rows | Row owner only | Row owner only | Personal data (requires owner_column) |

### SQL Rules

- Allowed: CREATE TABLE, ALTER TABLE, CREATE INDEX, INSERT, UPDATE, DELETE, SELECT
- Use gen_random_uuid() for UUID PKs, timestamptz for timestamps
- Wait 500ms after CREATE TABLE before next API call (schema reload)`;

export async function handleBrowse(args: {
  action: string;
  name?: string;
  section?: string;
}) {
  switch (args.action) {
    case "list":
      return handleList();
    case "template":
      return handleTemplate(args.name);
    case "guide":
      return handleGuide(args.section);
    default:
      return error(`Unknown action: "${args.action}". Use list, template, or guide.`);
  }
}

function handleList() {
  const templates = listTemplates();

  const lines = [
    `## Available Templates`,
    ``,
    `### Utility Apps`,
    ``,
    `| # | Template | Description | Auth | Functions |`,
    `|---|----------|-------------|------|-----------|`,
  ];

  let i = 1;
  for (const t of templates.filter((t) => t.category === "utility")) {
    lines.push(
      `| ${i++} | ${t.name} | ${t.description} | ${t.hasAuth ? "yes" : "no"} | ${t.hasFunctions ? "yes" : "no"} |`,
    );
  }

  lines.push(
    ``,
    `### Games`,
    ``,
    `| # | Template | Description | Auth | Functions |`,
    `|---|----------|-------------|------|-----------|`,
  );
  for (const t of templates.filter((t) => t.category === "games")) {
    lines.push(
      `| ${i++} | ${t.name} | ${t.description} | ${t.hasAuth ? "yes" : "no"} | ${t.hasFunctions ? "yes" : "no"} |`,
    );
  }

  lines.push(
    ``,
    `Use \`bld402_browse\` with action \`"template"\` and a template name to get full source code.`,
  );

  return text(lines.join("\n"));
}

function handleTemplate(name?: string) {
  if (!name) {
    return error(
      `Template name is required. Use \`bld402_browse\` with action \`"list"\` to see available templates.`,
    );
  }

  const tpl = getTemplate(name);
  if (!tpl) {
    return error(
      `Template "${name}" not found. Use \`bld402_browse\` with action \`"list"\` to see available templates.`,
    );
  }

  const lines = [
    `## Template: ${tpl.name}`,
    ``,
    `### schema.sql`,
    "```sql",
    tpl.schema,
    "```",
    ``,
    `### rls.json`,
    "```json",
    JSON.stringify(tpl.rls, null, 2),
    "```",
    ``,
    `### index.html`,
    "```html",
    tpl.html,
    "```",
  ];

  if (tpl.functions && Object.keys(tpl.functions).length > 0) {
    lines.push(``, `### Serverless Functions`);
    for (const [fnName, code] of Object.entries(tpl.functions)) {
      lines.push(`#### ${fnName}.js`, "```javascript", code, "```", ``);
    }
  }

  lines.push(``, `### README`, tpl.readme);

  return text(lines.join("\n"));
}

function handleGuide(section?: string) {
  const sec = section || "all";

  if (sec === "all") {
    const patterns = getPatterns();
    const patternLines = Object.entries(patterns)
      .map(([name, code]) => `### ${name}\n\`\`\`javascript\n${code}\n\`\`\``)
      .join("\n\n");

    return text(
      [CAPABILITIES, DESIGN, `## Code Patterns\n\n${patternLines}`, API_REF].join(
        "\n\n---\n\n",
      ),
    );
  }

  switch (sec) {
    case "capabilities":
      return text(CAPABILITIES);
    case "design":
      return text(DESIGN);
    case "patterns": {
      const patterns = getPatterns();
      const lines = Object.entries(patterns)
        .map(([name, code]) => `### ${name}\n\`\`\`javascript\n${code}\n\`\`\``)
        .join("\n\n");
      return text(`## Code Patterns\n\n${lines}`);
    }
    case "api":
      return text(API_REF);
    default:
      return text(CAPABILITIES);
  }
}
