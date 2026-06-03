import { NextResponse } from "next/server";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { CATALOG_WRITE_ROLES } from "@/lib/permissions";
import {
  findDuplicateItem,
  parseItemInput,
  updateCatalogItem,
  validateItemRelations,
} from "@/lib/items-server";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, CATALOG_WRITE_ROLES);
  if (roleError) return roleError;

  const { itemId } = await params;
  const parsed = parseItemInput(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const relationError = await validateItemRelations(context.company.id, parsed.input);
  if (relationError) return NextResponse.json({ error: relationError }, { status: 400 });

  const duplicateError = await findDuplicateItem(context.company.id, parsed.input, itemId);
  if (duplicateError) return NextResponse.json({ error: duplicateError }, { status: 409 });

  const item = await updateCatalogItem(context, itemId, parsed.input);
  if (!item) return NextResponse.json({ error: "item_not_found" }, { status: 404 });

  return NextResponse.json({ itemId: item.id, code: item.code });
}
