/* ============================================================
   screen_manual.jsx — "Manual & ajuda" screen
   Sticky TOC + scroll-spy over MANUAL_SECTIONS.
   ============================================================ */
function Manual() {
  const sections = window.MANUAL_SECTIONS || [];
  const groups = window.MANUAL_GROUPS || [];
  const [active, setActive] = React.useState(sections[0] && sections[0].id);
  const [q, setQ] = React.useState('');
  const docRef = React.useRef(null);

  // scroll-spy against the .content scroll container
  React.useEffect(() => {
    const scroller = document.querySelector('.content');
    if (!scroller || !docRef.current) return;
    const els = [...docRef.current.querySelectorAll('[data-mn-sec]')];
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.getAttribute('data-mn-sec'));
    }, { root: scroller, rootMargin: '-12% 0px -72% 0px', threshold: 0 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jumpTo = (id) => {
    const scroller = document.querySelector('.content');
    const el = docRef.current && docRef.current.querySelector(`[data-mn-sec="${id}"]`);
    if (!scroller || !el) return;
    const target = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
    setActive(id);
    // rAF smooth scroll (native 'smooth' is a no-op in some embedded panes)
    const start = scroller.scrollTop;
    const dist = target - start;
    if (Math.abs(dist) < 2) return;
    const dur = Math.min(600, 200 + Math.abs(dist) * 0.25);
    const t0 = performance.now();
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      scroller.scrollTop = start + dist * ease(p);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // filtered TOC + filtered sections list
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q.trim());
  const matches = (s) => !nq || norm(s.title).includes(nq) || norm(s.intro).includes(nq);
  const visibleGroups = groups
    .map(g => ({ ...g, sections: g.sections.filter(matches) }))
    .filter(g => g.sections.length);
  const visibleSections = sections.filter(matches);

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Manual &amp; ajuda</h1>
          <p className="page-lede">Guia de uso do Ateliê OS — leia no seu ritmo, do começo ao fim ou direto na dúvida.</p>
        </div>
        <Button variant="outline" icon="printer" onClick={() => window.print()}>Imprimir guia</Button>
      </div>

      <div className="mn-layout">
        <aside className="mn-toc">
          <Input className="mn-toc-search" icon="search" placeholder="Buscar no manual…" value={q} onChange={e => setQ(e.target.value)} />
          {visibleGroups.length === 0 && (
            <div className="muted" style={{ fontSize: 13, padding: '8px 11px' }}>Nada encontrado para “{q}”.</div>
          )}
          {visibleGroups.map(g => (
            <div key={g.label}>
              <div className="mn-toc-group">{g.label}</div>
              {g.sections.map(s => (
                <button key={s.id} className={cn('mn-toc-link', active === s.id && 'mn-toc-link--on')} onClick={() => jumpTo(s.id)}>
                  <span className="mn-toc-num">{s.num || '·'}</span>
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="mn-doc" ref={docRef}>
          {visibleSections.map(s => (
            <section className="mn-section" data-mn-sec={s.id} key={s.id} data-screen-label={`Manual · ${s.title}`}>
              {s.hero ? s.body : (
                <React.Fragment>
                  <div className="mn-sec-head">
                    {s.num && <span className="mn-sec-num">{s.num}</span>}
                    <h3 className="mn-sec-title">{s.title}</h3>
                    {s.intro && <p className="mn-sec-intro">{s.intro}</p>}
                  </div>
                  {s.body}
                </React.Fragment>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
window.Manual = Manual;
