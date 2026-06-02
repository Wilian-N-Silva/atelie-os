/* ============================================================
   screen_dashboard.jsx — "Hoje no ateliê"
   ============================================================ */
function Dashboard({ go }) {
  const { orders, production, items, finance, BRL, ORDER_STATUS } = window.DB;

  const byStatus = (s) => orders.filter(o => o.status === s);
  const aSeparar = orders.filter(o => ['pago', 'a_separar'].includes(o.status));
  const aEmbalar = orders.filter(o => ['separado', 'embalando'].includes(o.status));
  const prontos = byStatus('pronto_envio');
  const aguardMat = production.filter(p => p.status === 'aguardando_materiais');
  const emCura = production.filter(p => p.status === 'em_cura');
  const revisar = production.filter(p => p.status === 'aguardando_revisao');
  const abaixoMin = items.filter(i => i.available < i.min);

  const tasks = [
    { n: aSeparar.length, label: 'Pagos a separar', sub: 'pedidos prontos para a bancada', icon: 'pedidos', tone: 'info', to: { screen: 'pedidos', filter: 'a_separar' } },
    { n: aEmbalar.length, label: 'Separados a embalar', sub: 'aguardando checklist', icon: 'package2', tone: 'info', to: { screen: 'pedidos', filter: 'separado' } },
    { n: prontos.length, label: 'Prontos para envio', sub: 'etiqueta aplicada', icon: 'truck', tone: 'ok', to: { screen: 'pedidos', filter: 'pronto_envio' } },
    { n: revisar.length, label: 'Lotes para revisar', sub: 'cura concluída · liberar', icon: 'listChecks', tone: 'warn', to: { screen: 'producao', filter: 'aguardando_revisao' } },
  ];

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Boa tarde, Camila</h1>
          <p className="page-lede">Você tem <b>{aSeparar.length + aEmbalar.length} pedidos</b> e <b>{revisar.length} lote</b> esperando por você hoje.</p>
        </div>
        <div className="row-wrap">
          <Button variant="outline" icon="plus" onClick={() => go('pedidos')}>Novo pedido</Button>
          <Button variant="outline" icon="producao" onClick={() => go('producao')}>Nova produção</Button>
          <Button variant="default" icon="scan" onClick={() => go('operacao')}>Modo Operação</Button>
        </div>
      </div>

      {/* pendências */}
      <div className="grid cols-4" style={{ marginBottom: 'var(--gap)' }}>
        {tasks.map((t, i) => (
          <div className="task" key={i} onClick={() => go(t.to.screen, t.to)}>
            <div className="task-top">
              <div className={cn('chip', `chip--${t.tone}`)}><Icon name={t.icon} size={18} /></div>
              <div className="task-n">{t.n}</div>
              <Icon name="arrowRight" size={18} className="task-go" />
            </div>
            <div>
              <div className="task-label">{t.label}</div>
              <div className="task-sub">{t.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
        {/* fila do dia */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Fila do dia</CardTitle>
              <div className="section-hint" style={{ marginTop: 2 }}>Próximas ações na ordem que importam</div>
            </div>
            <Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => go('pedidos')}>Ver pedidos</Button>
          </CardHeader>
          <CardContent style={{ paddingTop: 6 }}>
            {aSeparar.concat(aEmbalar).slice(0, 5).map(o => {
              const st = ORDER_STATUS[o.status];
              const qty = o.items.reduce((s, it) => s + it.qty, 0);
              return (
                <div className="lrow om-row-click" key={o.id} onClick={() => go('pedidos', { open: o.id })}>
                  <div className={cn('chip', `chip--${st.tone}`)}><Icon name={window.DB.CHANNELS[o.channel] === 'WhatsApp' ? 'pedidos' : 'pedidos'} size={16} /></div>
                  <div className="lrow-main">
                    <div className="lrow-title">{o.num} · {o.customerName}</div>
                    <div className="lrow-sub">{qty} {qty > 1 ? 'itens' : 'item'} · {window.DB.CHANNELS[o.channel]} · {o.city}</div>
                  </div>
                  <Badge tone={st.tone} dot>{st.label}</Badge>
                  <Icon name="chevronRight" size={16} className="muted" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* atenção: estoque + cura + financeiro */}
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--gap)' }}>
          <Card>
            <CardHeader>
              <CardTitle><span className="row" style={{ gap: 8 }}><Icon name="alert" size={16} className="om-text--bad" />Abaixo do mínimo</span></CardTitle>
              <Badge tone="bad">{abaixoMin.length}</Badge>
            </CardHeader>
            <CardContent style={{ paddingTop: 4 }}>
              {abaixoMin.slice(0, 4).map(i => (
                <div className="lrow om-row-click" key={i.code} onClick={() => go('itens', { open: i.code })}>
                  <div className="lrow-main">
                    <div className="lrow-title">{i.name} <span className="muted" style={{ fontWeight: 400 }}>{i.variant}</span></div>
                    <div className="lrow-sub sku">{i.sku}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }} className="om-text--bad">{window.DB.num(i.available)} {i.unit}</div>
                    <div className="lrow-sub">mín. {i.min}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><span className="row" style={{ gap: 8 }}><Icon name="thermometer" size={16} className="om-text--cure" />Em cura</span></CardTitle>
              <Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => go('producao', { filter: 'em_cura' })}>Ver</Button>
            </CardHeader>
            <CardContent style={{ paddingTop: 4 }}>
              {emCura.concat(revisar).slice(0, 3).map(p => {
                const total = 14, left = p.cureDayLeft != null ? p.cureDayLeft : 7;
                const pct = Math.round(((total - left) / total) * 100);
                const ready = left <= 0;
                return (
                  <div className="cura" key={p.id}>
                    <div className={cn('chip', ready ? 'chip--warn' : 'chip--cure')}><Icon name={ready ? 'listChecks' : 'thermometer'} size={16} /></div>
                    <div className="cura-meta">
                      <div className="lrow-title">{p.productName.replace(' 156ml','').replace(' 220ml','')} · {p.produced}un</div>
                      <Progress className="cura-bar" value={pct} tone={ready ? 'warn' : 'cure'} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12 }}>
                      {ready ? <span className="om-text--warn" style={{ fontWeight: 600 }}>Revisar</span>
                             : <><div style={{ fontWeight: 650 }}>{left}d</div><div className="muted">{p.cureUntil}</div></>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="block-label">Financeiro gerencial · maio</div>
              <div className="grid cols-2" style={{ gap: 12 }}>
                <Stat label="A receber" value={BRL(finance.aReceber)} tone="info" />
                <Stat label="A pagar" value={BRL(finance.aPagar)} tone="bad" />
              </div>
              <Sep style={{ margin: '14px 0' }} />
              <div className="row between">
                <span className="muted" style={{ fontSize: 13 }}>Margem bruta estimada</span>
                <Badge tone="ok">{Math.round(finance.margemBruta * 100)}%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
window.Dashboard = Dashboard;
