> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Voting Booth Template

Create polls, share links, vote, and see live results with animated bar charts. One vote per person.

## Files

- `index.html` — Frontend (single-page HTML with embedded CSS/JS)
- `schema.sql` — Database table definitions
- `rls.json` — Row-level security policy configuration

## Customization Points

- `{{APP_NAME}}` — App title (appears in header)
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Create polls with custom title, description, and options
- Shareable poll links
- One-vote-per-person enforcement (browser-generated voter_id in localStorage)
- Live results with animated bar charts via polling
- Optional multiple-choice mode
- Poll close/open toggle
- Mobile-responsive layout

## Schema

Three tables:

- **polls** — `id`, `title`, `description`, `created_by`, `multiple_choice`, `closed`, `created_at`
- **options** — `id`, `poll_id` (FK), `label`, `sort_order`
- **votes** — `id`, `poll_id` (FK), `option_id` (FK), `voter_id`, `voted_at`, unique on `(poll_id, voter_id)`

See `schema.sql` for full table definitions and indexes.

## RLS

Default: `public_read_write` on all tables. One-vote-per-user is enforced by the `UNIQUE(poll_id, voter_id)` constraint using a browser-generated voter_id stored in localStorage.

See `rls.json` for policy configuration.

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
