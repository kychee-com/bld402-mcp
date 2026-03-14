> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Landing Page + Waitlist Template

Product launch page with email signup form. Hero section, features grid, and call-to-action with a gradient design.

## Files

- `index.html` — Frontend (single-page HTML with embedded CSS/JS)
- `schema.sql` — Database table definition
- `rls.json` — Row-level security policy configuration

## Customization Points

- `{{APP_NAME}}` — App/product title (appears in page title and hero)
- `{{APP_TAGLINE}}` — Hero subtitle text
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Gradient hero section with headline and tagline
- Features grid section (customizable)
- Email signup form with duplicate detection
- Thank-you confirmation state after signup
- Mobile-responsive design

## Schema

One table:

- **signups** — `id`, `email` (unique), `created_at`

See `schema.sql` for full table definition.

## RLS

Default: `public_read_write` on `signups` — anyone can submit their email. For production, consider adding rate limiting or switching to a more restrictive policy.

See `rls.json` for policy configuration.

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
