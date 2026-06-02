/* ============================================================
   theme.ts — white-label branding engine
   Converts hex theme tokens → "h s% l%" and applies them live to
   <html> so the whole app re-skins without a rebuild. Ported from
   the design prototype's theme.js; runs client-side only.
   ============================================================ */

export interface ThemeColors {
  background?: string; foreground?: string;
  card?: string; cardForeground?: string;
  primary?: string; primaryForeground?: string;
  secondary?: string; secondaryForeground?: string;
  muted?: string; mutedForeground?: string;
  accent?: string; accentForeground?: string;
  destructive?: string; danger?: string;
  border?: string; input?: string; ring?: string;
  success?: string; warning?: string; info?: string;
  sidebarBackground?: string; sidebarForeground?: string;
  [k: string]: string | undefined;
}
export interface BrandTheme {
  id?: string;
  name?: string;
  mode?: "light" | "dark";
  radius?: string;
  colors: ThemeColors;
}

export function hexToHsl(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const isHex = (v: unknown): boolean =>
  /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(String(v).trim());

// map JSON token names → CSS variables
const MAP: Record<string, string> = {
  background: "--background", foreground: "--foreground",
  card: "--card", cardForeground: "--card-foreground",
  primary: "--primary", primaryForeground: "--primary-foreground",
  secondary: "--secondary", secondaryForeground: "--secondary-foreground",
  muted: "--muted", mutedForeground: "--muted-foreground",
  accent: "--accent", accentForeground: "--accent-foreground",
  destructive: "--destructive", danger: "--destructive",
  border: "--border", input: "--input", ring: "--ring",
  success: "--ok", warning: "--warn", info: "--info",
  sidebarBackground: "--sidebar",
};
const EXTRA: Record<string, string[]> = {
  success: ["--ok"], warning: ["--warn"], danger: ["--bad"], background: [], info: ["--info"],
};

function deriveTints(root: HTMLElement, colors: ThemeColors & { __mode?: string }) {
  const tint = (hsl: string, lLight: number, lDark: number, mode?: string) => {
    const [h, s] = hsl.split(" ");
    const sat = parseInt(s);
    return `${h} ${Math.min(sat, 60)}% ${mode === "dark" ? lDark : lLight}%`;
  };
  const mode = colors.__mode || "light";
  const setTint = (token: string, varName: string, lLight: number, lDark: number) => {
    const v = colors[token];
    if (v && isHex(v)) root.style.setProperty(varName, tint(hexToHsl(v), lLight, lDark, mode));
  };
  setTint("success", "--ok-bg", 94, 16);
  setTint("warning", "--warn-bg", 92, 16);
  setTint("info", "--info-bg", 95, 18);
  setTint("danger", "--bad-bg", 96, 18);
  if (colors.accent && isHex(colors.accent)) root.style.setProperty("--cure-bg", tint(hexToHsl(colors.accent), 94, 18, mode));
  if (colors.accent && isHex(colors.accent)) root.style.setProperty("--cure", hexToHsl(colors.accent));
  if (colors.muted && isHex(colors.muted)) root.style.setProperty("--neutral-bg", hexToHsl(colors.muted));
  if (colors.secondary && isHex(colors.secondary)) root.style.setProperty("--brand-amber-soft", hexToHsl(colors.secondary));
  if (colors.primary && isHex(colors.primary)) {
    root.style.setProperty("--brand-umber", hexToHsl(colors.primary));
    root.style.setProperty("--brand-amber", hexToHsl(colors.primary));
  }
}

/** Suppress all transitions/animations for one frame so applying a theme
 *  never freezes a property mid-transition (throttled-tab safety). */
export function freezeTransitions() {
  if (typeof document === "undefined") return;
  let s = document.getElementById("__theme-freeze");
  if (!s) {
    s = document.createElement("style");
    s.id = "__theme-freeze";
    s.textContent = "*,*::before,*::after{transition:none !important;animation:none !important;}";
  }
  document.head.appendChild(s);
  void document.documentElement.offsetHeight;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => { if (s!.parentNode) s!.parentNode.removeChild(s!); })
  );
}

