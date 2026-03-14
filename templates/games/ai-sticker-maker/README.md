> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# AI Sticker Maker Template

Generate AI sticker images from text prompts. Public gallery with likes.

## Customization Points

- `{{APP_NAME}}` — App title
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Type a prompt, generate an AI sticker image ($0.01 per generation via x402)
- Save generated stickers to public gallery
- Browse all stickers in a responsive grid
- Like stickers (no auth required)
- Optional creator name (defaults to "Anonymous")
- 200 character prompt limit with live counter

## Services Used

- **generate-image** — AI image generation via x402-gated endpoint
- **functions** — Lambda proxy function handles x402 payment with project wallet
- **storage** — S3 object storage for sticker images (`stickers/` bucket)
- **database** — Postgres for stickers table
- **rest-api** — PostgREST for CRUD operations

## Database Schema

```sql
CREATE TABLE stickers (
  id serial PRIMARY KEY,
  prompt text NOT NULL CHECK (char_length(prompt) <= 200),
  image_path text NOT NULL,
  creator_name text DEFAULT 'Anonymous',
  likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

## RLS Policies

- `public_read_write` on stickers — anyone can create and browse stickers

## Setup: generate-image-proxy Function

This template requires deploying a Lambda function that handles x402 payment:

1. Deploy the `generate-image-proxy` function (see `templates/patterns/generate-image.js` for the full Lambda code)
2. Set the `WALLET_PRIVATE_KEY` secret on the function (from the project wallet)
3. The client calls this function, which pays $0.01 per image via x402 and returns the generated image URL
4. The client then downloads the image and uploads it to storage

See `templates/patterns/generate-image.js` for the complete proxy function code and deployment instructions.

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
