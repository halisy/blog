// Reactions backend for the field notebook.
// Stores emoji counts per photo in a KV namespace. No accounts, no tracking —
// just tallies. Deploy with wrangler (see README.md in this folder).

const ALLOW_ORIGIN = "https://halisy.github.io";

// Accept any genuine emoji (incl. ZWJ sequences), but reject plain text / junk.
function isEmoji(s) {
  if (typeof s !== "string") return false;
  const cps = [...s];
  if (cps.length === 0 || cps.length > 12) return false;
  if (/[A-Za-z<>{}"\\]/.test(s)) return false;
  return /\p{Extended_Pictographic}/u.test(s);
}

function withCors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  resp.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  resp.headers.set("Access-Control-Allow-Headers", "content-type");
  resp.headers.set("Vary", "Origin");
  return resp;
}
function json(obj, status) {
  return withCors(new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json" },
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

    // GET /counts?keys=a,b,c  ->  { a: {"❤️":3}, b: {...} }
    if (url.pathname === "/counts" && request.method === "GET") {
      const keys = (url.searchParams.get("keys") || "")
        .split(",").map(s => s.trim()).filter(Boolean).slice(0, 50);
      const out = {};
      await Promise.all(keys.map(async (k) => {
        const v = await env.REACTIONS.get("r:" + k);
        out[k] = v ? JSON.parse(v) : {};
      }));
      return json(out);
    }

    // POST /react  { key, emoji, delta: 1 | -1 }
    if (url.pathname === "/react" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
      const key = body && body.key;
      const emoji = body && body.emoji;
      if (!key || typeof key !== "string" || key.length > 300) return json({ error: "bad key" }, 400);
      if (!isEmoji(emoji)) return json({ error: "bad emoji" }, 400);
      const delta = body.delta === -1 ? -1 : 1;
      const id = "r:" + key;
      const counts = JSON.parse((await env.REACTIONS.get(id)) || "{}");
      counts[emoji] = Math.max(0, (counts[emoji] || 0) + delta);
      if (counts[emoji] === 0) delete counts[emoji];
      await env.REACTIONS.put(id, JSON.stringify(counts));
      return json({ key, counts });
    }

    return json({ error: "not found" }, 404);
  },
};
