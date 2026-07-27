# Reactions backend (Cloudflare Worker)

This little service stores the emoji counts under each photo. Free, no server to
maintain. You only set it up once.

## Setup

1. **Make a free Cloudflare account** at https://dash.cloudflare.com/sign-up
   (email + password; verify your email). That's the only account needed.

2. Back in the chat, tell Claude you've created the account. Claude will run these
   from your Mac (you just approve the browser login once):

   ```bash
   cd reactions-worker
   npx wrangler login                       # opens your browser to approve
   npx wrangler kv namespace create REACTIONS   # prints an id
   # (Claude pastes that id into wrangler.toml)
   npx wrangler deploy                      # prints your worker URL
   ```

3. Claude puts the printed worker URL into `_config.yml` as `reactions_api:` and
   pushes. Reactions go live on the next build.

## What it does

- `GET /counts?keys=<photo paths>` → current counts per photo
- `POST /react` `{ key, emoji, delta }` → adds/removes one reaction

Only the five emoji the site uses are accepted, only ±1 at a time, and it only
answers requests from your site's address. Counts live in Cloudflare KV.
