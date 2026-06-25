"use client";
/* ============================================================
   app-root.tsx — session gate + workspace.
   Root: not authed → AuthFlow · authed & !onboarded → Onboarding ·
   authed & onboarded → Workspace (the app). Session comes from the
   Better Auth-backed /api/app/session route.
   ============================================================ */
import * as React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { CommandPalette } from "@/components/command-palette";
import { NotifCenter } from "@/components/notif-center";
import { AuthFlow } from "@/components/auth/auth-flow";
import { Onboarding } from "@/components/onboarding/onboarding";
import { Dashboard } from "@/screens/dashboard";
import { InventoryScreen } from "@/screens/inventory";
import { StockCountScreen } from "@/screens/stock-count";
import { ItemsScreen } from "@/screens/items";
import { ManualScreen } from "@/screens/manual";
import { OrdersScreen } from "@/screens/orders";
import { FreightCalculatorScreen } from "@/screens/freight-calculator";
import { ImportsScreen } from "@/screens/imports";
import { ProductionScreen } from "@/screens/production";
import { QualityScreen } from "@/screens/quality";
import { ReplenishmentScreen } from "@/screens/replenishment";
import { RecipesScreen } from "@/screens/recipes";
import { PricingScreen } from "@/screens/pricing";
import { LabelTemplateEditorScreen, LabelsScreen } from "@/screens/labels";
import { AIContentScreen } from "@/screens/ai-content";
import { SettingsScreen } from "@/screens/settings";
import { OperationScreen } from "@/screens/operation";
import { AuditLogsScreen } from "@/screens/audit-logs";
import { PurchasesScreen } from "@/screens/purchases";
import { FinanceScreen } from "@/screens/finance";
import { ReportsScreen } from "@/screens/reports";
import { IncidentsScreen } from "@/screens/incidents";
import { ExportsScreen } from "@/screens/exports";
import { Empty } from "@/components/ui";
import { Theme } from "@/lib/theme";
import { fetchAppSession } from "@/lib/app-session";
import type { Session, Route, Go } from "@/lib/types";
import type { Notification } from "@/components/notif-center";
import type { OnboardingDonePayload } from "@/components/onboarding/onboarding";

function Placeholder({ name }: { name: string }) {
  return (
    <div className="page fade-in">
      <Empty icon="settings" title={`${name} — em construção`} hint="Esta tela faz parte do MVP e será detalhada na sequência." />
    </div>
  );
}

/* Screens built so far. Others fall back to a placeholder. */
type ScreenProps = { go: Go; route: Route; session: Session };
type ScreenComponentProps = ScreenProps & { onSessionPatch: (patch: Partial<Session>) => void };
type PublicAppConfig = NonNullable<Session["deployment"]>;

const DEFAULT_PUBLIC_CONFIG: PublicAppConfig = {
  deploymentMode: "saas",
  allowSignup: true,
  needsOwnerBootstrap: false,
  brandName: "Atelie OS",
  loginHeadline: "Acesse seu backoffice",
  loginSubheading: "Entre para gerenciar operacao, estoque, pedidos e producao.",
};

async function fetchPublicConfig(): Promise<PublicAppConfig> {
  const res = await fetch("/api/app/public-config", { cache: "no-store" });
  if (!res.ok) return DEFAULT_PUBLIC_CONFIG;
  return { ...DEFAULT_PUBLIC_CONFIG, ...(await res.json()) };
}

