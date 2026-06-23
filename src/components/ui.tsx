"use client";
/* ============================================================
   ui.tsx — shadcn-style primitives + lucide-style icons.
   Ported from the design prototype's ui.jsx into typed React.
   ============================================================ */
import * as React from "react";
import { cn } from "@/lib/cn";

export { cn };

/* ---------------- Roles (multi-tenant) ---------------------------- */
export const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietária", admin: "Administrador(a)", operator: "Operador(a)",
};
export const ROLE_META: Record<string, { label: string; short: string; icon: string; desc: string }> = {
  owner: { label: "Proprietária", short: "Owner", icon: "flame", desc: "Acesso total, cobrança e exclusão do ateliê." },
  admin: { label: "Administrador(a)", short: "Admin", icon: "settings", desc: "Toda a operação e configurações, exceto cobrança." },
  operator: { label: "Operador(a)", short: "Operação", icon: "scan", desc: "Produção, estoque, pedidos, separação e embalagem." },
};

/* ---------------- Icons (lucide-style, 24x24, stroke) ------------- */
const ICONS: Record<string, string> = {
  hoje: '<path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/>',
  pedidos: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  producao: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>',
  estoque: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  itens: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  receitas: '<path d="M10 2v7.31"/><path d="M14 9.3V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>',
  ia: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  alertCircle: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  truck: '<path d="M14 18V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1"/><path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M10 18h4"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M10.27 21a1.94 1.94 0 0 0 3.46 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326Z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  filter: '<path d="M3 4h18l-7 8v6l-4 2v-8Z"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  panelLeft: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42Z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5.2 21a8 8 0 0 1 13.6 0"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  trendUp: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  trendDown: '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
  banknote: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
  instagram: '<rect width="18" height="18" x="3" y="3" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" stroke="none"/>',
  whatsapp: '<path d="M3 21l1.4-4.8A9 9 0 1 1 7.8 19L3 21Z"/><path d="M8.5 8.5c.3-.8.7-.9 1.1-.9h.7c.2 0 .4.1.5.4l.7 1.7c.1.3 0 .5-.2.7l-.5.5c.8 1.4 1.9 2.5 3.4 3.2l.6-.7c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.6v.6c0 .6-.4 1.1-1 1.2-4.1.4-8.4-3.8-8-7.8Z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
  wand: '<path d="m12 8-2 2-7 7 2 2 7-7Z"/><path d="m14 6 4 4"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 13v4"/><path d="M17 15h4"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  listChecks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  thermometer: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0Z"/><circle cx="12" cy="12" r="3"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M3 12h18"/><path d="M7.5 8A2.5 2.5 0 1 1 12 6.5V8"/><path d="M16.5 8A2.5 2.5 0 1 0 12 6.5V8"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3L5.8 21 7 14.2 2 9.3l6.9-1Z"/>',
  heart: '<path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 6a5 5 0 0 1 7.5 6.6Z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16Z"/><path d="M4 20c4-6 8-8 16-16"/>',
  sparkles: '<path d="m12 3-1.4 4.2a2 2 0 0 1-1.3 1.3L5 10l4.3 1.5a2 2 0 0 1 1.3 1.3L12 17l1.4-4.2a2 2 0 0 1 1.3-1.3L19 10l-4.3-1.5a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/>',
  mousePointer: '<path d="M3 3l7.1 17 2.5-7.4 7.4-2.5Z"/><path d="m13 13 6 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  beaker: '<path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/>',
  layers: '<path d="m12.83 2.18 8.04 4.46a1 1 0 0 1 0 1.72l-8.04 4.46a2 2 0 0 1-1.66 0L3.13 8.36a1 1 0 0 1 0-1.72l8.04-4.46a2 2 0 0 1 1.66 0Z"/><path d="m22 17.65-9.17 5.09a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 5.09a2 2 0 0 1-1.66 0L2 12.65"/>',
  mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  package2: '<path d="M12 3v6"/><path d="M3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0L4 5.27A2 2 0 0 0 3 7Z"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  rows: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="18" height="7" x="3" y="14" rx="1"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/>',
  workflow: '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
  sliders: '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m5 12 7 7 7-7"/>',
  code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
  gripVertical: '<circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
};

