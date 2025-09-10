import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Web service oficial
const ACOUSTID_URL = "https://api.acoustid.org/v2/lookup";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
function bad(message: string, status = 400, extra?: any) {
  return json({ message, ...(extra ? { extra } : {}) }, status);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      fingerprint?: string;
      duration?: number | string;
    } | null;

    const client = process.env.ACOUSTID_CLIENT;
    if (!client) return bad("Falta ACOUSTID_CLIENT en .env.local", 500);

    if (!body?.fingerprint) return bad("Falta fingerprint", 400);
    if (body.duration == null) return bad("Falta duration", 400);

    // duration debe ser entero > 0
    const durationNum = Math.max(0, Math.round(Number(body.duration)));
    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      return bad("duration inválido (debe ser entero > 0)", 400, {
        duration: body.duration,
      });
    }

    // Construye params
    const params = new URLSearchParams({
      client,
      format: "json",
      // agrega todo lo útil para pruebas; puedes reducir luego
      meta: "recordings+releasegroups+compress",
      duration: String(durationNum),
      fingerprint: body.fingerprint,
    });

    // 1) intenta POST x-www-form-urlencoded
    let upstreamRes = await fetch(ACOUSTID_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    let text = await upstreamRes.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!upstreamRes.ok) {
      // 2) Fallback GET (algunos proxies/ISPs molestan POST form)
      const tryGet = await fetch(`${ACOUSTID_URL}?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const textGet = await tryGet.text();
      let dataGet: any;
      try {
        dataGet = JSON.parse(textGet);
      } catch {
        dataGet = { raw: textGet };
      }

      if (!tryGet.ok) {
        // Propaga el status y el cuerpo del upstream para depurar mejor
        return json(
          {
            message: "Upstream AcoustID no-OK",
            post: { status: upstreamRes.status, body: data },
            get: { status: tryGet.status, body: dataGet },
          },
          tryGet.status
        );
      }

      return json(dataGet, 200);
    }

    // OK (POST)
    return json(data, 200);
  } catch (e: any) {
    return bad(String(e?.message ?? e ?? "Lookup error"), 500);
  }
}
