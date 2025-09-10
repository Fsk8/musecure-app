import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Ajusta si usas otro host/puerto de chopd en dev
const ALLOWED_ORIGIN =
  process.env.NEXT_PUBLIC_CHOPIN_ORIGIN || "http://localhost:4000";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Vary", "Origin");
  return res;
}

function okJson(data: any, status = 200) {
  return withCors(NextResponse.json(data, { status }));
}
function errJson(message: string, status = 500, extra?: any) {
  return withCors(
    NextResponse.json({ message, ...(extra ? { extra } : {}) }, { status })
  );
}

// Preflight CORS
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

/** Extrae el CID tolerando distintos shapes de respuesta del SDK */
function extractCid(res: any): string | null {
  return (
    res?.data?.Hash ??
    res?.data?.cid ??
    res?.Hash ??
    res?.cid ??
    res?.data?.[0]?.Hash ??
    res?.data?.[0]?.cid ??
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return errJson("No file", 400);

    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey) return errJson("Falta LIGHTHOUSE_API_KEY", 500);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Import dinámico de la SDK
    let lighthouse: any;
    try {
      const mod = await import("@lighthouse-web3/sdk");
      lighthouse = (mod as any).default ?? mod;
    } catch (e: any) {
      console.error("[upload-ipfs] Error importando SDK:", e);
      return errJson("No se pudo cargar la SDK de Lighthouse", 500);
    }

    // Firma correcta: (buffer, apiKey)
    let sdkRes: any;
    try {
      sdkRes = await lighthouse.uploadBuffer(buffer, apiKey);
    } catch (e: any) {
      console.error("[upload-ipfs] Error de la SDK al subir:", e);
      return errJson(
        String(e?.message ?? e ?? "Lighthouse upload failed"),
        502
      );
    }

    const cid = extractCid(sdkRes);
    if (!cid) {
      console.error(
        "[upload-ipfs] Respuesta inesperada de Lighthouse:",
        sdkRes
      );
      return errJson("No se pudo obtener el CID de Lighthouse", 502, {
        raw: sdkRes,
      });
    }

    return okJson({ cid });
  } catch (e: any) {
    console.error("[upload-ipfs] Error general:", e);
    return errJson(String(e?.message ?? e ?? "Upload error"), 500);
  }
}
