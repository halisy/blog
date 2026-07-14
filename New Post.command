#!/bin/bash
# ────────────────────────────────────────────────────────────
#  Double-click this to start a new entry.
#  It makes the file for you (with today's date), then opens
#  it to write in, plus your photos folder to drop pictures in.
# ────────────────────────────────────────────────────────────

cd "$(dirname "$0")" || exit 1

echo "🌱  A new entry for your field notebook"
echo
printf "What's the title?  (e.g.  A good swim)\n> "
read -r TITLE

if [ -z "$TITLE" ]; then
  echo
  echo "No title given — nothing created. Run me again when you're ready."
  echo
  read -r -p "Press Enter to close…" _
  exit 1
fi

DATE=$(date +%Y-%m-%d)
# make a filename-friendly slug from the title
SLUG=$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
[ -z "$SLUG" ] && SLUG="entry"
BASENAME="${DATE}-${SLUG}"
FILE="_posts/${BASENAME}.md"
n=2
while [ -e "$FILE" ]; do BASENAME="${DATE}-${SLUG}-${n}"; FILE="_posts/${BASENAME}.md"; n=$((n + 1)); done

# each post gets its own photo folder — everything dropped in here appears automatically
IMGDIR="assets/images/${BASENAME}"
mkdir -p "$IMGDIR"

cat > "$FILE" <<EOF
---
layout: post
title: "${TITLE}"
date: ${DATE}
place: "Boston"
---

Write a few lines here — whatever this moment was. A sentence or two is plenty.
EOF

echo
echo "✅  Created your entry."
echo "    • A text window is opening — write your words there, then save (Cmd+S)."
echo "    • A Finder window is opening — just drag ALL your photos into it."
echo "      Every photo appears automatically; the first one becomes the"
echo "      little preview out in the field. No file names to type."
echo
echo "When you're done, double-click  «Publish.command»  to put it online."
echo

open "$IMGDIR"           # Finder: drop this post's photos here
open -e "$FILE"          # TextEdit: write here

read -r -p "Press Enter to close this window…" _
