# Ateliê OS — Implementation Handoff

> **For the next coding agent.** This document captures everything decided and built so far, plus exactly what remains. Read it top-to-bottom before continuing. Last updated by the previous session on 2026-06-01.

---

## 1. What this project is

Greenfield **Next.js backoffice** ("Ateliê OS") for a small artisanal candle maker (Instante Âmbar), built **white-label from day one**. Working language is **Portuguese (pt-BR)**.

- **Source of truth for the product:** `docs/prd-v2.1-atelie-os-instante-ambar.md` (modules §7, data model §9, business rules §10, build order §11). Also `docs/manual-base-...md` (UX/operator flows) and `docs/git-workflow.md`.
- **Architecture invariants:** see `CLAUDE.md` (stock-from-movements, workflows keyed on `technical_key` not display names, numeric 12-digit codes, scanner-optional, AI text-only, etc.). Honor these.

## 2. The design we are implementing

A **Claude Design handoff bundle** was fetched and extracted. It is a polished, fully-interactive prototype (React via CDN/Babel + custom CSS) covering: Dashboard, Modo Operação (scanner bench), Pedidos, Produção (kanban), Estoque, Itens/SKUs, Receitas, Conteúdo IA, Editor de Etiquetas, and Configurações (Branding / Workflows / Modelos de etiqueta), plus ⌘K command palette, functional notifications, live theme engine, light/dark + density.

**Design intent (from the chat transcript in the bundle):** shadcn/ui "new-york" utilitarian, **flat colors, white-label neutral zinc**, Geist Sans + Geist Mono (mono for the 12-digit codes/SKUs), light/dark + density toggle.

### Bundle locations

