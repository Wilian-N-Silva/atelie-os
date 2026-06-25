import { NextResponse } from "next/server";
import { publicAppConfig } from "@/lib/deployment";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(publicAppConfig(), {
    headers: { "cache-control": "no-store" },
  });
}