const SCREENS: Record<string, React.ComponentType<ScreenComponentProps>> = {
  hoje: Dashboard as React.ComponentType<ScreenComponentProps>,
  pedidos: OrdersScreen as React.ComponentType<ScreenComponentProps>,
  frete: FreightCalculatorScreen as React.ComponentType<ScreenComponentProps>,
  importacoes: ImportsScreen as React.ComponentType<ScreenComponentProps>,
  producao: ProductionScreen as React.ComponentType<ScreenComponentProps>,
  qualidade: QualityScreen as React.ComponentType<ScreenComponentProps>,
  itens: ItemsScreen as React.ComponentType<ScreenComponentProps>,
  receitas: RecipesScreen as React.ComponentType<ScreenComponentProps>,
  precificacao: PricingScreen as React.ComponentType<ScreenComponentProps>,
  estoque: InventoryScreen as React.ComponentType<ScreenComponentProps>,
  contagem: StockCountScreen as React.ComponentType<ScreenComponentProps>,
  reposicao: ReplenishmentScreen as React.ComponentType<ScreenComponentProps>,
  compras: PurchasesScreen as React.ComponentType<ScreenComponentProps>,
  financeiro: FinanceScreen as React.ComponentType<ScreenComponentProps>,
  relatorios: ReportsScreen as React.ComponentType<ScreenComponentProps>,
  incidentes: IncidentsScreen as React.ComponentType<ScreenComponentProps>,
  etiquetas: LabelsScreen as React.ComponentType<ScreenComponentProps>,
  labelEditor: LabelTemplateEditorScreen as React.ComponentType<ScreenComponentProps>,
  ia: AIContentScreen as React.ComponentType<ScreenComponentProps>,
  configuracoes: SettingsScreen as React.ComponentType<ScreenComponentProps>,
  auditoria: AuditLogsScreen as React.ComponentType<ScreenComponentProps>,
  exportar: ExportsScreen as React.ComponentType<ScreenComponentProps>,
  manual: ManualScreen as React.ComponentType<ScreenComponentProps>,
};

function Workspace({
  session,
  onSignOut,
  onSessionPatch,
}: {
  session: Session;
  onSignOut: () => void;
  onSessionPatch: (patch: Partial<Session>) => void;
}) {
  const [theme, setTheme] = React.useState("light");
  const [density, setDensity] = React.useState("comfortable");
  const [route, setRoute] = React.useState<Route>({ screen: "hoje" });
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifState, setNotifState] = React.useState<Record<string, "read" | "resolved">>({});
  const [notifData, setNotifData] = React.useState<Notification[]>([]);

  const refreshNotifications = React.useCallback(() => {
    let alive = true;
    fetch("/api/app/notifications", { cache: "no-store", credentials: "include" })
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((payload: { notifications?: Notification[] }) => { if (alive) setNotifData(payload.notifications ?? []); })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  React.useEffect(() => refreshNotifications(), [refreshNotifications, route.screen]);

  // hydrate persisted UI prefs (client-only to avoid SSR mismatch)
  React.useEffect(() => {
    setTheme(localStorage.getItem("atelie-theme") || "light");
    setDensity(localStorage.getItem("atelie-density") || "comfortable");
    try { const r = JSON.parse(localStorage.getItem("atelie-route") || "null"); if (r) setRoute(r); } catch {}
  }, []);

  React.useEffect(() => {
    if (session.companyBranding?.themeTokens) {
      Theme.apply(session.companyBranding.themeTokens);
    }
  }, [session.companyBranding?.themeTokens]);

  const notifications = React.useMemo(
    () => notifData.map((n) => ({ ...n, status: (notifState[n.id] ?? "unread") as "unread" | "read" | "resolved" })),
    [notifData, notifState]
  );
  const unread = notifications.filter((n) => n.status === "unread").length;
  const markRead = (id: string) => setNotifState((s) => (s[id] === "resolved" ? s : { ...s, [id]: "read" }));
  const markResolved = (id: string) => setNotifState((s) => ({ ...s, [id]: "resolved" }));
  const markAllRead = () => setNotifState((s) => {
    const next = { ...s };
    notifications.forEach((n) => { if (next[n.id] !== "resolved") next[n.id] = "read"; });
    return next;
  });
  const updateNotificationRule = async (ruleId: string, action: "mute" | "disable") => {
    await fetch("/api/app/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ruleId, action, days: 7 }),
    }).catch(() => null);
    refreshNotifications();
  };

  // global ⌘K / Ctrl+K
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    Theme.freezeTransitions();
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("atelie-theme", theme);
  }, [theme]);
  React.useEffect(() => {
    document.documentElement.setAttribute("data-density", density === "compact" ? "compact" : "comfortable");
    localStorage.setItem("atelie-density", density);
  }, [density]);
  React.useEffect(() => { localStorage.setItem("atelie-route", JSON.stringify(route)); }, [route]);

  const go: Go = (screen, params = {}) => {
    setRoute({ screen, ...params });
    const c = document.querySelector(".content");
    if (c) c.scrollTop = 0;
  };

  if (route.screen === "operacao") {
    return (
      <>
        <OperationScreen go={go} route={route} />
        {cmdOpen && <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />}
      </>
    );
  }

  const Screen = SCREENS[route.screen];
  return (
    <>
      <AppShell route={route} go={go} theme={theme} setTheme={setTheme}
        unread={unread} onOpenCmd={() => setCmdOpen(true)} onOpenNotif={() => setNotifOpen(true)}
        user={session.user} company={session.companyName} logoUrl={session.companyBranding?.logoUrl ?? null} onSignOut={onSignOut}>
        {Screen ? <Screen go={go} route={route} session={session} onSessionPatch={onSessionPatch} /> : <Placeholder name={route.screen} />}
      </AppShell>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />
      {notifOpen && <NotifCenter notifications={notifications} unread={unread}
        markRead={markRead} markResolved={markResolved} markAllRead={markAllRead}
        go={go} onClose={() => setNotifOpen(false)} onRuleAction={updateNotificationRule} />}
    </>
  );
}

