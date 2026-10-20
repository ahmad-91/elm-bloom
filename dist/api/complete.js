const { ready, getPool } = require("../lib/db");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = new Set(["A", "B", "C", "D", "E", "F"]);

module.exports = async function complete(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (err) { body = {}; }
  }
  if (!body || typeof body !== "object") body = {};
  const id = typeof body.id === "string" ? body.id : "";
  const personality = typeof body.personality === "string" ? body.personality : "";
  if (!UUID.test(id) || !TYPES.has(personality)) {
    return res.status(400).json({ error: "invalid" });
  }

  try {
    await ready();
    await getPool().query(
      "INSERT INTO completions (id, personality) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [id, personality]
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "save" });
  }
};
