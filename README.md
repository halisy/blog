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

## ✍️ Adding a new entry — the easy way (no terminal)

Two double-click helpers live in this folder:

1. Double-click **`New Post.command`**. Type a title. It creates the entry for you
   (with today's date), then opens a text window to write in **and** your photos
   folder to drop pictures into.
2. Write a few lines. Drag your photos into the folder that opened, and type each
   photo's file name into the `![](/assets/images/...)` lines. The first photo also
   becomes the little preview tile out in the field.
3. Save the text window. Double-click **`Publish.command`**. Done — your site
   updates in about a minute.

> First time you double-click one, macOS may ask "are you sure?" — click **Open**.
> If it opens in a text editor instead of running, right-click it → **Open With →
> Terminal**.

### The manual way (if you prefer)

1. Copy `_posts/_TEMPLATE.md` and rename it `YYYY-MM-DD-a-few-words.md`.
2. Put photos in `assets/images/` and list them in the entry.
3. Fill in the title/date, write a few lines, then commit & push (or edit right on
   github.com). The newest entry becomes the homepage automatically.

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
