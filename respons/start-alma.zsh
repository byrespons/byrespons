#!/bin/zsh
set -eu

runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [[ ! -x "$runtime" ]]; then
  runtime=$(command -v node) || { print -u2 'Fant ikke Node.js.'; exit 1; }
fi

read -rs 'alma_key?Lim inn den nye OpenAI-nøkkelen og trykk Enter: ' || exit 1
print
if [[ "$alma_key" != sk-* || "$alma_key" == *[^A-Za-z0-9_-]* ]]; then
  print -u2 'Lim inn bare API-nøkkelen som starter med sk-.'
  exit 1
fi

export OPENAI_API_KEY="$alma_key"
unset alma_key
export OPENAI_MODEL="${OPENAI_MODEL:-gpt-6.2-sol}"
export RESPONS_PORT="${RESPONS_PORT:-8766}"
exec "$runtime" --env-file-if-exists="${0:A:h}/.env.local" "${0:A:h}/server.mjs"
