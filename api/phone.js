const { ready, getPool } = require("../lib/db");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function saudiMobile(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  if (d.length === 9 && d.startsWith("5")) d = "0" + d;
  return /^05\d{8}$/.test(d) ? d : "";
}

module.exports = async function phone(req, res) {
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
  const phone = saudiMobile(body.phone);
  if (!UUID.test(id) || !phone) return res.status(400).json({ error: "invalid" });

  try {
    await ready();
    const pool = getPool();
    const updated = await pool.query(
      "UPDATE completions SET phone = $1 WHERE id = $2 RETURNING id",
      [phone, id]
    );
    if (updated.rowCount) return res.status(200).json({ ok: true });
    const exists = await pool.query("SELECT id FROM completions WHERE id = $1", [id]);
    if (!exists.rowCount) return res.status(404).json({ error: "missing" });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "phone" });
  }
};
