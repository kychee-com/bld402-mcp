> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Hangman Template

Classic word guessing game with SVG hangman drawing. Solo play or pass-and-play with friends. Built-in word list with categories and difficulty levels.

## Files

- `index.html` — Frontend (single-page HTML with embedded CSS/JS)
- `schema.sql` — Database table definitions and seed data
- `rls.json` — Row-level security policy configuration

## Customization Points

- `{{APP_NAME}}` — App title (appears in header)
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- SVG hangman drawing with progressive reveal
- On-screen letter keyboard input
- Word categories (animals, food, nature, objects, general)
- Difficulty levels (easy, medium, hard)
- Win/lose state detection
- Pass-and-play multiplayer mode
- Mobile-responsive layout

## Schema

Two tables:

- **words** — `id` (serial PK), `word` (text), `category` (text), `difficulty` (text: easy/medium/hard). Seeded with 54 default words.
- **games** — `id` (serial PK), `word_id` (integer FK to words), `guesses` (text array), `status` (text: playing/won/lost), `created_at` (timestamptz)

See `schema.sql` for full table definitions and seed data.

## RLS

- `public_read_write` on `games` — anyone can create and play games
- `public_read` on `words` — anyone can read words, only service role can add new ones

See `rls.json` for policy configuration.

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