export function Icon({
  name, size = 18, strokeWidth = 2, className, style,
}: { name: string; size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  const path = ICONS[name] || ICONS.circle;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" className={className}
      style={{ flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: path }} />
  );
}

/* ---------------- Button ------------------------------------------ */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "brand";
  size?: "sm" | "md" | "lg" | "icon";
  icon?: string | null;
  iconRight?: string | null;
};
export function Button({ variant = "default", size = "md", className, children, icon, iconRight, ...rest }: ButtonProps) {
  return (
    <button className={cn("om-btn", `om-btn--${variant}`, `om-btn--${size}`, className)} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 15 : 16} />}
    </button>
  );
}

/* ---------------- Card -------------------------------------------- */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("om-card", className)} {...rest}>{children}</div>;
}
export function CardHeader({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("om-card-head", className)}>{children}</div>;
}
export function CardTitle({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("om-card-title", className)}>{children}</div>;
}
export function CardContent({ className, children, style }: { className?: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  return <div className={cn("om-card-body", className)} style={style}>{children}</div>;
}

/* ---------------- Badge ------------------------------------------- */
export function Badge({ tone = "neutral", children, dot, className }: {
  tone?: string; children?: React.ReactNode; dot?: boolean; className?: string;
}) {
  return (
    <span className={cn("om-badge", `om-badge--${tone}`, className)}>
      {dot && <span className="om-badge-dot" />}
      {children}
    </span>
  );
}

/* ---------------- Input / Textarea -------------------------------- */
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { icon?: string };
export function Input({ className, icon, ...rest }: InputProps) {
  if (icon) {
    return (
      <div className={cn("om-input-wrap", className)}>
        <Icon name={icon} size={16} className="om-input-icon" />
        <input className="om-input om-input--has-icon" {...rest} />
      </div>
    );
  }
  return <input className={cn("om-input", className)} {...rest} />;
}
export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("om-input om-textarea", className)} {...rest} />;
}

