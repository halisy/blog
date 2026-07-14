# 🌫️ The field — a notebook you wander

A personal photo-journal that you *explore* instead of scroll. You arrive in a soft,
foggy space centered on your most recent moment. Every other entry is scattered around
you in the haze. You **drag to wander**; whatever you pull toward the center comes into
focus and its words surface; click it and the full note opens. Understanding arrives in
three layers — a shape in the fog → a glimpse of words → the meaning.

The whole space also takes on the color of your newest moment, and that hue drifts
across the spectrum as you post over time — so the blog literally *looks* like it's
progressing.

Built with [Jekyll](https://jekyllrb.com) and hosted free on **GitHub Pages**. Your
entries are still just one markdown file each — the field builds itself from them.

**How the layers work**
- The home page (`index.html`) is the field. It reads your entries from `data.json`,
  which Jekyll generates automatically from `_posts` — you never touch it.
- The look/feel lives in `assets/css/field.css`; the wandering + focus behavior in
  `assets/js/field.js`.
- There's also a plain **index** (the button, top-right) — a simple readable list of
  everything, good for accessibility and for anyone who'd rather not wander.

---

## ✍️ Adding a new entry (the everyday thing)

1. Open the `_posts` folder and **copy** `_TEMPLATE.md`.
2. **Rename** the copy to `YYYY-MM-DD-a-few-words.md` — e.g. `2026-07-20-a-good-swim.md`.
   The date at the front is what orders your blog and picks the mood color.
3. Put your photos in the `assets/images/` folder.
4. Fill in the top section (title, date, cover photo) and write a few lines.
5. Save → commit → push. Done. The newest entry becomes the homepage automatically.

That's the whole workflow. One file per entry, no tools required.

---

## 🚀 Publishing it the first time

You only do this once.

### If you're comfortable with git

```bash
cd /Users/halis/Desktop/Blog
git init
git add .
git commit -m "Start my field notebook"
```

Then create a repo on GitHub and push. Two naming choices:

- **Repo named `YOURUSERNAME.github.io`** → your site lives at `https://YOURUSERNAME.github.io`
  (keep `baseurl: ""` in `_config.yml`).
- **Repo named anything else, e.g. `blog`** → your site lives at
  `https://YOURUSERNAME.github.io/blog` — in that case set `baseurl: "/blog"` in `_config.yml`.

```bash
git remote add origin https://github.com/YOURUSERNAME/REPO.git
git branch -M main
git push -u origin main
```

### Turn on GitHub Pages

1. On GitHub, open your repo → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**. Save.
4. Wait ~1 minute, refresh — GitHub shows your live link at the top of that page.

From then on, every push updates the live site in under a minute.

### Prefer not to use the terminal?

You can create the repo on github.com, click **Add file → Upload files**, and drag this
whole folder's contents in. Then do the same **Settings → Pages** step above.

---

## 🎨 Making it yours

- **Your name / tagline:** edit the top of `_config.yml`.
- **Your current location** (shown next to your name): edit the `location:` line in
  `_config.yml` — change it every time you move.
- **Colors & atmosphere of the field:** the `:root` block at the top of
  `assets/css/field.css` (fog darkness, glow, fonts).
- **How the field feels to wander:** `assets/js/field.js` — near the top, `SPREAD`
  (how far apart moments sit), `FOCUS_R` (how close before one wakes up), and `HERE_R`
  (how centered before it's clickable).
- **How fast the mood shifts:** the `* 11` in `hueFromISO` (in `field.js`) controls how
  much the color travels per day.

---

## 👀 Previewing on your own computer (optional)

Not required — GitHub builds the site for you. But if you want to see changes before
pushing:

```bash
gem install bundler
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000>.

---

*Always in progress — which is the whole idea.*
