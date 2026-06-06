import { NextResponse } from "next/server";
import { requireAppRouteContext } from "@/lib/app-route-context";

export const runtime = "nodejs";

function cleanPostalCode(value: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 8);
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const url = new URL(request.url);
  const cep = cleanPostalCode(url.searchParams.get("cep"));
  if (cep.length !== 8) return NextResponse.json({ error: "invalid_postal_code" }, { status: 400 });

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "postal_code_lookup_failed" }, { status: 502 });

  const payload = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || payload.erro === true) return NextResponse.json({ error: "postal_code_not_found" }, { status: 404 });

  return NextResponse.json({
    address: {
      postalCode: cep,
      address: typeof payload.logradouro === "string" ? payload.logradouro : "",
      district: typeof payload.bairro === "string" ? payload.bairro : "",
      city: typeof payload.localidade === "string" ? payload.localidade : "",
      stateAbbr: typeof payload.uf === "string" ? payload.uf : "",
      complement: typeof payload.complemento === "string" ? payload.complemento : "",
    },
  });
}
