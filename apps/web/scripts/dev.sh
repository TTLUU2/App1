#!/bin/sh
# Dev launcher. Unsets any AI-provider env vars the parent shell has left
# as EMPTY strings before invoking next dev. Next.js's env-file loader
# refuses to override variables already present in process.env, so a
# globally-set empty ANTHROPIC_API_KEY (common when Claude Code or the
# Anthropic CLI is installed) would mask the value in apps/web/.env.local
# and break every Claude-backed endpoint.
#
# Pattern: any var that's set-but-empty gets unset, so .env.local can win.
# Any var that's set-and-non-empty stays (shell exports remain authoritative).

# Unset EMPTY ones so .env.local can populate.
for VAR in ANTHROPIC_API_KEY OPENAI_API_KEY; do
  eval "VALUE=\${$VAR}"
  if [ -z "$VALUE" ]; then
    unset "$VAR"
  fi
done

# Always unset ANTHROPIC_BASE_URL — the Claude Code shell exports it as
# `https://api.anthropic.com` (no /v1 suffix), which makes the AI SDK's
# Anthropic provider 404 when it appends `/v1/messages`. Letting the SDK
# default to its own baseURL is the fix.
unset ANTHROPIC_BASE_URL

exec next dev --webpack "$@"
