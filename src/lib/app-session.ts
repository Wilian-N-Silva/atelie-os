import type { Session } from "@/lib/types";

export async function fetchAppSession(): Promise<Session | null> {
  const res = await fetch("/api/app/session", {
    cache: "no-store",
    credentials: "include",
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Nao foi possivel carregar a sessao.");

  return (await res.json()) as Session;
}
