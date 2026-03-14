> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Photo Wall Template

Event photo sharing with auth-gated uploads and a gallery grid view.

## Customization Points

- `{{APP_NAME}}` — App title
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Responsive gallery grid (3 cols desktop, 2 tablet, 1 mobile)
- Lightbox view — click any photo to see full-size with caption
- Auth-gated uploads — sign up / log in to post photos
- Captions (up to 200 characters)
- Delete your own photos
- Mobile-responsive, touch-friendly

## Services Used

- **auth** — email/password signup and login with JWT sessions
- **storage** — S3 object storage for photos (`photos/` bucket)
- **database** — Postgres for photos table
- **rest-api** — PostgREST for CRUD operations

## Database Schema

```sql
CREATE TABLE photos (
  id serial PRIMARY KEY,
  caption text CHECK (char_length(caption) <= 200),
  image_path text NOT NULL,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

## RLS Policies

- `public_read` — anyone can view the gallery
- `user_owns_rows` — authenticated users can upload and delete their own photos

## Optional: Private Wall

Replace `public_read` with `user_owns_rows` for read access to create a private wall where only authenticated members can view photos.

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
