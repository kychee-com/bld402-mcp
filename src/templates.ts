import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Templates are at package root: ../templates (from dist/) or ../../templates (from src/)
function getTemplatesDir(): string {
  // Try dist layout first (npm package)
  let dir = join(__dirname, "..", "templates");
  if (existsSync(dir)) return dir;
  // Try src layout (dev)
  dir = join(__dirname, "..", "..", "templates");
  if (existsSync(dir)) return dir;
  return dir;
}

export interface TemplateInfo {
  category: string;
  name: string;
  description: string;
  hasAuth: boolean;
  hasFunctions: boolean;
}

export interface TemplateFiles {
  category: string;
  name: string;
  schema: string;
  rls: unknown;
  html: string;
  readme: string;
  functions?: Record<string, string>;
}

const TEMPLATE_META: TemplateInfo[] = [
  { category: "utility", name: "shared-todo", description: "Collaborative task list with checkboxes and assignments", hasAuth: false, hasFunctions: false },
  { category: "utility", name: "landing-waitlist", description: "Product launch page with email signup", hasAuth: false, hasFunctions: false },
  { category: "utility", name: "voting-booth", description: "Create a poll, share link, see live results", hasAuth: false, hasFunctions: false },
  { category: "utility", name: "paste-locker", description: "Secure pastebin with server-side password hashing", hasAuth: false, hasFunctions: true },
  { category: "utility", name: "micro-blog", description: "Short-form posts with image attachments — public feed, authenticated posting", hasAuth: true, hasFunctions: false },
  { category: "utility", name: "photo-wall", description: "Event photo sharing with auth-gated uploads and gallery view", hasAuth: true, hasFunctions: false },
  { category: "utility", name: "secret-santa", description: "Anonymous gift exchange with server-side matching", hasAuth: true, hasFunctions: true },
  { category: "utility", name: "flash-cards", description: "Create and study decks with spaced repetition", hasAuth: true, hasFunctions: false },
  { category: "games", name: "hangman", description: "Classic word guessing — solo play with random words", hasAuth: false, hasFunctions: false },
  { category: "games", name: "trivia-night", description: "Kahoot-style: host creates questions, players join via code, live scoring", hasAuth: false, hasFunctions: false },
  { category: "games", name: "ai-sticker-maker", description: "Type a prompt, get an AI-generated sticker, save to public gallery", hasAuth: false, hasFunctions: false },
  { category: "games", name: "bingo-card-generator", description: "Host calls items, players mark unique cards, auto-detect bingo", hasAuth: false, hasFunctions: false },
  { category: "games", name: "memory-match", description: "Card flip matching game with AI-generated art and leaderboard", hasAuth: false, hasFunctions: false },
];

export function listTemplates(): TemplateInfo[] {
  return TEMPLATE_META;
}

export function getTemplate(name: string): TemplateFiles | null {
  const meta = TEMPLATE_META.find((t) => t.name === name);
  if (!meta) return null;

  const dir = join(getTemplatesDir(), meta.category, meta.name);
  if (!existsSync(dir)) return null;

  const readFile = (f: string) => {
    const p = join(dir, f);
    return existsSync(p) ? readFileSync(p, "utf-8") : "";
  };

  const result: TemplateFiles = {
    category: meta.category,
    name: meta.name,
    schema: readFile("schema.sql"),
    rls: (() => {
      try {
        return JSON.parse(readFile("rls.json"));
      } catch {
        return {};
      }
    })(),
    html: readFile("index.html"),
    readme: readFile("README.md"),
  };

  // Load function files (e.g. paste-locker has create-note.js, read-note.js)
  const files = readdirSync(dir);
  const fnFiles = files.filter(
    (f) =>
      f.endsWith(".js") &&
      f !== "index.js",
  );
  if (fnFiles.length > 0) {
    result.functions = {};
    for (const f of fnFiles) {
      result.functions[f.replace(".js", "")] = readFile(f);
    }
  }

  return result;
}

/** Get design rules and patterns for building from scratch. */
export function getPatterns(): Record<string, string> {
  const patternsDir = join(getTemplatesDir(), "patterns");
  if (!existsSync(patternsDir)) return {};

  const result: Record<string, string> = {};
  const files = readdirSync(patternsDir);
  for (const f of files) {
    const content = readFileSync(join(patternsDir, f), "utf-8");
    result[f.replace(/\.(js|html)$/, "")] = content;
  }
  return result;
}
