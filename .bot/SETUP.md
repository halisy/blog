# Posting from Telegram — one-time setup (~10 minutes)

Once this is set up, you post by messaging your bot: send text and photos in the
order you want them, then send `/publish`. A few minutes later it's live.

## 1. Create your bot

1. In Telegram, search for **@BotFather** and open it.
2. Send **`/newbot`**.
3. Give it a **name** (anything, e.g. "Halis field notebook") and then a
   **username** that ends in `bot` (e.g. `halis_field_bot`).
4. BotFather replies with a **token** that looks like
   `123456789:AA...`. **Copy it** — keep it private.

## 2. Find your Telegram ID

Open **@userinfobot** in Telegram and send it any message. It replies with your
numeric **Id** (e.g. `12345678`). Copy that number.

## 3. Add two secrets to the repo

Go to **https://github.com/halisy/blog/settings/secrets/actions** →
**New repository secret**, and add these two (names must match exactly):

| Name | Value |
|------|-------|
| `TELEGRAM_BOT_TOKEN` | the token from BotFather |
| `TELEGRAM_ALLOWED_USER_ID` | your numeric ID from @userinfobot |

`TELEGRAM_ALLOWED_USER_ID` locks posting to **only you** — no one else can post
to your site even if they find the bot.

## 4. Turn it on

The checker runs automatically every ~5 minutes. To try it immediately, go to the
repo's **Actions** tab → **"Telegram → post"** → **Run workflow**.

## 5. Post!

Open your bot in Telegram and:

- Send **`/start`** to see the how-to.
- Send your **text and photos in the order** you want them on the page.
  The **first line** you send becomes the **title**.
- Send **`/publish`**. In a few minutes your post is live at
  https://halisy.github.io/blog/

Handy commands: `/preview` (see the draft), `/undo` (remove the last thing),
`/cancel` (start over), `/place <where>` (override location), `/title <title>`.

---

### Notes

- **Latency:** posts appear a few minutes after `/publish` (the checker runs every
  ~5 min). If you ever want it instant, ask Claude to switch to the Cloudflare version.
- **Photo size:** send photos the normal way (Telegram compresses them to a good
  web size automatically).
- **If the token ever leaks**, open @BotFather → `/revoke` to get a new one, then
  update the `TELEGRAM_BOT_TOKEN` secret.
- The double-click `New Post.command` still works too — this is just an easier option.
