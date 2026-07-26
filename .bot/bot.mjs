// Telegram → field notebook.
// Runs from GitHub Actions on a schedule. Reads new messages from your bot,
// builds up a draft (text + photos, in the order you send them), and on
// /publish writes a real post into the repo. No dependencies — plain Node 20.

import { readFile, writeFile, mkdir } from "node:fs/promises";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED = (process.env.TELEGRAM_ALLOWED_USER_ID || "").trim();
const API = `https://api.telegram.org/bot${TOKEN}`;
const STATE_PATH = ".bot/state.json";
const SITE_URL = "https://halisy.github.io/blog/";

if (!TOKEN) { console.log("No TELEGRAM_BOT_TOKEN — nothing to do."); process.exit(0); }

async function tg(method, params) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}
async function say(chatId, text) {
  if (!chatId) return;
  try { await tg("sendMessage", { chat_id: chatId, text }); } catch {}
}
async function readState() {
  try { return JSON.parse(await readFile(STATE_PATH, "utf8")); }
  catch { return { offset: 0, draft: null }; }
}
async function writeState(s) { await writeFile(STATE_PATH, JSON.stringify(s, null, 2) + "\n"); }

function slugify(s) {
  return (s || "").toLowerCase().normalize("NFKD")
    .replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 60) || "entry";
}
function bostonDate() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); }
function bostonLabel() { return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }); }
async function configLocation() {
  try {
    const m = (await readFile("_config.yml", "utf8")).match(/^location:\s*"?([^"#\n]*)"?/m);
    return m ? m[1].trim() : "";
  } catch { return ""; }
}
function draftTitle(d) {
  if (!d) return "";
  if (d.title) return d.title;
  const t = d.items.find(i => i.type === "text");
  return t ? t.text.split("\n")[0].trim() : "";
}

const state = await readState();
const upd = await tg("getUpdates", { offset: state.offset, timeout: 0, allowed_updates: ["message"] });
if (!upd.ok) { console.log("getUpdates failed:", JSON.stringify(upd).slice(0, 300)); process.exit(0); }
const updates = upd.result || [];
if (updates.length === 0) { console.log("No new messages."); process.exit(0); }

let maxId = state.offset - 1;
let added = 0, publishReq = false, ackChat = null, repliedId = false;

function ensureDraft(chatId) {
  if (!state.draft) state.draft = { items: [], title: null, place: null, chatId };
  state.draft.chatId = chatId;
  return state.draft;
}

for (const u of updates) {
  maxId = Math.max(maxId, u.update_id);
  const m = u.message;
  if (!m) continue;
  const chatId = m.chat && m.chat.id;
  const fromId = m.from && m.from.id;
  ackChat = chatId;

  if (!ALLOWED) {
    if (!repliedId) { await say(chatId, `👋 Your Telegram ID is ${fromId}\n\nAdd it as a repository secret named TELEGRAM_ALLOWED_USER_ID to switch posting on.`); repliedId = true; }
    continue;
  }
  if (String(fromId) !== ALLOWED) continue;

  const text = (m.text || "").trim();

  if (text.startsWith("/")) {
    const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
    const arg = text.slice(cmd.length).trim();
    if (cmd === "/start" || cmd === "/help") {
      await say(chatId, "🌱 Send me a photo-journal entry.\n\n• Send your text and photos in the order you want them on the page.\n• The first line you send becomes the title.\n• Send /publish when you're done.\n\nHandy: /preview, /undo, /cancel, /place <where>, /title <title>.");
    } else if (cmd === "/publish" || cmd === "/post") {
      publishReq = true;
    } else if (cmd === "/cancel" || cmd === "/discard") {
      state.draft = null; await say(chatId, "🗑 Draft discarded. Send new text/photos to start again.");
    } else if (cmd === "/preview") {
      const d = state.draft;
      if (!d || !d.items.length) await say(chatId, "Your draft is empty.");
      else await say(chatId, `Draft: ${d.items.length} item(s) — ${d.items.filter(i=>i.type==="photo").length} photo(s).\nTitle: ${draftTitle(d) || "(none yet)"}\nSend /publish to post.`);
    } else if (cmd === "/title") {
      ensureDraft(chatId).title = arg || null; await say(chatId, arg ? `Title set: "${arg}"` : "Title cleared.");
    } else if (cmd === "/place") {
      ensureDraft(chatId).place = arg || null; await say(chatId, arg ? `Place set: ${arg}` : "Place cleared.");
    } else if (cmd === "/undo") {
      const d = state.draft;
      if (d && d.items.length) { const it = d.items.pop(); await say(chatId, `Removed last ${it.type}. ${d.items.length} left.`); }
      else await say(chatId, "Nothing to undo.");
    } else {
      await say(chatId, "Unknown command. Send text/photos, then /publish.");
    }
    continue;
  }

  if (m.photo && m.photo.length) {
    const d = ensureDraft(chatId);
    if (m.caption && m.caption.trim()) d.items.push({ type: "text", text: m.caption.trim() });
    d.items.push({ type: "photo", file_id: m.photo[m.photo.length - 1].file_id });
    added++; continue;
  }
  if (m.document && (m.document.mime_type || "").startsWith("image/")) {
    const d = ensureDraft(chatId);
    if (m.caption && m.caption.trim()) d.items.push({ type: "text", text: m.caption.trim() });
    d.items.push({ type: "photo", file_id: m.document.file_id });
    added++; continue;
  }
  if (text) { ensureDraft(chatId).items.push({ type: "text", text }); added++; continue; }
}

state.offset = maxId + 1;

if (publishReq) {
  await publish();
} else if (added > 0) {
  const d = state.draft;
  await say(ackChat, `Got it — your draft has ${d.items.length} item(s), ${d.items.filter(i=>i.type==="photo").length} photo(s). Send more, or /publish.`);
}
await writeState(state);
console.log(`Processed ${updates.length} update(s); added ${added}; publish=${publishReq}.`);

async function publish() {
  const d = state.draft;
  if (!d || !d.items.length) { await say(ackChat, "Nothing to publish yet — send some text and photos first."); return; }

  const items = d.items.map(x => ({ ...x }));
  let title = d.title;
  if (!title) {
    const idx = items.findIndex(i => i.type === "text");
    if (idx >= 0) {
      const lines = items[idx].text.split("\n");
      title = lines.shift().trim();
      const rest = lines.join("\n").trim();
      if (rest) items[idx].text = rest; else items.splice(idx, 1);
    }
  }
  if (!title) title = bostonLabel();

  const dateStr = bostonDate();
  const base = `${dateStr}-${slugify(title)}`;
  const imgDir = `assets/images/${base}`;
  await mkdir(imgDir, { recursive: true });
  const place = d.place || (await configLocation()) || "";

  const body = [];
  let n = 0;
  for (const it of items) {
    if (it.type === "text") { body.push(it.text); continue; }
    n++;
    const name = String(n).padStart(2, "0");
    let ext = ".jpg";
    try {
      const f = await tg("getFile", { file_id: it.file_id });
      const fp = f.result && f.result.file_path;
      if (fp) {
        const em = fp.match(/\.[a-z0-9]+$/i); if (em) ext = em[0].toLowerCase();
        const buf = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${TOKEN}/${fp}`)).arrayBuffer());
        await writeFile(`${imgDir}/${name}${ext}`, buf);
      }
    } catch (e) { console.log("photo download failed:", e.message); }
    body.push("[photo]");
  }

  const fm = `---\nlayout: post\ntitle: ${JSON.stringify(title)}\ndate: ${dateStr}\nplace: ${JSON.stringify(place)}\n---\n\n`;
  await mkdir("_posts", { recursive: true });
  await writeFile(`_posts/${base}.md`, fm + body.join("\n\n") + "\n");

  state.draft = null;
  await say(ackChat, `✨ Published "${title}" (${n} photo${n === 1 ? "" : "s"})!\nLive in a few minutes:\n${SITE_URL}`);
  console.log(`Published ${base} with ${n} photo(s).`);
}
