const crypto = require("crypto");
const { ready, getPool } = require("../lib/db");

const TYPES = [
  ["A", "محققة الباقات", "🔍🌹"],
  ["B", "ملكة التلميحات", "🎀"],
  ["C", "رسولة الاعترافات", "💘"],
  ["D", "حافظة الأسرار", "🤫"],
  ["E", "صانعة المفاجآت", "🎁"],
  ["F", "مدللة نفسها", "💐"],
];
const WINDOW = 30;

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const header = String(req.headers.authorization || "");
  const got = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (!expected || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function riyadhDay(offset) {
  const when = new Date(Date.now() - offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(when);
}

module.exports = async function stats(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method" });
  }
  if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });

  res.setHeader("Cache-Control", "no-store");

  try {
    await ready();
    const pool = getPool();
    const [total, byType, byDay] = await Promise.all([
      pool.query("SELECT count(*)::int AS n FROM completions"),
      pool.query("SELECT personality, count(*)::int AS n FROM completions GROUP BY personality"),
      pool.query(`
        SELECT to_char((created_at AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM-DD') AS day,
               count(*)::int AS n
        FROM completions
        GROUP BY 1
      `),
    ]);

    const counts = {};
    byType.rows.forEach((row) => { counts[row.personality] = row.n; });
    const days = {};
    byDay.rows.forEach((row) => { days[row.day] = row.n; });
    const today = riyadhDay(0);

    return res.status(200).json({
      total: total.rows[0].n,
      today: days[today] || 0,
      personalities: TYPES.map(([id, name, emoji]) => ({
        id, name, emoji, count: counts[id] || 0,
      })),
      days: Array.from({ length: WINDOW }, (_, i) => {
        const date = riyadhDay(WINDOW - 1 - i);
        return { date, count: days[date] || 0 };
      }),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "stats" });
  }
};
