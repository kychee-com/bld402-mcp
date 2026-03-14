> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Bingo Card Generator Template

Host creates custom bingo games, players join with a code and get unique shuffled cards.

## Customization Points

- `{{APP_NAME}}` — App title
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Host creates a game with custom items (at least 24 for 5x5 grid + FREE center)
- Shareable 6-character join code
- Each player gets a unique shuffled 5x5 card
- FREE center space (auto-marked)
- Host calls items — players can only mark called items
- Auto-detect bingo (rows, columns, diagonals)
- Real-time polling for game updates
- Mobile-friendly touch grid

## Services Used

- **database** — Postgres for games, items, and players
- **rest-api** — PostgREST for CRUD operations

## Database Schema

```sql
CREATE TABLE games (
  id serial PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  host_name text NOT NULL,
  status text DEFAULT 'setup' CHECK (status IN ('setup', 'playing', 'finished')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE items (
  id serial PRIMARY KEY,
  game_id integer NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  label text NOT NULL,
  called boolean DEFAULT false,
  call_order integer
);

CREATE TABLE players (
  id serial PRIMARY KEY,
  game_id integer NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name text NOT NULL,
  card jsonb NOT NULL DEFAULT '[]',
  marked jsonb NOT NULL DEFAULT '[]',
  has_bingo boolean DEFAULT false,
  joined_at timestamptz DEFAULT now()
);
```

## RLS Policies

- `public_read` on games and items — everyone can see game state
- `public_read_write` on players — anyone can join a game (no auth, low friction party game)

## Game Flow

1. **Host** creates game → enters game name, host name, and 24+ items (one per line)
2. **Host** shares the 6-character join code with players
3. **Players** join with code + name → get a unique shuffled 5x5 card
4. **Host** starts the game → begins calling items one at a time
5. **Players** mark called items on their card → tap to mark/unmark
6. **Player** gets 5 in a row/column/diagonal → BINGO! (auto-detected)

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
