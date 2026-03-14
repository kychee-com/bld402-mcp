> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Micro-Blog Template

Short-form posts with optional image attachments. Public feed, authenticated posting.

## Customization Points

- `{{APP_NAME}}` — App title
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Public feed — anyone can browse posts without logging in
- Authenticated posting — sign up / log in to create posts
- Image attachments — upload a photo with your post (stored in run402 storage)
- Like posts — heart button with count (no auth required)
- Delete your own posts — authors can remove their posts
- 500 character limit with live counter
- Reverse chronological feed
- Mobile-responsive single-column layout

## Services Used

- **auth** — email/password signup and login with JWT sessions
- **storage** — S3 object storage for post images (`posts/` bucket)
- **database** — Postgres for posts table
- **rest-api** — PostgREST for CRUD operations

## Database Schema

```sql
CREATE TABLE posts (
  id serial PRIMARY KEY,
  body text NOT NULL CHECK (char_length(body) <= 500),
  image_path text,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

## RLS Policies

- `public_read` on posts — anyone can read all posts
- `user_owns_rows` on posts — authenticated users can insert and delete their own posts

## Vanity Subdomain

This template is ideal for vanity subdomains. During deployment, suggest the user pick a memorable name:
- `yourname.run402.com`
- `catfacts.run402.com`
- `dailythoughts.run402.com`

The blog URL is the user's identity — make it count.

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
