import { z } from "zod";
import { getTemplate } from "../templates.js";
import { text, error } from "../errors.js";

export const getTemplateSchema = {
  name: z
    .string()
    .describe(
      "Template name (e.g. 'shared-todo', 'voting-booth', 'hangman'). Use bld402_list_templates to see all options.",
    ),
};

export async function handleGetTemplate(args: { name: string }) {
  const tpl = getTemplate(args.name);
  if (!tpl) {
    return error(
      `Template "${args.name}" not found. Use \`bld402_list_templates\` to see available templates.`,
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
    const fnNames = Object.keys(tpl.functions);
    lines.push(``, `### Serverless Functions`);
    lines.push(
      ``,
      `**IMPORTANT:** This template includes ${fnNames.length} serverless function(s) that must be deployed separately using \`bld402_deploy_function\`. Deploy each one after creating tables and before deploying the site.`,
      ``,
    );
    for (const [name, code] of Object.entries(tpl.functions)) {
      lines.push(`#### ${name}.js`, "```javascript", code, "```", ``);
    }
    lines.push(
      `**Deploy order:** \`bld402_run_sql\` → \`bld402_setup_rls\` → ${fnNames.map((n) => `\`bld402_deploy_function("${n}", code)\``).join(" → ")} → \`bld402_deploy\``,
    );
  }

  lines.push(``, `### README`, tpl.readme);

  return text(lines.join("\n"));
}
