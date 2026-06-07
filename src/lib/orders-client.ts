"use client";

import type { Order } from "@/lib/domain";
import type { CustomerInput } from "@/lib/customers-client";

type OrderPatch = Partial<Pick<Order, "payment" | "status" | "freight" | "total" | "shippingQuote">>;

async function parseOrdersResponse(res: Response) {
  if (!res.ok) throw new Error("orders_request_failed");
  const payload = await res.json() as { orders?: Order[] };
  return payload.orders ?? [];
}

export async function loadOrders() {
  const res = await fetch("/api/app/orders", {
    cache: "no-store",
    credentials: "include",
  });
  return parseOrdersResponse(res);
}

export async function updateOrder(orderId: string, patch: OrderPatch) {
  const res = await fetch("/api/app/orders", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ orderId, patch }),
  });
  return parseOrdersResponse(res);
}

export async function createOrder(order: Order, customer?: CustomerInput | null) {
  const res = await fetch("/api/app/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ order, customer }),
  });
  return parseOrdersResponse(res);
}
