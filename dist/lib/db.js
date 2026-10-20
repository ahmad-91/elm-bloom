const { Pool } = require("pg");

let pool;
let schemaReady;

function connectionString() {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL missing");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString(),
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
  }
  return pool;
}

function ready() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS completions (
        id uuid PRIMARY KEY,
        personality char(1) NOT NULL CHECK (personality IN ('A','B','C','D','E','F')),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS completions_created_at_idx ON completions (created_at);
    `);
  }
  return schemaReady;
}

module.exports = { getPool, ready };
