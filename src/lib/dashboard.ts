export type DashboardStockItem = {
  id: string;
  code: string;
  sku: string;
  name: string;
  variant: string | null;
  unit: string;
  min: number;
  physical: number;
  reserved: number;
  inCure: number;
  blocked: number;
  available: number;
};

export type DashboardAlert = {
  id: string;
  group: "estoque";
  severity: "critical" | "warning";
  title: string;
  desc: string;
  action: { screen: string; open?: string };
};

export type DashboardResponse = {
  companyName: string;
  cards: {
    belowMinimum: number;
    reservedUnits: number;
    inCureUnits: number;
    blockedUnits: number;
  };
  alerts: DashboardAlert[];
  stockSummary: {
    totalItems: number;
    belowMinimum: number;
    totals: {
      physical: number;
      reserved: number;
      inCure: number;
      blocked: number;
      available: number;
    };
    lowStock: DashboardStockItem[];
  };
};

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch("/api/app/dashboard", {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Nao foi possivel carregar o dashboard.");
  }

  return (await res.json()) as DashboardResponse;
}