export function apply(theme: BrandTheme | null | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!theme || !theme.colors) return restore();
  freezeTransitions();
  const colors: ThemeColors & { __mode?: string } = { ...theme.colors, __mode: theme.mode };
  root.classList.toggle("dark", theme.mode === "dark");
  Object.entries(MAP).forEach(([k, varName]) => {
    const v = colors[k];
    if (v && isHex(v)) root.style.setProperty(varName, hexToHsl(v));
  });
  Object.entries(EXTRA).forEach(([k, vars]) => {
    const v = colors[k];
    if (v && isHex(v)) vars.forEach((vn) => root.style.setProperty(vn, hexToHsl(v)));
  });
  if (colors.card && isHex(colors.card)) root.style.setProperty("--popover", hexToHsl(colors.card));
  if (colors.cardForeground && isHex(colors.cardForeground)) root.style.setProperty("--popover-foreground", hexToHsl(colors.cardForeground));
  if (colors.sidebarBackground && isHex(colors.sidebarBackground)) {
    const sl = parseInt(hexToHsl(colors.sidebarBackground).split(" ")[2]);
    const sfg = colors.sidebarForeground && isHex(colors.sidebarForeground)
      ? hexToHsl(colors.sidebarForeground)
      : sl < 50 ? "0 0% 94%" : "240 10% 12%";
    root.style.setProperty("--sidebar-foreground", sfg);
    root.style.setProperty("--sidebar-muted", sl < 50 ? "240 5% 65%" : "240 4% 46%");
  }
  deriveTints(root, colors);
  if (theme.radius) root.style.setProperty("--radius", theme.radius);
  localStorage.setItem("atelie-brand", JSON.stringify(theme));
}

const RESTORE_PROPS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground",
  "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--destructive", "--border", "--input", "--ring",
  "--ok", "--warn", "--info", "--bad", "--ok-bg", "--warn-bg", "--info-bg", "--bad-bg",
  "--cure", "--cure-bg", "--neutral-bg", "--brand-amber", "--brand-amber-soft", "--brand-umber",
  "--sidebar", "--sidebar-foreground", "--sidebar-muted", "--radius",
];

export function restore() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  freezeTransitions();
  RESTORE_PROPS.forEach((p) => root.style.removeProperty(p));
  localStorage.removeItem("atelie-brand");
  root.classList.toggle("dark", localStorage.getItem("atelie-theme") === "dark");
}

export function validate(obj: unknown): string[] {
  const errs: string[] = [];
  if (typeof obj !== "object" || !obj) return ["JSON deve ser um objeto."];
  const o = obj as BrandTheme;
  if (!o.colors || typeof o.colors !== "object") errs.push('Faltando o objeto "colors".');
  const required = ["background", "foreground", "primary", "primaryForeground"];
  required.forEach((k) => { if (!o.colors || !o.colors[k]) errs.push(`Cor obrigatória ausente: "${k}".`); });
  if (o.colors) Object.entries(o.colors).forEach(([k, v]) => {
    if (!isHex(v)) errs.push(`"${k}" deve ser #RRGGBB (recebido: ${v}).`);
  });
  if (o.colors && isHex(o.colors.background) && isHex(o.colors.foreground)) {
    const lum = (hex: string) => parseInt(hexToHsl(hex).split(" ")[2]);
    if (Math.abs(lum(o.colors.background!) - lum(o.colors.foreground!)) < 25)
      errs.push("Contraste insuficiente entre texto e fundo.");
  }
  return errs;
}

export function loadSaved(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem("atelie-brand");
    if (raw) { apply(JSON.parse(raw)); return true; }
  } catch {
    /* ignore */
  }
  return false;
}

export const Theme = { apply, restore, validate, hexToHsl, isHex, loadSaved, freezeTransitions };
