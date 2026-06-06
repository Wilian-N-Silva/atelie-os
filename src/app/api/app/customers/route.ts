import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, customers } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import type { Customer, CustomerAddress } from "@/lib/domain";

export const runtime = "nodejs";

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanNullableString(value: unknown, max: number) {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

function cleanPostalCode(value: unknown) {
  return cleanString(value, 16).replace(/\D/g, "").slice(0, 8);
}

function cleanAddress(value: unknown): CustomerAddress | null {
  if (!value || typeof value !== "object") return null;
  const input = value as CustomerAddress;
  const address = cleanString(input.address, 160);
  const number = cleanString(input.number, 20);
  const district = cleanString(input.district, 80);
  const city = cleanString(input.city, 80);
  const stateAbbr = cleanString(input.stateAbbr, 2).toUpperCase();
  const postalCode = cleanPostalCode(input.postalCode);
  if (!address && !number && !district && !city && !stateAbbr && !postalCode) return null;
  return {
    address,
    number,
    complement: cleanNullableString(input.complement, 80),
    district,
    city,
    stateAbbr,
    postalCode,
  };
}

function customerFromRow(row: typeof customers.$inferSelect): Customer {
  const hasAddress = Boolean(row.address || row.number || row.district || row.city || row.stateAbbr || row.postalCode);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    document: row.document,
    address: hasAddress ? {
      address: row.address ?? "",
      number: row.number ?? "",
      complement: row.complement,
      district: row.district ?? "",
      city: row.city ?? "",
      stateAbbr: row.stateAbbr ?? "",
      postalCode: row.postalCode ?? "",
    } : null,
    source: row.source,
    status: row.status,
  };
}

async function listCustomers(companyId: string) {
  const rows = await db.query.customers.findMany({
    where: eq(customers.companyId, companyId),
    orderBy: (table, { asc }) => [asc(table.name)],
    limit: 500,
  });
  return rows.map(customerFromRow);
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json({ customers: await listCustomers(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const customerId = cleanString(body?.customerId, 80);
  const name = cleanString(body?.name, 120);
  const email = cleanNullableString(body?.email, 120);
  const phone = cleanNullableString(body?.phone, 30);
  const document = cleanNullableString(body?.document, 24);
  const address = cleanAddress(body?.address);
  if (!name) return NextResponse.json({ error: "invalid_customer" }, { status: 400 });

  let id = customerId;
  if (customerId) {
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.companyId, context.company.id), eq(customers.id, customerId)),
      columns: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "customer_not_found" }, { status: 404 });
    await db.update(customers).set({
      name,
      email,
      phone,
      document,
      address: address?.address ?? null,
      number: address?.number ?? null,
      complement: address?.complement ?? null,
      district: address?.district ?? null,
      city: address?.city ?? null,
      stateAbbr: address?.stateAbbr ?? null,
      postalCode: address?.postalCode ?? null,
      updatedAt: new Date(),
    }).where(and(eq(customers.companyId, context.company.id), eq(customers.id, customerId)));
  } else {
    const [created] = await db.insert(customers).values({
      companyId: context.company.id,
      name,
      email,
      phone,
      document,
      address: address?.address ?? null,
      number: address?.number ?? null,
      complement: address?.complement ?? null,
      district: address?.district ?? null,
      city: address?.city ?? null,
      stateAbbr: address?.stateAbbr ?? null,
      postalCode: address?.postalCode ?? null,
      source: "manual",
    }).returning({ id: customers.id });
    id = created.id;
  }

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "customer.upsert",
    entityType: "customer",
    entityId: id,
    metadata: { name, hasAddress: Boolean(address), hasDocument: Boolean(document) },
  });

  return NextResponse.json({ customers: await listCustomers(context.company.id) }, { status: customerId ? 200 : 201 });
}
