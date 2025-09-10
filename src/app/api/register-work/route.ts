import { NextRequest, NextResponse } from "next/server";
import { getAddress, Oracle } from "@chopinframework/next";
import { getDB } from "@/app/lib/database";

export const runtime = "nodejs";

type RegisterBody = {
  title: string | null;
  artist: string | null;
  cid_audio: string;
  sha256_audio: string;
  fingerprint: string | null;
  metadata?: any;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody | null;
    if (!body) return bad("JSON vacío");

    const { title, artist, cid_audio, sha256_audio, fingerprint, metadata } =
      body;
    if (!cid_audio || !sha256_audio)
      return bad("Faltan cid_audio o sha256_audio");

    // Identidad del usuario (Chopin)
    const address = await getAddress();

    // Payload a notarizar
    const payload = {
      title: title ?? null,
      artist: artist ?? null,
      cid_audio,
      sha256_audio,
      fingerprint: fingerprint ?? null,
      address,
      metadata: metadata ?? null,
      kind: "musecure.register",
    };

    // La SDK devuelve el valor retornado por el callback (no un "commitment")
    const notarizedValue: any = await Oracle.notarize(async () => {
      const timestamp = await Oracle.now();
      return { ...payload, timestamp };
    });

    // Placeholder hasta que la SDK exponga un recibo/commitment verificable
    const oracleCommitment = "";

    // Guardamos en DB
    const db = await getDB();
    await db.run(
      `INSERT INTO works
       (title, artist, cid_audio, sha256_audio, fingerprint, address, payload_json, notarized, oracle_commitment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        title ?? null,
        artist ?? null,
        cid_audio,
        sha256_audio,
        fingerprint ?? null,
        address,
        JSON.stringify(notarizedValue),
        1, // notarized = true
        oracleCommitment, // "" por ahora
      ]
    );

    return NextResponse.json({
      ok: true,
      notarized: true,
      payload: notarizedValue,
      oracle_commitment: oracleCommitment || null,
    });
  } catch (e: any) {
    console.error("[register-work] Error:", e);
    return NextResponse.json(
      { message: String(e?.message ?? e ?? "Register error") },
      { status: 500 }
    );
  }
}
