"use client";

export type ShippingQuoteService = {
  id: string;
  name: string;
  company: string | null;
  price: number;
  deliveryTime: number | null;
  currency: "BRL";
};

export type ShippingQuoteResponse = {
  mode: string;
  available: boolean;
  message: string;
  services?: ShippingQuoteService[];
  status?: number;
};

export type ShippingAddressInput = {
  documentType?: "cpf" | "cnpj";
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  companyDocument?: string;
  stateRegister?: string;
  address: string;
  complement?: string;
  number: string;
  district: string;
  city: string;
  stateAbbr: string;
  postalCode: string;
  note?: string;
};

export type ShippingLabel = {
  provider: "melhor_envio" | string;
  externalId: string;
  protocol: string | null;
  status: string | null;
  serviceId: string;
  serviceName: string;
  company: string | null;
  price: number | null;
  tracking: string | null;
  trackingUrl: string | null;
  cartInsertedAt: string;
  checkoutAt?: string | null;
  generatedAt?: string | null;
  previewUrl?: string | null;
  printUrl?: string | null;
};

export async function quoteShipping(input: {
  destinationZip: string;
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}) {
  const res = await fetch("/api/app/shipping", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("shipping_quote_failed");
  const payload = await res.json() as { quote?: ShippingQuoteResponse };
  return payload.quote ?? {
    mode: "manual",
    available: false,
    message: "Cotacao indisponivel.",
  };
}

export async function createShippingCartLabel(input: {
  orderId: string;
  sender: ShippingAddressInput;
  recipient: ShippingAddressInput;
  volume: {
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  options: {
    insuranceValue: number;
    receipt: boolean;
    ownHand: boolean;
    nonCommercial: boolean;
    invoiceKey?: string;
  };
}) {
  const res = await fetch("/api/app/shipping/labels", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const payload = await res.json().catch(() => null) as { shippingLabel?: ShippingLabel; message?: string } | null;
  if (!res.ok || !payload?.shippingLabel) {
    throw new Error(payload?.message || "shipping_label_failed");
  }
  return payload.shippingLabel;
}

export async function runShippingLabelAction(input: {
  orderId: string;
  action: "checkout" | "generate" | "preview" | "print";
}) {
  const res = await fetch("/api/app/shipping/labels", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const payload = await res.json().catch(() => null) as { shippingLabel?: ShippingLabel; url?: string | null; message?: string } | null;
  if (!res.ok || !payload?.shippingLabel) {
    throw new Error(payload?.message || "shipping_label_action_failed");
  }
  return {
    shippingLabel: payload.shippingLabel,
    url: payload.url ?? null,
  };
}
