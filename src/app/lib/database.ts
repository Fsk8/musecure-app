// src/app/lib/database.ts

// Nota: sqlite3 es CJS; con tsx/ESM en Windows es más fiable usar require().
/* eslint-disable @typescript-eslint/no-var-requires */
const sqlite3 = require("sqlite3");
import { open, Database } from "sqlite";

/**
 * Mantenemos una única conexión abierta (singleton).
 * Tipado compatible con require(CJS).
 */
let dbPromise: Promise<
  Database<typeof sqlite3.Database, typeof sqlite3.Statement>
> | null = null;

/** Ruta del archivo de base de datos dentro de src/app (como pediste) */
const DB_PATH = "src/app/lib/app.db";

/** Obtiene/crea la conexión a SQLite */
export async function getDB() {
  if (!dbPromise) {
    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });
  }
  return dbPromise;
}

/** Ejecuta migraciones idempotentes (puedes llamarla en el seed o al boot del server) */
export async function migrate() {
  const db = await getDB();
  await db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      title TEXT,
      artist_name TEXT,
      cid_audio TEXT,
      sha256_audio TEXT NOT NULL,
      fingerprint TEXT,
      extra_json TEXT,
      oracle_commitment TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_works_sha256 ON works(sha256_audio);
  `);
}

/** Helper opcional: inserta/actualiza un registro de obra (por sha256 único) */
export async function upsertWork(input: {
  address: string;
  title?: string | null;
  artist_name?: string | null;
  cid_audio: string;
  sha256_audio: string;
  fingerprint?: string | null;
  extra_json?: Record<string, unknown> | null;
  oracle_commitment: string;
  payload_json: unknown; // el payload de Oracle.notarize()
  created_at?: number; // epoch seconds
}) {
  const db = await getDB();
  const now = Math.floor(Date.now() / 1000);
  const createdAt = input.created_at ?? now;

  await db.run(
    `INSERT OR REPLACE INTO works
     (address, title, artist_name, cid_audio, sha256_audio, fingerprint, extra_json, oracle_commitment, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.address,
      input.title ?? null,
      input.artist_name ?? null,
      input.cid_audio,
      input.sha256_audio,
      input.fingerprint ?? null,
      JSON.stringify(input.extra_json ?? {}),
      input.oracle_commitment,
      JSON.stringify(input.payload_json),
      createdAt,
    ]
  );
}

/** Helper opcional: busca por sha256 o por CID (para /api/verify) */
export async function findWorkByShaOrCid(params: {
  sha256?: string;
  cid?: string;
}) {
  const db = await getDB();
  if (params.sha256) {
    return db.get(
      `SELECT id, address, title, artist_name, cid_audio, sha256_audio, fingerprint, extra_json,
              oracle_commitment, payload_json, created_at
       FROM works WHERE sha256_audio = ?`,
      params.sha256
    );
  }
  if (params.cid) {
    return db.get(
      `SELECT id, address, title, artist_name, cid_audio, sha256_audio, fingerprint, extra_json,
              oracle_commitment, payload_json, created_at
       FROM works WHERE cid_audio = ?`,
      params.cid
    );
  }
  return null;
}

/** (Opcional) Cierra la conexión si alguna vez lo necesitas en tests/scripts */
export async function closeDB() {
  if (dbPromise) {
    const db = await dbPromise;
    await db.close();
    dbPromise = null;
  }
}

/** Exporta la ruta por si quieres mostrarla/loguearla */
export const DB_FILE_PATH = DB_PATH;