- **Bundle #1 (primary, already fetched & extracted):**
  - Original URL: `https://api.anthropic.com/v1/design/h/o042vTUt_o7KWtGGXUm3eA?open_file=atelie%2FAteli%C3%AA+OS.html`
  - Extracted to (⚠️ this is a **temporary** tool-results dir — may be cleaned up; re-fetch the URL if missing):
    `C:\Users\wilns\.claude\projects\C--projects-atelie-os\4b2b9352-fdcc-4d28-ba9a-261a3e19941b\tool-results\extracted\atelieos\`
  - Key paths inside: `project/atelie/*.jsx|*.css|*.js` (the prototype), `chats/chat1.md` (intent — read it), `README.md`, `project/uploads/*` (PRDs + addendum).
  - **To re-fetch:** the URL returns a **gzip tarball** (not HTML). Use WebFetch (it saves the binary), then `tar -xzf <saved.bin> -C <dest>`.

- **Bundle #2 (auth screens) — fetched, extracted, and the auth flow is IMPLEMENTED.**
  - URL: `https://api.anthropic.com/v1/design/h/NfpbcTGUBZTSZm0_PIqthQ?open_file=atelie%2FAteli%C3%AA+OS.html`
  - **Extracted into the repo for persistence:** `design/atelieos/` (committed with the project, not a temp dir). Read `design/atelieos/chats/chat2.md` for the auth intent.
  - **Diff vs Bundle #1:** all foundation CSS/`theme.js`/`data.js`/`command.jsx`/`shell.css` are byte-identical. Only `ui.jsx` changed (added `ROLE_LABELS`/`ROLE_META`), `shell.jsx`/`app.jsx` gained session props, and these files are NEW: `auth.jsx`, `auth.css`, `onboarding.jsx`, `root.jsx`, `settings_users.jsx`.
  - **Roles simplified** (per chat): `owner` / `admin` / `operator` only. One ateliê per account (no tenant switcher).
  - **What's implemented** (see §5): full auth flow (login, signup create/invite, magic-link OTP, forgot/reset), onboarding wizard, session-gated root, and the account menu in the shell.
  - **Still TODO from Bundle #2:** the **Usuários e acessos** settings tab (`settings_users.jsx`) — member list, invite modal, role editing, pending invites, and the read-only permission matrix. The account menu already links to `configuracoes?tab=users`; build that screen when porting Configurações.

## 3. Decisions locked with the user (via AskUserQuestion)

1. **Target stack:** **Next.js + Tailwind + shadcn** (matches PRD §4 and the design chat). Chosen over Vite or dropping the prototype in as-is.
2. **First-pass scope:** **Foundation + shell + Dashboard** (then iterate screen-by-screen). Not "all screens at once."

## 4. Porting strategy (IMPORTANT — keep doing this)

The prototype's CSS is effectively a hand-rolled shadcn. To stay **pixel-faithful** while being shadcn/Tailwind-native:

- The prototype's token system lives in `src/app/globals.css` (shadcn `@layer base`, exact HSL values from the prototype's `styles.css`).
- The prototype's component/layout CSS is **ported verbatim** (class names preserved: `om-btn`, `om-card`, `sb-*`, `task`, `lrow`, `cmdk-*`, `notif-*`, etc.) into `src/styles/*.css`. Keep these class names so the ported JSX matches 1:1.
- React components are typed (`.tsx`), `"use client"`, and use those same class names via `className`.
- Tailwind config (`tailwind.config.ts`) maps the CSS vars to Tailwind colors so future screens/shadcn components can use utilities too.
- The whole app is one client tree mounted at `#root`-equivalent. The prototype's `app.jsx` is the router/state hub → becomes `src/components/app-root.tsx` rendered by `src/app/page.tsx`.
- **localStorage keys to preserve** (used by prototype): `atelie-theme`, `atelie-route`, `atelie-density`/tweaks, `atelie-brand`, `atelie-workflows`, `atelie-sheets`, `atelie-notif`, `atelie-logo`, `atelie-view-<screen>`.
- The prototype loads Geist via Google Fonts `@import` in CSS — kept as-is (simple & faithful). Could later switch to `next/font`.
- Icons: the prototype uses a **custom inline-SVG set** (`ICONS` map in `ui.jsx`), NOT lucide. Port it as `src/components/ui/icon.tsx` to stay faithful. (lucide-react is installed for future shadcn components, but the ported screens use the custom `Icon`.)

## 5. What's already built (verified on disk)

Config / scaffold (all at repo root):
- `package.json` (Next 14.2.18, React 18.3.1, TS 5, Tailwind 3.4, clsx, tailwind-merge, cva, tailwindcss-animate, lucide-react), `tsconfig.json` (`@/*` → `src/*`), `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `.eslintrc.json`, `.gitignore`.
- `npm install` has been run (`node_modules` present, lockfile committed-ready).

Source (`src/`) — **`npm run build` and `npm run lint` both pass; the foundation + Dashboard + auth flow render and the dev server boots.**

CSS (ported verbatim, class names preserved):
- `src/app/globals.css` — ✅ token system (light/dark), density, base styles, Geist import, animations.
- `src/styles/components.css`, `shell.css`, `screens.css` — ✅ verbatim.
- `src/styles/extras.css` — ✅ command palette + notifications. (Label-editor + print styles deferred to the Etiquetas screen.)
- `src/styles/auth.css` — ✅ verbatim (login split-screen, onboarding wizard, user-management, account menu).

Lib:
- `src/lib/cn.ts` — ✅ `cn()` (clsx + tailwind-merge).
- `src/lib/theme.ts` — ✅ white-label theme engine ported from `theme.js`. Typed, SSR-guarded.
- `src/lib/data.ts` — ✅ typed port of `data.js`: `BRL`, `num`, `items`, `orders`, `production`, `recipes`, `finance`, `ORDER_STATUS`, `PROD_STATUS`, `CHANNELS`, `findItem`, `buildNotifications` + interfaces + `DB` aggregate. **Not yet ported** (later screens only): `movements`, `locations`, `brandVoice`, `aiTemplates`, `aiHistory`, `labelTemplates`, `labelHistory`, `brandPresets`, `workflowPresets`, `AUTOMATIONS`, `labelSheets`, `STEP_COLORS`, `MOVE_TYPES`.
- `src/lib/types.ts` — ✅ `Route`, `Go`, `Session`, `SessionUser`.

Components / screens (all `"use client"`):
- `src/components/ui.tsx` — ✅ all primitives + `Icon`/`ICONS` + `ROLE_LABELS`/`ROLE_META` (ported from `ui.jsx`).
- `src/components/command-palette.tsx`, `notif-center.tsx` — ✅ (from `command.jsx`).
- `src/components/shell/app-shell.tsx` — ✅ sidebar/topbar/breadcrumbs/account menu/mobile drawer (from `shell.jsx`).
- `src/components/auth/auth-flow.tsx` — ✅ login · signup (create/invite) · magic-link OTP · forgot/reset (from `auth.jsx`).
- `src/components/onboarding/onboarding.tsx` — ✅ 3-step wizard (from `onboarding.jsx`).
- `src/components/app-root.tsx` — ✅ `AppRoot` (session gate, from `root.jsx`) + `Workspace` (from `app.jsx`). Built screens map only has `hoje`; others render a placeholder.
- `src/screens/dashboard.tsx` — ✅ (from `screen_dashboard.jsx`).
- `src/app/layout.tsx` — ✅ imports all CSS, pt-BR, pre-hydration theme/density script. `src/app/page.tsx` — ✅ mounts `<AppRoot/>`.

**Auth demo behavior:** any valid-looking email + 6-char password signs you in as the Instante Âmbar owner; signup "Novo ateliê" → onboarding → dashboard; Google/magic-link/reset are simulated. Sign out via the sidebar account menu. Session in `localStorage 'atelie-session'`.

## 6. What remains (in order)

### A. Finish foundation + shell + Dashboard (the current scope)
Build these `.tsx` files (port from the named prototype files):

1. `src/components/ui/icon.tsx` — port `ICONS` map + `Icon` from `ui.jsx`. (Needed by everything.)
2. `src/components/ui/index.tsx` (or split files) — port the rest of `ui.jsx`: `Button, Card, CardHeader, CardTitle, CardContent, Badge, Input, Textarea, Tabs, Progress, Avatar, Sep, Empty, Stat, ViewToggle, useView, Modal, Field, Select, Stepper, useSort, SortTh, toast`. All `"use client"`.
3. `src/components/command-palette.tsx` — port `CommandPalette` from `command.jsx` (uses `items/orders/production/recipes` from `data.ts`).
4. `src/components/notif-center.tsx` — port `NotifCenter` from `command.jsx`.
5. `src/components/shell/app-shell.tsx` — port `Shell` + `NAV` + `PAGE_META` from `shell.jsx` (sidebar, topbar, breadcrumbs, ⌘K button, notif bell, theme toggle, mobile drawer). Replace its internal `go`/route with the app-root state.
6. `src/screens/dashboard.tsx` — port `Dashboard` from `screen_dashboard.jsx`.
7. `src/components/app-root.tsx` — port `App` from `app.jsx`: route state (`useState`, persisted to `localStorage`), theme state, density, ⌘K global listener, notification read/resolved state, `go()` navigation, `freezeTransitions` on theme change, `loadSaved()` on mount. Render `<AppShell>` + active screen + `<CommandPalette>` + `<NotifCenter>`. **Tweaks panel** from the prototype (`tweaks-panel.jsx`) is a dev affordance — optional; density+theme can also be a small settings control. Keep density+theme wiring regardless.
8. `src/app/layout.tsx` — root layout: `<html lang="pt-BR">`, import `globals.css` + the four `src/styles/*.css`, set `<body>`, metadata (title "Ateliê OS · Instante Âmbar"). Add a tiny inline pre-hydration script to apply saved theme/density from localStorage to avoid FOUC (optional but nice).
9. `src/app/page.tsx` — `"use client"` (or render a client `<AppRoot/>`), mounts `<AppRoot/>`.

Then run `npm run dev` and verify the Dashboard renders, sidebar nav works, ⌘K opens, notifications open, light/dark + density toggle work.

### B. Auth screens (Bundle #2) — ✅ DONE (except user-management tab)
Implemented under `src/components/auth/` and `src/components/onboarding/`, gated by `src/components/app-root.tsx`. Remaining: the **Usuários e acessos** tab — port `settings_users.jsx` when you build Configurações (§6C). It needs `ROLE_META` (already in `ui.tsx`) and the permission matrix (PRD §5.2, but simplified to owner/admin/operator).

### C. Remaining screens (port from the matching `screen_*.jsx`)
`pedidos` (`screen_pedidos.jsx`), `producao` (`screen_producao.jsx`), `estoque` (`screen_estoque.jsx`), `itens` (`screen_itens.jsx`), `receitas` (`screen_receitas.jsx`), `ia` (`screen_ia.jsx`), `etiquetas` (`screen_etiquetas.jsx` + `print.js` + label/print CSS from prototype `extras.css`), `operacao` (`screen_operacao.jsx` + `operacao.css`, fullscreen no-shell), `configuracoes` (`screen_settings.jsx` + `settings_branding.jsx` + `settings_workflows.jsx` + `settings_labels.jsx` + `settings.css` + `forms.jsx`). Also port the prototype `forms.jsx` (Novo pedido / Planejar produção / Novo item / Nova receita / Estoque actions dialogs).

Confirm scope with the user before doing all of C in one go (they preferred incremental).

## 7. Build/run commands

```powershell
npm run dev      # local dev server (http://localhost:3000)
npm run build    # production build (use to typecheck the whole tree)
npm run lint     # eslint (next/core-web-vitals)
```

There are **no tests** yet. Use `npm run build` as the typecheck gate after porting `.tsx` files.

## 8. Gotchas / notes

- The prototype shared globals across Babel scripts via `window.*`. In Next, use **ESM imports** instead (e.g. `import { Icon } from "@/components/ui/icon"`).
- `useSort`, `useView` are hooks → fine in client components.
- `toast()` is a vanilla DOM helper (appends to `#toast-host`) — keep as-is, call from client only.
- Theme engine writes inline CSS vars on `<html>`; SSR must not run it. Guard with `typeof document !== "undefined"` (already done in `theme.ts`) and call from `useEffect`.
- Keep the `freezeTransitions()` call on every theme/density/dark-mode switch — it prevents the transition-freeze bug the designer hit.
- White-label rule (from CLAUDE.md): no critical color hardcoded in components — everything flows through the CSS vars / theme engine. Status logic must key off stable keys, not labels.

## 9. Quick map: prototype file → target file

| Prototype (`project/atelie/`) | Target |
|---|---|
| `styles.css` | `src/app/globals.css` ✅ |
| `components.css` | `src/styles/components.css` ✅ |
| `shell.css` | `src/styles/shell.css` ✅ |
| `screens.css` | `src/styles/screens.css` ✅ |
| `extras.css` (cmdk+notif part) | `src/styles/extras.css` ✅ (label/print part deferred) |
| `theme.js` | `src/lib/theme.ts` ✅ |
| `data.js` | `src/lib/data.ts` ✅ (partial — see §5) |
| `ui.jsx` | `src/components/ui/*` ⬜ |
| `command.jsx` | `src/components/command-palette.tsx` + `notif-center.tsx` ⬜ |
| `shell.jsx` | `src/components/shell/app-shell.tsx` ⬜ |
| `screen_dashboard.jsx` | `src/screens/dashboard.tsx` ✅ |
| `app.jsx` + `root.jsx` | `src/components/app-root.tsx` ✅ |
| `auth.jsx` / `auth.css` | `src/components/auth/auth-flow.tsx` + `src/styles/auth.css` ✅ |
| `onboarding.jsx` | `src/components/onboarding/onboarding.tsx` ✅ |
| (n/a) | `src/app/layout.tsx`, `src/app/page.tsx` ✅ |
| `settings_users.jsx` | `src/screens/settings/users.tsx` (part of Configurações) ⬜ |
| `screen_*.jsx`, `settings_*.jsx`, `forms.jsx`, `print.js`, `operacao.css`, `settings.css`, `tweaks-panel.jsx` | later screens (§6C) ⬜ |

> **Design bundles are now vendored at `design/atelieos/`** (both chats + all prototype source). Add `design/` to `.gitignore` if you'd rather not track the ~1.5 MB of assets, but keeping it means the next agent never has to re-fetch.
