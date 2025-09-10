import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/app/lib/database";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sha256 = url.searchParams.get("sha256");
    const cid = url.searchParams.get("cid");
    if (!sha256 && !cid) {
      return NextResponse.json(
        { message: "Provee ?sha256=... o ?cid=..." },
        { status: 400 }
      );
    }

    const db = await getDB();
    let row: any;
    if (sha256) {
      row = await db.get(
        `SELECT payload_json, notarized FROM works WHERE sha256_audio = ? LIMIT 1`,
        [sha256]
      );
    } else {
      row = await db.get(
        `SELECT payload_json, notarized FROM works WHERE cid_audio = ? LIMIT 1`,
        [cid]
      );
    }

    if (!row) return NextResponse.json({ verified: false });

    let payload: any = null;
    try {
      payload = row.payload_json ? JSON.parse(row.payload_json) : null;
    } catch {
      payload = row.payload_json ?? null;
    }

    return NextResponse.json({
      verified: !!row.notarized,
      notarized: !!row.notarized,
      payload,
      // commitment: null
    });
  } catch (e: any) {
    console.error("[verify] Error:", e);
    return NextResponse.json(
      { message: String(e?.message ?? e ?? "Verify error") },
      { status: 500 }
    );
  }
}
