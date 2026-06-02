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

const SCREENS: Record<string, React.ComponentType<ScreenProps>> = {
  hoje: Dashboard as React.ComponentType<ScreenProps>,
};

function Workspace({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [theme, setTheme] = React.useState("light");
  const [density, setDensity] = React.useState("comfortable");
  const [route, setRoute] = React.useState<Route>({ screen: "hoje" });
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifState, setNotifState] = React.useState<Record<string, "read" | "resolved">>({});

  // hydrate persisted UI prefs (client-only to avoid SSR mismatch)
  React.useEffect(() => {
    setTheme(localStorage.getItem("atelie-theme") || "light");
    setDensity(localStorage.getItem("atelie-density") || "comfortable");
    try { const r = JSON.parse(localStorage.getItem("atelie-route") || "null"); if (r) setRoute(r); } catch {}
    try { setNotifState(JSON.parse(localStorage.getItem("atelie-notif") || "{}")); } catch {}
  }, []);

  React.useEffect(() => { localStorage.setItem("atelie-notif", JSON.stringify(notifState)); }, [notifState]);

  const notifications = React.useMemo(
    () => ([] as Notification[]).map((n) => ({ ...n, status: (notifState[n.id] ?? "unread") as "unread" | "read" | "resolved" })),
    [notifState]
  );
  const unread = notifications.filter((n) => n.status === "unread").length;
  const markRead = (id: string) => setNotifState((s) => (s[id] === "resolved" ? s : { ...s, [id]: "read" }));
  const markResolved = (id: string) => setNotifState((s) => ({ ...s, [id]: "resolved" }));
  const markAllRead = () => setNotifState((s) => {
    const next = { ...s };
    notifications.forEach((n) => { if (next[n.id] !== "resolved") next[n.id] = "read"; });
    return next;
  });

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

  // fullscreen Modo Operação (no shell) — placeholder until ported
  if (route.screen === "operacao") {
    return (
      <>
        <div className="app app--noframe"><div className="main"><div className="content"><Placeholder name="Modo Operação" /></div></div></div>
        {cmdOpen && <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />}
      </>
    );
  }

  const Screen = SCREENS[route.screen];
  return (
    <>
      <AppShell route={route} go={go} theme={theme} setTheme={setTheme}
        unread={unread} onOpenCmd={() => setCmdOpen(true)} onOpenNotif={() => setNotifOpen(true)}
        user={session.user} company={session.companyName} onSignOut={onSignOut}>
        {Screen ? <Screen go={go} route={route} session={session} /> : <Placeholder name={route.screen} />}
      </AppShell>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />
      {notifOpen && <NotifCenter notifications={notifications} unread={unread}
        markRead={markRead} markResolved={markResolved} markAllRead={markAllRead}
        go={go} onClose={() => setNotifOpen(false)} />}
    </>
  );
}

export function AppRoot() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // apply saved theme + brand so auth/onboarding match the app skin
    document.documentElement.classList.toggle("dark", localStorage.getItem("atelie-theme") === "dark");
    document.documentElement.setAttribute("data-density", localStorage.getItem("atelie-density") === "compact" ? "compact" : "comfortable");
    Theme.loadSaved();
    localStorage.removeItem("atelie-session");
    fetchAppSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setReady(true));
  }, []);

  const setBackendSession = (s: Session | null) => {
    localStorage.removeItem("atelie-session");
    setSession(s);
  };

  const finishOnboarding = async ({ companyName, segment, teamSize, invites }: OnboardingDonePayload) => {
    const res = await fetch("/api/app/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ companyName, segment, teamSize, invites }),
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
  if (!session) return <AuthFlow onAuthed={setBackendSession} />;
  if (!session.onboarded) return <Onboarding user={session.user} onDone={finishOnboarding} />;
  return <Workspace session={session} onSignOut={signOut} />;
}