/* ---------------- Tabs (controlled) ------------------------------- */
export function Tabs({ tabs, value, onChange, className }: {
  tabs: { value: string; label: string; icon?: string; count?: number }[];
  value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={cn("om-tabs", className)}>
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={cn("om-tab", value === t.value && "om-tab--active")}>
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
          {t.count != null && <span className="om-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Progress ---------------------------------------- */
export function Progress({ value, tone = "primary", className }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={cn("om-progress", className)}>
      <div className={cn("om-progress-fill", `om-progress-fill--${tone}`)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ---------------- Avatar ------------------------------------------ */
export function Avatar({ name, size = 30 }: { name?: string; size?: number }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <div className="om-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</div>;
}

/* ---------------- Separator / Empty ------------------------------- */
export function Sep({ className, style }: { className?: string; style?: React.CSSProperties }) { return <div className={cn("om-sep", className)} style={style} />; }
export function Empty({ icon = "inbox", title, hint }: { icon?: string; title?: string; hint?: string }) {
  return (
    <div className="om-empty">
      <div className="om-empty-icon"><Icon name={icon} size={26} /></div>
      <div className="om-empty-title">{title}</div>
      {hint && <div className="om-empty-hint">{hint}</div>}
    </div>
  );
}

/* ---------------- KPI value --------------------------------------- */
export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: string }) {
  return (
    <div className="om-stat">
      <div className="om-stat-label">{label}</div>
      <div className={cn("om-stat-value", tone && `om-text--${tone}`)}>{value}</div>
      {sub && <div className="om-stat-sub">{sub}</div>}
    </div>
  );
}

/* ---------------- View toggle (grade / lista) --------------------- */
export function ViewToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="seg" role="tablist" aria-label="Visualização">
      <button className={cn("om-tab", value === "grid" && "om-tab--active")} onClick={() => onChange("grid")} title="Grade">
        <Icon name="grid" size={15} />
      </button>
      <button className={cn("om-tab", value === "list" && "om-tab--active")} onClick={() => onChange("list")} title="Lista">
        <Icon name="rows" size={15} />
      </button>
    </div>
  );
}
export function useView(screenKey: string, fallback = "list"): [string, (v: string) => void] {
  const k = "atelie-view-" + screenKey;
  const [v, setV] = React.useState<string>(fallback);
  React.useEffect(() => { const s = localStorage.getItem(k); if (s) setV(s); }, [k]);
  const set = (nv: string) => { setV(nv); localStorage.setItem(k, nv); };
  return [v, set];
}

/* ---------------- Modal (centered form dialog) -------------------- */
export function Modal({ open, onClose, title, subtitle, icon, footer, children, width = 580 }: {
  open: boolean; onClose: () => void; title?: React.ReactNode; subtitle?: string;
  icon?: string; footer?: React.ReactNode; children?: React.ReactNode; width?: number;
}) {
  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          {icon && <div className="chip chip--brand chip--lg"><Icon name={icon} size={20} /></div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{title}</div>
            {subtitle && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Form field + select + stepper ------------------- */
export function Field({ label, children, hint, required, error, className, style }: {
  label?: React.ReactNode; children?: React.ReactNode; hint?: string; required?: boolean;
  error?: string; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div className={cn("ff", className)} style={style}>
      {label && <label className="ff-label">{label}{required && <span className="ff-req"> *</span>}</label>}
      {children}
      {error ? <div className="ff-error">{error}</div> : hint ? <div className="ff-hint">{hint}</div> : null}
    </div>
  );
}
type Opt = string | { value: string; label: string };
export function Select({ value, onChange, options, placeholder, className, ...rest }: {
  value: string; onChange: (v: string) => void; options: Opt[]; placeholder?: string; className?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <select className={cn("om-input", className)} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
export function Stepper({ value, onChange, min = 0, max = 9999, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="lab-stepper">
      <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(3)))}><Icon name="minus" size={15} /></button>
      <input value={value} onChange={(e) => { const v = parseFloat(e.target.value); onChange(isNaN(v) ? min : Math.max(min, Math.min(max, v))); }} />
      <button type="button" onClick={() => onChange(Math.min(max, +(value + step).toFixed(3)))}><Icon name="plus" size={15} /></button>
    </div>
  );
}

/* ---------------- Sorting ----------------------------------------- */
export function useSort<T>(rows: T[], accessors: Record<string, (r: T) => string | number>, initialKey: string | null = null, initialDir: "asc" | "desc" = "desc") {
  const [sortKey, setSortKey] = React.useState<string | null>(initialKey);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">(initialDir);
  const toggle = (k: string) => { if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(k); setSortDir("desc"); } };
  const sorted = React.useMemo(() => {
    if (!sortKey || !accessors[sortKey]) return rows;
    const f = accessors[sortKey];
    const r = [...rows].sort((a, b) => {
      const av = f(a), bv = f(b);
      if (typeof av === "string" || typeof bv === "string") return String(av).localeCompare(String(bv), "pt");
      return (av || 0) - (bv || 0);
    });
    return sortDir === "desc" ? r.reverse() : r;
  }, [rows, sortKey, sortDir, accessors]);
  return { sorted, sortKey, sortDir, toggle };
}
export function SortTh({ label, k, sort, align, style }: {
  label: string; k: string; sort: { sortKey: string | null; sortDir: string; toggle: (k: string) => void };
  align?: "right"; style?: React.CSSProperties;
}) {
  const active = sort.sortKey === k;
  return (
    <th className={cn("om-sort-th", align === "right" && "om-td-right", active && "om-sort-th--active")} onClick={() => sort.toggle(k)} style={style}>
      <span className="om-sort-span">{label}<Icon name={active ? (sort.sortDir === "asc" ? "arrowUp" : "arrowDown") : "chevronDown"} size={13} className="om-sort-ico" /></span>
    </th>
  );
}

/* ---------------- Toast (vanilla, global) ------------------------- */
export function toast(msg: string, tone: "ok" | "bad" | "info" = "ok") {
  if (typeof document === "undefined") return;
  let host = document.getElementById("toast-host");
  if (!host) { host = document.createElement("div"); host.id = "toast-host"; host.className = "toast-host"; document.body.appendChild(host); }
  const el = document.createElement("div");
  el.className = "toast toast--" + tone;
  el.innerHTML = '<span class="toast-ico"></span><span>' + String(msg).replace(/</g, "&lt;") + "</span>";
  host.appendChild(el);
  setTimeout(() => { el.classList.add("toast--out"); setTimeout(() => el.remove(), 280); }, 2600);
}
