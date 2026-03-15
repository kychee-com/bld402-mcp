#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { handleBrowse } from "./tools/browse.js";
import { handleBuild } from "./tools/build.js";
import { handleUpdate } from "./tools/update.js";
import { handleStatus } from "./tools/status.js";
import { handleRemove } from "./tools/remove.js";

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

/** Parse --files index.html:./path style args into file objects */
function parseFiles(): Array<{ file: string; data: string }> | undefined {
  const files: Array<{ file: string; data: string }> = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--files" || args[i] === "--file") {
      // Collect all following args until next --flag
      for (let j = i + 1; j < args.length && !args[j].startsWith("--"); j++) {
        const val = args[j];
        const colonIdx = val.indexOf(":");
        if (colonIdx === -1) {
          // Just a filename — read from current dir
          const filePath = resolve(val);
          if (!existsSync(filePath)) {
            console.error(`Error: File not found: ${filePath}`);
            process.exit(1);
          }
          files.push({ file: val, data: readFileSync(filePath, "utf-8") });
        } else {
          // name:path format
          const name = val.slice(0, colonIdx);
          const filePath = resolve(val.slice(colonIdx + 1));
          if (!existsSync(filePath)) {
            console.error(`Error: File not found: ${filePath}`);
            process.exit(1);
          }
          files.push({ file: name, data: readFileSync(filePath, "utf-8") });
        }
      }
    }
  }
  return files.length > 0 ? files : undefined;
}

/** Parse --function name:path args */
function parseFunctions(): Array<{ name: string; code: string }> | undefined {
  const fns: Array<{ name: string; code: string }> = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--function") {
      const val = args[i + 1];
      if (!val) continue;
      const colonIdx = val.indexOf(":");
      if (colonIdx === -1) {
        console.error(`Error: --function requires name:path format (e.g. --function create-note:./create-note.js)`);
        process.exit(1);
      }
      const name = val.slice(0, colonIdx);
      const filePath = resolve(val.slice(colonIdx + 1));
      if (!existsSync(filePath)) {
        console.error(`Error: Function file not found: ${filePath}`);
        process.exit(1);
      }
      fns.push({ name, code: readFileSync(filePath, "utf-8") });
    }
  }
  return fns.length > 0 ? fns : undefined;
}

/** Parse --secret KEY=VALUE args */
function parseSecrets(): Array<{ key: string; value: string }> | undefined {
  const secrets: Array<{ key: string; value: string }> = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--secret") {
      const val = args[i + 1];
      if (!val) continue;
      const eqIdx = val.indexOf("=");
      if (eqIdx === -1) {
        console.error(`Error: --secret requires KEY=VALUE format`);
        process.exit(1);
      }
      secrets.push({ key: val.slice(0, eqIdx), value: val.slice(eqIdx + 1) });
    }
  }
  return secrets.length > 0 ? secrets : undefined;
}

function printResult(result: { content: Array<{ type: string; text: string }>; isError?: boolean }) {
  const text = result.content.map((c) => c.text).join("\n");
  if (result.isError) {
    console.error(text);
    process.exit(1);
  } else {
    console.log(text);
  }
}

function printHelp() {
  console.log(`bld402 — build and deploy web apps from the command line

Usage:
  bld402 <command> [options]

Commands:
  browse list                          List all 13 templates
  browse template <name>               Get full source code for a template
  browse guide [section]               Read the build guide (capabilities|design|patterns|api|all)

  build --name <name> --template <tpl> Build from a template
  build --name <name> --sql "..." --files index.html:./path
                                       Build from scratch

  update --sql "..."                   Run SQL (no redeploy)
  update --files index.html:./path     Redeploy with updated files
  update --sql "..." --files ...       SQL + redeploy

  status                               Show current session
  remove                               Delete app and clean up

Options:
  --name <name>          App name (used as subdomain)
  --template <name>      Template name (e.g. shared-todo)
  --tier <tier>          prototype|hobby|team (default: prototype)
  --sql "SQL"            SQL migrations or updates
  --sql-file <path>      Read SQL from a file
  --files <name:path>    Site files (repeatable)
  --function <name:path> Serverless function (repeatable)
  --secret <KEY=VALUE>   Secret env var (repeatable)
  --project-id <id>      Override project ID
  --help                 Show this help

Examples:
  bld402 browse list
  bld402 build --name my-app --template shared-todo
  bld402 update --sql "ALTER TABLE todos ADD COLUMN priority text"
  bld402 remove`);
}

async function main() {
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  switch (command) {
    case "browse": {
      const action = args[1];
      if (!action || action === "--help") {
        console.log("Usage: bld402 browse list|template|guide [name] [--section ...]");
        return;
      }
      const name = action === "template" ? args[2] : undefined;
      const section = action === "guide" ? (args[2] || "all") : undefined;
      printResult(await handleBrowse({ action, name, section }));
      break;
    }

    case "build": {
      const name = getFlag("name");
      if (!name) {
        console.error("Error: --name is required. Example: bld402 build --name my-app --template shared-todo");
        process.exit(1);
      }
      const template = getFlag("template");
      let sql = getFlag("sql");
      const sqlFile = getFlag("sql-file");
      if (sqlFile) {
        const p = resolve(sqlFile);
        if (!existsSync(p)) {
          console.error(`Error: SQL file not found: ${p}`);
          process.exit(1);
        }
        sql = readFileSync(p, "utf-8");
      }
      const tier = getFlag("tier") as "prototype" | "hobby" | "team" | undefined;

      printResult(
        await handleBuild({
          name,
          template,
          sql: sql || undefined,
          files: parseFiles(),
          functions: parseFunctions(),
          secrets: parseSecrets(),
          tier: tier || "prototype",
        }),
      );
      break;
    }

    case "update": {
      let sql = getFlag("sql");
      const sqlFile = getFlag("sql-file");
      if (sqlFile) {
        const p = resolve(sqlFile);
        if (!existsSync(p)) {
          console.error(`Error: SQL file not found: ${p}`);
          process.exit(1);
        }
        sql = readFileSync(p, "utf-8");
      }

      printResult(
        await handleUpdate({
          files: parseFiles(),
          sql: sql || undefined,
          functions: parseFunctions(),
          secrets: parseSecrets(),
        }),
      );
      break;
    }

    case "status": {
      printResult(await handleStatus({} as Record<string, never>));
      break;
    }

    case "remove": {
      const projectId = getFlag("project-id");
      printResult(await handleRemove({ project_id: projectId }));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error(`Run "bld402 --help" for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
