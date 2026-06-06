"use client";

import * as React from "react";

/**
 * Internal preview of the public order tracking API (`GET /api/public/track`).
 * The real customer page lives on the separate company site; this is just a
 * simple reference renderer to see how the data looks.
 */

type Tracking = {
  order: { number: string; placedAt: string | null };
  payment: { status: string; label: string };
  status: { stage: string; label: string };
  timeline: { stage: string; label: string; at: string | null; done: boolean }[];
  shipping: { carrier: string | null; service: string | null; code: string | null; url: string | null; estimatedDays: number | null } | null;
};

function fmtDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function RastreioPage() {
  const [token, setToken] = React.useState("");
  const [order, setOrder] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [data, setData] = React.useState<Tracking | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const lookup = React.useCallback(async (params: URLSearchParams) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/public/track?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        setError(res.status === 404 ? "Pedido não encontrado. Confira o código ou os dados." : "Não foi possível consultar agora.");
        return;
      }
      setData(await res.json() as Tracking);
    } catch {
      setError("Não foi possível consultar agora.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("token") ?? "";
    const o = sp.get("order") ?? "";
    const e = sp.get("email") ?? "";
    setToken(t);
    setOrder(o);
    setEmail(e);
    if (t || (o && (e || sp.get("cep")))) void lookup(sp);
  }, [lookup]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const sp = new URLSearchParams();
    if (token.trim()) sp.set("token", token.trim());
    else { if (order.trim()) sp.set("order", order.trim()); if (email.trim()) sp.set("email", email.trim()); }
    void lookup(sp);
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.brand}>Acompanhe seu pedido</div>
        <p style={S.lede}>Pré-visualização interna da API pública de rastreio.</p>

        <form onSubmit={submit} style={S.form}>
          <input style={S.input} placeholder="Código de rastreio (token do link)" value={token} onChange={(e) => setToken(e.target.value)} />
          <div style={S.or}>ou</div>
          <div style={S.row}>
            <input style={{ ...S.input, flex: 1 }} placeholder="Nº do pedido" value={order} onChange={(e) => setOrder(e.target.value)} />
            <input style={{ ...S.input, flex: 2 }} placeholder="E-mail do pedido" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" style={S.btn} disabled={loading}>{loading ? "Consultando..." : "Rastrear"}</button>
        </form>

        {error && <div style={S.error}>{error}</div>}

        {data && (
          <div style={S.card}>
            <div style={S.cardHead}>
              <div>
                <div style={S.muted}>Pedido</div>
                <div style={S.orderNum}>{data.order.number}</div>
                {fmtDate(data.order.placedAt) && <div style={S.muted}>Feito em {fmtDate(data.order.placedAt)}</div>}
              </div>
              <span style={{ ...S.badge, ...(data.payment.status === "pago" ? S.badgeOk : S.badgeWarn) }}>{data.payment.label}</span>
            </div>

            <div style={S.statusNow}>{data.status.label}</div>

            <div style={S.timeline}>
              {data.timeline.map((step) => (
                <div key={step.stage} style={S.tlRow}>
                  <div style={{ ...S.dot, ...(step.done ? S.dotDone : S.dotPending) }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: step.done ? "#1c2530" : "#9aa3ad" }}>{step.label}</div>
                    {fmtDate(step.at) && <div style={S.muted}>{fmtDate(step.at)}</div>}
                  </div>
                </div>
              ))}
            </div>

            {data.shipping && (
              <div style={S.ship}>
                <div style={S.shipTitle}>Envio</div>
                {data.shipping.carrier && <div>{data.shipping.carrier}{data.shipping.service ? ` · ${data.shipping.service}` : ""}</div>}
                {data.shipping.code && <div style={S.code}>Código: {data.shipping.code}</div>}
                {data.shipping.estimatedDays != null && <div style={S.muted}>Prazo estimado: {data.shipping.estimatedDays} dia(s)</div>}
                {data.shipping.url && <a href={data.shipping.url} target="_blank" rel="noreferrer" style={S.link}>Rastrear na transportadora</a>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f4f1ec", display: "flex", justifyContent: "center", padding: "48px 16px", fontFamily: "system-ui, sans-serif", color: "#1c2530" },
  wrap: { width: "100%", maxWidth: 520 },
  brand: { fontSize: 24, fontWeight: 700 },
  lede: { color: "#6b7480", fontSize: 13, marginTop: 4, marginBottom: 20 },
  form: { background: "#fff", border: "1px solid #e4ddd3", borderRadius: 14, padding: 16, marginBottom: 16 },
  input: { width: "100%", height: 42, borderRadius: 9, border: "1px solid #d9d1c6", padding: "0 12px", fontSize: 14, boxSizing: "border-box" },
  row: { display: "flex", gap: 8 },
  or: { textAlign: "center", color: "#9aa3ad", fontSize: 12, margin: "8px 0" },
  btn: { width: "100%", height: 44, marginTop: 12, borderRadius: 9, border: "none", background: "#8A5A44", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  error: { background: "#fdecea", color: "#a94442", border: "1px solid #f5c6cb", borderRadius: 9, padding: "10px 12px", fontSize: 13.5, marginBottom: 16 },
  card: { background: "#fff", border: "1px solid #e4ddd3", borderRadius: 14, padding: 20 },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  muted: { color: "#6b7480", fontSize: 12.5 },
  orderNum: { fontSize: 20, fontWeight: 700 },
  badge: { fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap" },
  badgeOk: { background: "#e3f3e8", color: "#2f6d46" },
  badgeWarn: { background: "#fdf0d5", color: "#8a6312" },
  statusNow: { fontSize: 16, fontWeight: 650, margin: "16px 0 4px" },
  timeline: { marginTop: 12, borderTop: "1px solid #efe9e1", paddingTop: 16 },
  tlRow: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 999, marginTop: 3, flexShrink: 0 },
  dotDone: { background: "#8A5A44" },
  dotPending: { background: "#fff", border: "2px solid #d9d1c6" },
  ship: { marginTop: 8, borderTop: "1px solid #efe9e1", paddingTop: 16, fontSize: 14 },
  shipTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "#9aa3ad", marginBottom: 6 },
  code: { fontFamily: "ui-monospace, monospace", marginTop: 2 },
  link: { display: "inline-block", marginTop: 8, color: "#8A5A44", fontWeight: 600, textDecoration: "none" },
};
