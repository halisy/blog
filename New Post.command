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
FILE="_posts/${DATE}-${SLUG}.md"
n=2
while [ -e "$FILE" ]; do FILE="_posts/${DATE}-${SLUG}-${n}.md"; n=$((n + 1)); done

cat > "$FILE" <<EOF
---
layout: post
title: "${TITLE}"
date: ${DATE}
place: "Boston"
---

Write a few lines here — whatever this moment was.

Then list your photos below, one per line. Drag the pictures into the
images folder first (it just opened), then use their file names here.
The first photo also becomes the little preview out in the field.

![](/assets/images/PHOTO-NAME.jpg)
EOF

echo
echo "✅  Created  $FILE"
echo "    • A text window is opening — write your words there."
echo "    • A Finder window is opening — drag your photos into it,"
echo "      then type each photo's name in the ![](...) lines."
echo
echo "When you're done, double-click  «Publish.command»  to put it online."
echo

open assets/images/       # Finder: drop your photos here
open -e "$FILE"           # TextEdit: write here

read -r -p "Press Enter to close this window…" _
