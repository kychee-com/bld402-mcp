> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Memory Match Template

Card flip matching game with AI-generated art and leaderboard.

## Customization Points

- `{{APP_NAME}}` — App title
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Three difficulty levels: Easy (3x4, 6 pairs), Medium (4x4, 8 pairs), Hard (4x5, 10 pairs)
- Pre-generated AI art card sets (created during build with generate-image)
- CSS 3D card flip animation
- Move counter and timer
- Leaderboard with scores by difficulty
- Mobile-friendly touch targets

## Services Used

- **generate-image** — AI art for card images (generated during build, not at runtime)
- **storage** — S3 object storage for card set images (`memory-match/` bucket)
- **database** — Postgres for card sets, card images, and scores
- **rest-api** — PostgREST for CRUD operations

## Database Schema

```sql
CREATE TABLE card_sets (
  id serial PRIMARY KEY,
  name text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE card_images (
  id serial PRIMARY KEY,
  card_set_id integer NOT NULL REFERENCES card_sets(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_path text NOT NULL,
  pair_index integer NOT NULL
);

CREATE TABLE scores (
  id serial PRIMARY KEY,
  player_name text NOT NULL,
  difficulty text NOT NULL,
  moves integer NOT NULL,
  time_seconds integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

## RLS Policies

- `public_read` on card_sets and card_images — everyone can see the cards
- `public_read_write` on scores — anyone can submit scores to the leaderboard

## Seed Art Generation

During build, the agent generates AI art for card sets using generate-image:

- **Easy set** ("Animals"): 6 unique animal images
- **Medium set** ("Space"): 8 unique space-themed images
- **Hard set** ("Ocean"): 10 unique ocean creature images

Each image is generated via the generate-image-proxy function ($0.01 each), saved to storage, and recorded in card_images with pair_index. Total seed cost: ~$0.24 (24 unique images).

Card images are stored at: `memory-match/{set_name}/{pair_index}.png`

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
