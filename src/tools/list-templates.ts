import { z } from "zod";
import { listTemplates } from "../templates.js";
import { text } from "../errors.js";

export const listTemplatesSchema = {};

export async function handleListTemplates(
  _args: Record<string, never>,
) {
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

  lines.push(``, `### Games`, ``, `| # | Template | Description | Auth | Functions |`, `|---|----------|-------------|------|-----------|`);
  for (const t of templates.filter((t) => t.category === "games")) {
    lines.push(
      `| ${i++} | ${t.name} | ${t.description} | ${t.hasAuth ? "yes" : "no"} | ${t.hasFunctions ? "yes" : "no"} |`,
    );
  }

  lines.push(
    ``,
    `Use \`bld402_get_template\` with the template name to get full source code (SQL, RLS config, HTML, and README).`,
  );

  return text(lines.join("\n"));
}