export function AppRoot() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [publicConfig, setPublicConfig] = React.useState<PublicAppConfig>(DEFAULT_PUBLIC_CONFIG);
  const [ready, setReady] = React.useState(false);
  const [acceptingInvite, setAcceptingInvite] = React.useState(false);

  React.useEffect(() => {
    // apply saved local display preferences so auth/onboarding match the app skin
    document.documentElement.classList.toggle("dark", localStorage.getItem("atelie-theme") === "dark");
    document.documentElement.setAttribute("data-density", localStorage.getItem("atelie-density") === "compact" ? "compact" : "comfortable");
    localStorage.removeItem("atelie-session");
    Promise.all([fetchPublicConfig(), fetchAppSession().catch(() => null)])
      .then(([config, nextSession]) => {
        setPublicConfig(nextSession?.deployment ?? config);
        setSession(nextSession);
      })
      .catch(() => setSession(null))
      .finally(() => setReady(true));
  }, []);

  const setBackendSession = (s: Session | null) => {
    localStorage.removeItem("atelie-session");
    setSession(s);
  };

  const patchSession = React.useCallback((patch: Partial<Session>) => {
    setSession((current) => current ? { ...current, ...patch } : current);
  }, []);

  React.useEffect(() => {
    if (!ready || !session || acceptingInvite) return;
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) return;

    setAcceptingInvite(true);
    fetch(`/api/invites/${encodeURIComponent(token)}`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("invite_accept_failed")))
      .then((nextSession: Session) => {
        window.history.replaceState({}, "", "/");
        setBackendSession(nextSession);
      })
      .catch(() => {
        window.history.replaceState({}, "", "/");
      })
      .finally(() => setAcceptingInvite(false));
  }, [acceptingInvite, ready, session]);

  const finishOnboarding = async ({ companyName, segment, teamSize, logoUrl, invites }: OnboardingDonePayload) => {
    const res = await fetch("/api/app/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ companyName, segment, teamSize, logoUrl, invites }),
    });

    if (!res.ok) throw new Error("Nao foi possivel concluir a configuracao inicial.");
    setBackendSession(await fetchAppSession());
  };

  const signOut = async () => {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    setBackendSession(null);
  };

  if (!ready) return null; // avoid auth/app flash before hydration
  if (!session) return <AuthFlow onAuthed={setBackendSession} config={publicConfig} />;
  if (acceptingInvite) return null;
  if (!session.onboarded) return <Onboarding user={session.user} onDone={finishOnboarding} />;
  return (
    <Workspace
      session={session}
      onSignOut={signOut}
      onSessionPatch={patchSession}
    />
  );
}
