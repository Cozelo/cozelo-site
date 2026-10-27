#!/usr/bin/env bash
# Exits non-zero while any page still contains a placeholder: an element with class "ph"
# (screenshot or video box) or "tbd" (inline note), or bracketed copy such as [proof needed]
# or [confirm ...]. netlify.toml runs this as the production build command.
set -euo pipefail
cd "$(dirname "$0")/.."

pattern='class="([^"]* )?(ph|tbd)( [^"]*)?"|\[(proof needed|confirm)'
if hits=$(grep -rnoE --include='*.html' --exclude-dir=node_modules --exclude-dir=.git "$pattern" .); then
  echo "Placeholders remain ($(printf '%s\n' "$hits" | wc -l | tr -d ' ')). Production build stopped:"
  printf '%s\n' "$hits"
  exit 1
fi
echo "No placeholders found."
