# bld402-mcp

MCP server for [bld402](https://bld402.com) -- build and deploy web apps from plain language. Tell your AI agent what you want, and it handles wallet setup, payments, database, and deployment automatically.

One tool call. Live URL. No config.

## Install

### Claude Code

```bash
claude mcp add bld402 -- npx bld402-mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bld402": {
      "command": "npx",
      "args": ["bld402-mcp"]
    }
  }
}
```

### Windsurf

Add to your MCP config:

```json
{
  "mcpServers": {
    "bld402": {
      "command": "npx",
      "args": ["bld402-mcp"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bld402": {
      "command": "npx",
      "args": ["bld402-mcp"]
    }
  }
}
```

### Cline

Open the MCP panel in Cline and add:

```json
{
  "mcpServers": {
    "bld402": {
      "command": "npx",
      "args": ["bld402-mcp"]
    }
  }
}
```

## Quick Start

After installing, tell your AI agent:

> Read bld402.com/llms.txt and build me a shared todo app

That's it. The agent will:

1. Create a wallet and fund it from the faucet
2. Pick the `shared-todo` template
3. Deploy the database, RLS policies, and site
4. Return a live URL like `https://my-todo.run402.com`

## Tools

| Tool | Description |
|------|-------------|
| `bld402_browse` | List templates, view template source, or read the build guide |
| `bld402_build` | Build and deploy an app (from template or custom SQL + HTML) |
| `bld402_update` | Update an existing app (SQL, files, functions, secrets) |
| `bld402_status` | Show wallet balance, tier, and current project info |
| `bld402_remove` | Delete the current app and release the subdomain |

## CLI

The package also includes a `bld402` CLI:

```bash
npx bld402-mcp          # start MCP server
npx bld402 browse list  # list templates
npx bld402 build --name my-app --template shared-todo
npx bld402 status
npx bld402 remove
```

## Templates

13 ready-to-deploy templates: shared-todo, landing-waitlist, voting-booth, paste-locker, micro-blog, photo-wall, secret-santa, flash-cards, hangman, trivia-night, ai-sticker-maker, bingo-card-generator, memory-match.

Run `bld402 browse list` or ask your agent to list templates.

## Links

- Website: [bld402.com](https://bld402.com)
- Agent instructions: [bld402.com/llms.txt](https://bld402.com/llms.txt)
- GitHub: [github.com/kychee-com/bld402-mcp](https://github.com/kychee-com/bld402-mcp)

## License

MIT
