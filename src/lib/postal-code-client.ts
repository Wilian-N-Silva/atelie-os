"use client";

export type PostalCodeAddress = {
  postalCode: string;
  address: string;
  district: string;
  city: string;
  stateAbbr: string;
  complement: string;
};

export async function lookupPostalCode(cep: string) {
  const clean = cep.replace(/\D/g, "").slice(0, 8);
  if (clean.length !== 8) throw new Error("invalid_postal_code");
  const res = await fetch(`/api/app/postal-code?cep=${clean}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("postal_code_lookup_failed");
  const payload = await res.json() as { address?: PostalCodeAddress };
  if (!payload.address) throw new Error("postal_code_lookup_failed");
  return payload.address;
}
