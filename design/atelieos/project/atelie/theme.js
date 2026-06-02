/* ============================================================
   theme.js — white-label branding engine (window.Theme)
   Converts hex theme tokens → "h s% l%" and applies them live
   to documentElement so the whole app re-skins without rebuild.
   ============================================================ */
(function () {
  function hexToHsl(hex) {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hue = 0, s = 0, l = (max + min) / 2;
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
  const isHex = (v) => /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(String(v).trim());

  // map JSON token names → our CSS variables
  const MAP = {
    background: '--background', foreground: '--foreground',
    card: '--card', cardForeground: '--card-foreground',
    primary: '--primary', primaryForeground: '--primary-foreground',
    secondary: '--secondary', secondaryForeground: '--secondary-foreground',
    muted: '--muted', mutedForeground: '--muted-foreground',
    accent: '--accent', accentForeground: '--accent-foreground',
    destructive: '--destructive', danger: '--destructive',
    border: '--border', input: '--input', ring: '--ring',
    success: '--ok', warning: '--warn', info: '--info',
    sidebarBackground: '--sidebar',
  };
  // some tokens drive two vars
  const EXTRA = { success: ['--ok'], warning: ['--warn'], danger: ['--bad'], background: [], info: ['--info'] };

  function deriveTints(root, colors) {
    // semantic *-bg tints derived from the base hue at high lightness
    const tint = (hsl, lLight, lDark, mode) => {
      const [h, s] = hsl.split(' ');
      const sat = parseInt(s);
      return `${h} ${Math.min(sat, 60)}% ${mode === 'dark' ? lDark : lLight}%`;
    };
    const mode = colors.__mode || 'light';
    const setTint = (token, varName, lLight, lDark) => {
      if (colors[token] && isHex(colors[token])) {
        root.style.setProperty(varName, tint(hexToHsl(colors[token]), lLight, lDark, mode));
      }
    };
    setTint('success', '--ok-bg', 94, 16);
    setTint('warning', '--warn-bg', 92, 16);
    setTint('info', '--info-bg', 95, 18);
    setTint('danger', '--bad-bg', 96, 18);
    // cure + neutral bg follow accent / muted
    if (colors.accent && isHex(colors.accent)) root.style.setProperty('--cure-bg', tint(hexToHsl(colors.accent), 94, 18, mode));
    if (colors.accent && isHex(colors.accent)) root.style.setProperty('--cure', hexToHsl(colors.accent));
    if (colors.muted && isHex(colors.muted)) root.style.setProperty('--neutral-bg', hexToHsl(colors.muted));
    // brand tints used by chips/swatches
    if (colors.secondary && isHex(colors.secondary)) root.style.setProperty('--brand-amber-soft', hexToHsl(colors.secondary));
    if (colors.primary && isHex(colors.primary)) {
      root.style.setProperty('--brand-umber', hexToHsl(colors.primary));
      root.style.setProperty('--brand-amber', hexToHsl(colors.primary));
    }
  }

  function freezeTransitions() {
    let s = document.getElementById('__theme-freeze');
    if (!s) { s = document.createElement('style'); s.id = '__theme-freeze'; s.textContent = '*,*::before,*::after{transition:none !important;animation:none !important;}'; }
    document.head.appendChild(s);
    void document.documentElement.offsetHeight;
    requestAnimationFrame(() => requestAnimationFrame(() => { if (s.parentNode) s.parentNode.removeChild(s); }));
  }

  function apply(theme) {
    const root = document.documentElement;
    if (!theme || !theme.colors) return restore();
    freezeTransitions();
    const colors = { ...theme.colors, __mode: theme.mode };
    // mode class (flips shadows + any non-overridden vars)
    root.classList.toggle('dark', theme.mode === 'dark');
    Object.entries(MAP).forEach(([k, varName]) => {
      const v = colors[k];
      if (v && isHex(v)) root.style.setProperty(varName, hexToHsl(v));
    });
    Object.entries(EXTRA).forEach(([k, vars]) => {
      const v = colors[k];
      if (v && isHex(v)) vars.forEach(vn => root.style.setProperty(vn, hexToHsl(v)));
    });
    // popover mirrors card
    if (colors.card && isHex(colors.card)) root.style.setProperty('--popover', hexToHsl(colors.card));
    if (colors.cardForeground && isHex(colors.cardForeground)) root.style.setProperty('--popover-foreground', hexToHsl(colors.cardForeground));
    // sidebar foreground: use provided, else auto-contrast vs sidebar background
    if (colors.sidebarBackground && isHex(colors.sidebarBackground)) {
      const sl = parseInt(hexToHsl(colors.sidebarBackground).split(' ')[2]);
      const sfg = (colors.sidebarForeground && isHex(colors.sidebarForeground)) ? hexToHsl(colors.sidebarForeground) : (sl < 50 ? '0 0% 94%' : '240 10% 12%');
      root.style.setProperty('--sidebar-foreground', sfg);
      root.style.setProperty('--sidebar-muted', sl < 50 ? '240 5% 65%' : '240 4% 46%');
    }
    deriveTints(root, colors);
    if (theme.radius) root.style.setProperty('--radius', theme.radius);
    localStorage.setItem('atelie-brand', JSON.stringify(theme));
    window.__activeTheme = theme;
  }

  function restore() {
    const root = document.documentElement;
    freezeTransitions();
    const props = ['--background','--foreground','--card','--card-foreground','--popover','--popover-foreground','--primary','--primary-foreground',
      '--secondary','--secondary-foreground','--muted','--muted-foreground','--accent','--accent-foreground',
      '--destructive','--border','--input','--ring','--ok','--warn','--info','--bad',
      '--ok-bg','--warn-bg','--info-bg','--bad-bg','--cure','--cure-bg','--neutral-bg',
      '--brand-amber','--brand-amber-soft','--brand-umber','--sidebar','--sidebar-foreground','--sidebar-muted','--radius'];
    props.forEach(p => root.style.removeProperty(p));
    localStorage.removeItem('atelie-brand');
    window.__activeTheme = null;
    // theme toggle owns .dark afterwards
    root.classList.toggle('dark', localStorage.getItem('atelie-theme') === 'dark');
  }

  function validate(obj) {
    const errs = [];
    if (typeof obj !== 'object' || !obj) return ['JSON deve ser um objeto.'];
    if (!obj.colors || typeof obj.colors !== 'object') errs.push('Faltando o objeto "colors".');
    const required = ['background', 'foreground', 'primary', 'primaryForeground'];
    required.forEach(k => { if (!obj.colors || !obj.colors[k]) errs.push(`Cor obrigatória ausente: "${k}".`); });
    if (obj.colors) Object.entries(obj.colors).forEach(([k, v]) => {
      if (!isHex(v)) errs.push(`"${k}" deve ser #RRGGBB (recebido: ${v}).`);
    });
    // contrast: foreground vs background must differ enough
    if (obj.colors && isHex(obj.colors.background) && isHex(obj.colors.foreground)) {
      const lum = (hex) => { const t = hexToHsl(hex).split(' '); return parseInt(t[2]); };
      if (Math.abs(lum(obj.colors.background) - lum(obj.colors.foreground)) < 25)
        errs.push('Contraste insuficiente entre texto e fundo.');
    }
    return errs;
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem('atelie-brand');
      if (raw) { apply(JSON.parse(raw)); return true; }
    } catch (e) {}
    return false;
  }

  window.Theme = { apply, restore, validate, hexToHsl, isHex, loadSaved, freezeTransitions };
})();
