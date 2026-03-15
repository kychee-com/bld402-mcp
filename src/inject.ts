/**
 * Shared anon_key injection logic.
 *
 * Handles all placeholder variants so build.ts and update.ts
 * behave identically:
 *   {ANON_KEY}
 *   'ANON_KEY_PLACEHOLDER'
 *   "ANON_KEY_PLACEHOLDER"
 *   ANON_KEY_PLACEHOLDER  (bare)
 *   {API_URL}
 *   API_URL_PLACEHOLDER
 *
 * If no placeholder is found a BLD402_CONFIG script block is injected.
 */
export function injectAnonKey(
  files: Array<{ file: string; data: string; encoding?: string }>,
  anonKey: string,
  apiBase: string,
  projectId: string,
): Array<{ file: string; data: string; encoding?: string }> {
  return files.map((f) => {
    if (f.file !== "index.html" || f.encoding === "base64") return f;

    let html = f.data;

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
