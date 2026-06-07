import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, provider: "mercado_livre" });
}

export async function POST(request: Request) {
  await request.json().catch(() => null);
  return NextResponse.json({ ok: true });
}
