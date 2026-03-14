> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Trivia Night Template

Kahoot-style multiplayer quiz game. Host creates a room with questions, players join via a code, answer in real time, and see live scoring.

## Files

- `index.html` — Frontend (single-page HTML with embedded CSS/JS)
- `schema.sql` — Database table definitions and RPC function
- `rls.json` — Row-level security policy configuration

## Customization Points

- `{{APP_NAME}}` — App title (appears in header)
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Host creates room and adds questions with multiple-choice options
- Players join via shareable room code
- Timed question rounds (configurable per question)
- Live scoring via polling
- Atomic score increment (RPC function to avoid race conditions)
- Final leaderboard display
- Duplicate answer prevention (unique constraint on question + player)
- Mobile-responsive layout

## Schema

Four tables and one RPC function:

- **rooms** — `id`, `code` (unique), `host_name`, `status`, `current_question`, `created_at`
- **questions** — `id`, `room_id` (FK), `question_text`, `options` (jsonb), `correct_index`, `time_limit`, `sort_order`
- **players** — `id`, `room_id` (FK), `name`, `score`, `joined_at`
- **answers** — `id`, `room_id` (FK), `question_id` (FK), `player_id` (FK), `selected_index`, `is_correct`, `answered_at`, unique on `(question_id, player_id)`
- **increment_score(p_player_id, p_points)** — SQL function for atomic score updates

See `schema.sql` for full table definitions, indexes, and the RPC function.

## RLS

Default: `public_read_write` on all tables — required for multiplayer access without auth. Players join by room code. For production, consider adding auth and `user_owns_rows` for answers.

See `rls.json` for policy configuration.

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
