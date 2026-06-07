import { NextResponse } from "next/server";
import { requireAppRouteContext } from "@/lib/app-route-context";
import {
  getMercadoLivreUser,
  mercadoLivreOAuthConfigured,
  readMercadoLivreCredential,
} from "@/lib/mercado-livre-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const credential = await readMercadoLivreCredential(context.company.id);
  if (!credential.connected) {
    return NextResponse.json({
      configured: mercadoLivreOAuthConfigured(),
      ...credential,
      user: null,
      apiStatus: null,
    });
  }

  const userResult = await getMercadoLivreUser(context.company.id);
  return NextResponse.json({
    configured: mercadoLivreOAuthConfigured(),
    ...credential,
    user: userResult.user,
    apiStatus: userResult.status,
    apiOk: userResult.ok,
    refreshed: userResult.refreshed,
  });
}
