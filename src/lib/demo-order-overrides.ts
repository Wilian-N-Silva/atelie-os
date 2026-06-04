"use client";

import { DEMO_ORDERS, type DemoOrder } from "@/lib/screen-fixtures";

type DemoOrderOverride = Partial<Pick<DemoOrder, "payment" | "status">>;

async function parseOrdersResponse(res: Response) {
  if (!res.ok) throw new Error("demo_orders_request_failed");
  const payload = await res.json() as { orders?: DemoOrder[] };
  return payload.orders ?? [...DEMO_ORDERS];
}

export async function loadDemoOrders() {
  const res = await fetch("/api/app/demo-orders", {
    cache: "no-store",
    credentials: "include",
  });
  return parseOrdersResponse(res);
}

export async function writeDemoOrderOverride(orderId: string, override: DemoOrderOverride) {
  const res = await fetch("/api/app/demo-orders", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ orderId, override }),
  });
  return parseOrdersResponse(res);
}

export async function writeDemoCustomOrder(order: DemoOrder) {
  const res = await fetch("/api/app/demo-orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ order }),
  });
  return parseOrdersResponse(res);
}
