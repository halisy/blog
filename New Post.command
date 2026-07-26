#!/bin/bash
# ────────────────────────────────────────────────────────────
#  Double-click this to write and publish a new entry.
#  It walks you through everything — no terminal knowledge needed.
# ────────────────────────────────────────────────────────────

cd "$(dirname "$0")" || exit 1

# shrink any big photos in a folder so the site stays fast (skips small ones)
optimize_photos() {
  local dir="$1" f w h sz
  for f in "$dir"/*; do
    [ -f "$f" ] || continue
    case "$f" in
      *.jpg|*.JPG|*.jpeg|*.JPEG)
        w=$(sips -g pixelWidth  "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
        h=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/{print $2}')
        sz=$(stat -f%z "$f" 2>/dev/null)
        if [ "${w:-0}" -gt 1600 ] || [ "${h:-0}" -gt 1600 ] || [ "${sz:-0}" -gt 900000 ]; then
          sips -Z 1600 -s formatOptions 72 "$f" >/dev/null 2>&1
        fi ;;
      *.png|*.PNG)
        w=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
        [ "${w:-0}" -gt 1600 ] && sips -Z 1600 "$f" >/dev/null 2>&1 ;;
    esac
  done
}

echo "🌱  A new entry for your field notebook"
echo
printf "What's the title?  (e.g.  A good swim)\n> "
read -r TITLE
if [ -z "$TITLE" ]; then
  echo; echo "No title given — nothing created."; echo
  read -r -p "Press Enter to close…" _; exit 1
fi

DATE=$(date +%Y-%m-%d)
SLUG=$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
[ -z "$SLUG" ] && SLUG="entry"
BASENAME="${DATE}-${SLUG}"
FILE="_posts/${BASENAME}.md"
n=2
while [ -e "$FILE" ]; do BASENAME="${DATE}-${SLUG}-${n}"; FILE="_posts/${BASENAME}.md"; n=$((n + 1)); done

IMGDIR="assets/images/${BASENAME}"
mkdir -p "$IMGDIR"

# use your current location from _config.yml
LOC=$(grep -E '^location:' _config.yml 2>/dev/null | head -1 | sed -E 's/^location:[[:space:]]*"?([^"#]*)"?.*/\1/' | sed 's/[[:space:]]*$//')
[ -z "$LOC" ] && LOC="Boston"

cat > "$FILE" <<EOF
---
layout: post
title: "${TITLE}"
date: ${DATE}
place: "${LOC}"
---

<!--
  Write your entry below (you can delete this note — it never shows up).

  • To drop a photo in, put   [photo]   on its own line where you want it.
    Each [photo] becomes the next picture from your folder, in order.
  • Any photos you don't place this way appear together at the end.
  • No [photo] lines at all? Every photo just shows as one gallery.
-->


EOF

echo
echo "✅  Created your entry.  Two windows are opening:"
echo "    1) a TEXT window — write your words. Put [photo] on its own line"
echo "       wherever you want a picture. Save with Cmd+S when done."
echo "    2) a FINDER window — drag ALL your photos into it (any size is fine)."
echo

open "$IMGDIR"
open -e "$FILE"

echo "── When you've written your entry and added your photos, come back here ──"
printf "and press Enter to publish it (or close this window to publish later).\n> "
read -r _

echo
echo "🔧  Tidying up your photos (shrinking big ones so the page loads fast)…"
optimize_photos "$IMGDIR"

echo "📖  Publishing…"
git add -A
if git diff --cached --quiet; then
  echo "Hmm — nothing to publish yet. Did you save the text window and add photos?"
else
  if git commit -q -m "${TITLE}" && git push -q; then
    echo
    echo "✨  Published!  Your site updates in about a minute:"
    echo "    https://halisy.github.io/blog/"
  else
    echo "⚠️  Something went wrong publishing — scroll up, or ask Claude to look."
  fi
fi

echo
read -r -p "Press Enter to close this window…" _
