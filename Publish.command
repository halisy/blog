#!/bin/bash
# ────────────────────────────────────────────────────────────
#  Double-click this to put your latest changes online.
#  It saves everything and pushes it to GitHub; your site
#  updates about a minute later.
# ────────────────────────────────────────────────────────────

cd "$(dirname "$0")" || exit 1

echo "📖  Publishing your field notebook…"
echo

git add -A

if git diff --cached --quiet; then
  echo "Nothing new to publish — everything is already online."
  echo
  read -r -p "Press Enter to close…" _
  exit 0
fi

echo "About to publish these changes:"
git status --short
echo
printf "A short note for this update (optional — just press Enter to skip)\n> "
read -r MSG
[ -z "$MSG" ] && MSG="New entry ($(date +%Y-%m-%d))"

if git commit -q -m "$MSG" && git push -q; then
  echo
  echo "✨  Published!  Your site updates in about a minute:"
  echo "    https://halisy.github.io/blog/"
else
  echo
  echo "⚠️  Something went wrong publishing. Scroll up for the details,"
  echo "    or ask Claude to take a look."
fi

echo
read -r -p "Press Enter to close this window…" _
