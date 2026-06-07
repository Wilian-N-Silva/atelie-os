import { NextResponse } from "next/server";
import { requireAppRouteContext } from "@/lib/app-route-context";
import {
  getNuvemshopStore,
  nuvemshopOAuthConfigured,
  readNuvemshopCredential,
} from "@/lib/nuvemshop-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const credential = await readNuvemshopCredential(context.company.id);
  if (!credential.connected) {
    return NextResponse.json({
      configured: nuvemshopOAuthConfigured(),
      ...credential,
      store: null,
      apiStatus: null,
    });
  }

  const storeResult = await getNuvemshopStore(context.company.id);
  return NextResponse.json({
    configured: nuvemshopOAuthConfigured(),
    ...credential,
    store: storeResult.store,
    apiStatus: storeResult.status,
    apiOk: storeResult.ok,
  });
}
