> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Secret Santa Template

Anonymous gift exchange — organizer creates a group, members join, server-side matching, in-app reveal.

## Customization Points

- `{{APP_NAME}}` — App title
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation
- `{{SERVICE_KEY}}` — Project service_key (needed for draw-names function only)

## Features

- Create a group with name and budget suggestion
- Share a 6-character join code with friends
- Members add display name and wishlist
- Server-side name drawing via Lambda function (no one can see the full list)
- In-app reveal — sign in to see your assignment
- Organizer sees who has viewed their assignment (but not the pairings)
- Minimum 3 members to draw names

## Services Used

- **auth** — email/password signup and login with JWT sessions
- **functions** — Lambda function for server-side name matching (`draw-names`)
- **database** — Postgres for groups and members tables
- **rest-api** — PostgREST for CRUD operations

## Database Schema

See `schema.sql` for full schema (groups + members tables).

## Lambda Function

The `draw-names.js` function must be deployed to the project:
1. Deploy via `POST /projects/v1/admin/:id/functions`
2. Function receives `{ group_id, service_key }`
3. Generates circular shuffle (A→B→C→A, no self-assignments)
4. Writes `assigned_to` for each member using service_key

## RLS Policies

- `user_owns_rows` on members — you can only see your own row and assignment
- `public_read` on groups — anyone can look up a group by code to join

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
