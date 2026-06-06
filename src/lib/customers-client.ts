"use client";

import type { Customer, CustomerAddress } from "@/lib/domain";

export type CustomerInput = {
  customerId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  address?: CustomerAddress | null;
};

async function parseCustomersResponse(res: Response) {
  if (!res.ok) throw new Error("customers_request_failed");
  const payload = await res.json() as { customers?: Customer[] };
  return payload.customers ?? [];
}

export async function loadCustomers() {
  const res = await fetch("/api/app/customers", {
    cache: "no-store",
    credentials: "include",
  });
  return parseCustomersResponse(res);
}

export async function saveCustomer(input: CustomerInput) {
  const res = await fetch("/api/app/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseCustomersResponse(res);
}
