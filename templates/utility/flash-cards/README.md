> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Flash Cards Template

Create and study decks with spaced repetition. Personal decks, authenticated.

## Customization Points

- `{{APP_NAME}}` — App title
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Sign up / log in to manage decks
- Create decks with name, description, and cards (front/back)
- Study mode with card flip animation
- Spaced repetition (SM-2 simplified): Easy/Hard/Again rating
- Progress tracking (% mastered per deck)
- Share decks publicly — others can view and clone
- Mobile-first study mode

## Services Used

- **auth** — email/password signup and login with JWT sessions
- **database** — Postgres for decks, cards, and progress tables
- **rest-api** — PostgREST for CRUD operations

## Database Schema

See `schema.sql` for full schema (decks + cards + progress tables).

## RLS Policies

- `user_owns_rows` on all tables — you see only your own data
- Public decks need a custom read policy added after RLS template:
  ```sql
  CREATE POLICY public_decks_read ON decks FOR SELECT
    USING (is_public = true OR user_id = auth.uid());
  CREATE POLICY public_cards_read ON cards FOR SELECT
    USING (deck_id IN (SELECT id FROM decks WHERE is_public = true OR user_id = auth.uid()));
  ```

## Spaced Repetition Algorithm

Simplified SM-2:
- **Again:** interval = 0, ease_factor -= 0.2 (min 1.3)
- **Hard:** interval = max(1, interval * 1.2), ease_factor -= 0.15 (min 1.3)
- **Easy:** interval = max(1, interval * ease_factor), ease_factor += 0.15
- **next_review** = now() + interval_days
- Cards due: where next_review <= now()

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
