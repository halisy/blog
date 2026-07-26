#!/bin/bash
# ────────────────────────────────────────────────────────────
#  Double-click this to put your latest changes online.
#  (New Post.command already publishes for you — use this when
#  you've edited something and want to re-publish.)
# ────────────────────────────────────────────────────────────

cd "$(dirname "$0")" || exit 1

# shrink any big photos so the site stays fast (skips already-small ones)
optimize_photos() {
  local f w h sz
  while IFS= read -r f; do
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
  done < <(find assets/images -type f 2>/dev/null)
}

echo "📖  Publishing your field notebook…"
echo
echo "🔧  Checking your photos (shrinking any big ones)…"
optimize_photos

git add -A
if git diff --cached --quiet; then
  echo "Nothing new to publish — everything is already online."
  echo
  read -r -p "Press Enter to close…" _
  exit 0
fi

echo
echo "About to publish these changes:"
git status --short
echo
printf "A short note for this update (optional — just press Enter to skip)\n> "
read -r MSG
[ -z "$MSG" ] && MSG="Update ($(date +%Y-%m-%d))"

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
