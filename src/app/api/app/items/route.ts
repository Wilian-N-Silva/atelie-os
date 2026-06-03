import { NextResponse } from "next/server";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { CATALOG_WRITE_ROLES } from "@/lib/permissions";
import {
  buildItemsResponse,
  createCatalogItem,
  findDuplicateItem,
  parseItemInput,
  validateItemRelations,
} from "@/lib/items-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  return NextResponse.json(await buildItemsResponse(context.company));
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, CATALOG_WRITE_ROLES);
  if (roleError) return roleError;

  const parsed = parseItemInput(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const relationError = await validateItemRelations(context.company.id, parsed.input);
  if (relationError) return NextResponse.json({ error: relationError }, { status: 400 });

  const duplicateError = await findDuplicateItem(context.company.id, parsed.input);
  if (duplicateError) return NextResponse.json({ error: duplicateError }, { status: 409 });

  const item = await createCatalogItem(context, parsed.input);
  return NextResponse.json({ itemId: item.id, code: item.code }, { status: 201 });
}
