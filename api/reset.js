const crypto = require("crypto");
const { ready, getPool } = require("../lib/db");

const CLEAR_SECRET = "clear07";

function same(expected, got) {
  const a = Buffer.from(String(expected || ""));
  const b = Buffer.from(String(got || ""));
  if (!expected || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function bearer(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

module.exports = async function reset(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method" });
  }
  if (!same(process.env.ADMIN_PASSWORD || "", bearer(req))) {
    return res.status(401).json({ error: "unauthorized" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (err) { body = {}; }
  }
  if (!body || typeof body !== "object") body = {};
  if (!same(CLEAR_SECRET, body.secret)) {
    return res.status(403).json({ error: "secret" });
  }

  res.setHeader("Cache-Control", "no-store");
  try {
    await ready();
    const result = await getPool().query("DELETE FROM completions");
    return res.status(200).json({ ok: true, deleted: result.rowCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "reset" });
  }
};
