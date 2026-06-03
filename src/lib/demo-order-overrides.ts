"use client";

import type { DemoOrder } from "@/lib/screen-fixtures";

type DemoOrderOverride = Partial<Pick<DemoOrder, "payment" | "status">>;

const OVERRIDES_KEY = "atelie-demo-order-overrides";
const CUSTOM_ORDERS_KEY = "atelie-demo-custom-orders";

export function readDemoOrderOverrides(): Record<string, DemoOrderOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) as Record<string, DemoOrderOverride> : {};
  } catch {
    return {};
  }
}

export function applyDemoOrderOverrides(orders: DemoOrder[]) {
  const overrides = readDemoOrderOverrides();
  return orders.map((order) => ({ ...order, ...(overrides[order.id] ?? {}) }));
}

export function writeDemoOrderOverride(orderId: string, override: DemoOrderOverride) {
  if (typeof window === "undefined") return;
  const current = readDemoOrderOverrides();
  window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify({ ...current, [orderId]: { ...(current[orderId] ?? {}), ...override } }));
}

export function readDemoCustomOrders(): DemoOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_ORDERS_KEY);
    return raw ? JSON.parse(raw) as DemoOrder[] : [];
  } catch {
    return [];
  }
}

export function writeDemoCustomOrder(order: DemoOrder) {
  if (typeof window === "undefined") return;
  const current = readDemoCustomOrders().filter((item) => item.id !== order.id);
  window.localStorage.setItem(CUSTOM_ORDERS_KEY, JSON.stringify([order, ...current]));
}

export function loadDemoOrders(baseOrders: DemoOrder[]) {
  const custom = readDemoCustomOrders();
  const customIds = new Set(custom.map((order) => order.id));
  return applyDemoOrderOverrides([...custom, ...baseOrders.filter((order) => !customIds.has(order.id))]);
}
