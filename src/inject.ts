/**
 * Shared injection logic for template placeholders.
 *
 * Handles all placeholder variants so build.ts and update.ts
 * behave identically:
 *   {ANON_KEY}
 *   'ANON_KEY_PLACEHOLDER'
 *   "ANON_KEY_PLACEHOLDER"
 *   ANON_KEY_PLACEHOLDER  (bare)
 *   {API_URL}
 *   API_URL_PLACEHOLDER
 *   {{APP_NAME}}
 *
 * If no placeholder is found a BLD402_CONFIG script block is injected.
 */

/**
 * Humanize a slug-style app name: "test-red-team" → "Test Red Team"
 */
function humanizeName(name: string): string {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function injectAnonKey(
  files: Array<{ file: string; data: string; encoding?: string }>,
  anonKey: string,
  apiBase: string,
  projectId: string,
  appName?: string,
): Array<{ file: string; data: string; encoding?: string }> {
  return files.map((f) => {
    if (f.file !== "index.html" || f.encoding === "base64") return f;

    let html = f.data;

    // Replace APP_NAME placeholder
    if (appName && html.includes("{{APP_NAME}}")) {
      html = html.replaceAll("{{APP_NAME}}", humanizeName(appName));
    }

    // Replace ANON_KEY placeholder patterns (most-specific first)
    if (html.includes("{ANON_KEY}")) {
      html = html.replace(/\{ANON_KEY\}/g, anonKey);
    } else if (html.includes("'ANON_KEY_PLACEHOLDER'")) {
      html = html.replace(/'ANON_KEY_PLACEHOLDER'/g, `'${anonKey}'`);
    } else if (html.includes('"ANON_KEY_PLACEHOLDER"')) {
      html = html.replace(/"ANON_KEY_PLACEHOLDER"/g, `"${anonKey}"`);
    } else if (html.includes("ANON_KEY_PLACEHOLDER")) {
      html = html.replace(/ANON_KEY_PLACEHOLDER/g, anonKey);
    }

    // Replace API URL placeholder
    if (html.includes("{API_URL}")) {
      html = html.replace(/\{API_URL\}/g, apiBase);
    } else if (html.includes("API_URL_PLACEHOLDER")) {
      html = html.replace(/API_URL_PLACEHOLDER/g, apiBase);
    }

    // If no placeholder was found and no CONFIG block exists, inject one
    if (
      !f.data.includes("ANON_KEY") &&
      !html.includes("window.BLD402_CONFIG")
    ) {
      const configBlock = `<script>window.BLD402_CONFIG = { API_URL: "${apiBase}", ANON_KEY: "${anonKey}", PROJECT_ID: "${projectId}" };</script>`;
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${configBlock}\n</head>`);
      } else if (html.includes("<body")) {
        html = html.replace(/<body[^>]*>/, `$&\n${configBlock}`);
      }
    }

    return { ...f, data: html };
  });
}
