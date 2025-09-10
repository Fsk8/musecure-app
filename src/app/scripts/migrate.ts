import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "src", "app", "lib", "app.db");

async function getDB(): Promise<Database> {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec(`PRAGMA foreign_keys = ON;`);
  return db;
}

type TableInfoRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
};

async function getExistingColumns(
  db: Database,
  table: string
): Promise<Set<string>> {
  // No parametrizar PRAGMA table_info
  const rows = (await db.all(`PRAGMA table_info(${table});`)) as TableInfoRow[];
  const set = new Set<string>();
  for (const r of rows) set.add(r.name);
  return set;
}

async function addColumnIfMissing(
  db: Database,
  table: string,
  name: string,
  definition: string,
  existing: Set<string>
) {
  if (!existing.has(name)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition};`);
    existing.add(name);
    console.log(`[migrate] Columna agregada: ${name}`);
  }
}

async function migrate() {
  const db = await getDB();

  // 1) Crea tabla base si no existe
  await db.exec(`
    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      cid_audio TEXT NOT NULL,
      sha256_audio TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 2) Columnas existentes
  const existing = await getExistingColumns(db, "works");

  // 3) Agrega columnas que falten
  await addColumnIfMissing(db, "works", "artist", "artist TEXT", existing);
  await addColumnIfMissing(
    db,
    "works",
    "fingerprint",
    "fingerprint TEXT",
    existing
  );
  await addColumnIfMissing(db, "works", "address", "address TEXT", existing);
  await addColumnIfMissing(
    db,
    "works",
    "payload_json",
    "payload_json TEXT",
    existing
  );
  await addColumnIfMissing(
    db,
    "works",
    "notarized",
    "notarized INTEGER DEFAULT 0",
    existing
  );
  await addColumnIfMissing(
    db,
    "works",
    "oracle_commitment",
    "oracle_commitment TEXT DEFAULT ''",
    existing
  );

  // 4) Saneos para esquemas previos con NOT NULL sin default
  await db.exec(
    `UPDATE works SET address = COALESCE(address, '') WHERE address IS NULL;`
  );
  await db.exec(
    `UPDATE works SET oracle_commitment = COALESCE(oracle_commitment, '') WHERE oracle_commitment IS NULL;`
  );

  // 5) Índices
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_works_sha ON works(sha256_audio);`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_works_cid ON works(cid_audio);`
  );

  await db.close();
  console.log("[migrate] Migración completada ✅ ->", DB_PATH);
}

migrate().catch((e) => {
  console.error("[migrate] Error:", e);
  process.exit(1);
});
