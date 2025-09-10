import { NextResponse } from "next/server";
import { getAddress } from "@chopinframework/next";

export async function GET() {
  const address = await getAddress(); // inyectada por el middleware de Chopin
  return NextResponse.json({ address: address ?? null });
}
