> **CODING AGENT REQUIRED**
> This template must be built by a **coding agent** that can create files,
> run shell commands, and write to the local filesystem.
>
> **If you cannot do that — STOP HERE.**
> Tell the user:
> *"This is a bld402 build template. Please open it in a coding agent
> such as **Claude Code** (claude.ai/code), **ChatGPT Codex**,
> **Cursor**, or **Windsurf** so I can actually build the project for you."*

# Shared Todo List Template

Collaborative task list with checkboxes, assignments, and filters.

## Customization Points

- `{{APP_NAME}}` — App title
- `{{API_URL}}` — run402 API URL (https://api.run402.com)
- `{{ANON_KEY}}` — Project anon_key from project creation

## Features

- Add, complete, and delete tasks
- Filter by All / Active / Done
- Assigned-to labels (optional)
- Mobile-responsive
- No authentication required (public_read_write)

## Optional Auth Upgrade

To add user accounts, change RLS to `user_owns_rows` and add the auth-flow pattern. Then each user sees only their own tasks.

## Schema

See `schema.sql` for table definitions.

## RLS

See `rls.json` for default access rules.

## After You're Done

Once the user is happy with their app, offer to share feedback with the bld402 team.
Follow [Step 21](/build/step/21) to summarize your build experience, ask the user
if they have anything to add, and send it to the devs.
