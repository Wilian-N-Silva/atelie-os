/* ============================================================
   screen_pedidos.jsx — Pedidos: list + detail drawer
   ============================================================ */
function ChannelBadge({ channel }) {
  const { CHANNELS } = window.DB;
  const ext = ['mercadolivre', 'shopee', 'tiktok'].includes(channel);
  return <Badge tone={ext ? 'warn' : 'neutral'}>{CHANNELS[channel]}</Badge>;
}

const ORDER_FLOW = ['aguardando_pagamento', 'pago', 'a_separar', 'separando', 'separado', 'embalando', 'embalado', 'pronto_envio', 'enviado', 'entregue'];

function OrderDrawer({ order, go, onClose }) {
  const { items, findItem, BRL, ORDER_STATUS, CHANNELS } = window.DB;
  if (!order) return null;
  const st = ORDER_STATUS[order.status];
  const curStep = st.step;
  const lines = order.items.map(it => ({ ...it, item: findItem(it.sku) }));
  const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0);

  const visibleFlow = ['pago', 'a_separar', 'separado', 'embalado', 'pronto_envio', 'enviado'];
  const flowLabels = { pago: 'Pago', a_separar: 'Separação', separado: 'Separado', embalado: 'Embalado', pronto_envio: 'Pronto p/ envio', enviado: 'Enviado' };

  const nextAction = {
    a_separar: { label: 'Iniciar separação', icon: 'scan', fn: () => go('operacao', { mode: 'separacao', order: order.id }) },
    pago: { label: 'Iniciar separação', icon: 'scan', fn: () => go('operacao', { mode: 'separacao', order: order.id }) },
    separado: { label: 'Iniciar embalagem', icon: 'package2', fn: () => go('operacao', { mode: 'embalagem', order: order.id }) },
    embalado: { label: 'Marcar pronto p/ envio', icon: 'truck', fn: onClose },
  }[order.status];

  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className={cn('chip', 'chip--lg', `chip--${st.tone}`)}><Icon name="pedidos" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{order.num}</div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <Badge tone={st.tone} dot>{st.label}</Badge>
              <ChannelBadge channel={order.channel} />
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          {/* customer */}
          <div className="row" style={{ gap: 11, marginBottom: 16 }}>
            <Avatar name={order.customerName} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customerName}</div>
              <div className="muted" style={{ fontSize: 12.5 }}><Icon name="mapPin" size={12} style={{ verticalAlign: '-1px' }} /> {order.city}</div>
            </div>
            {order.extNum && <span className="code-pill">{order.extNum}</span>}
          </div>

          {order.note && (
            <div style={{ background: 'hsl(var(--warn-bg))', color: 'hsl(var(--warn))', padding: '9px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 16, display: 'flex', gap: 8 }}>
              <Icon name="alertCircle" size={15} /> {order.note}
            </div>
          )}

          {/* itens */}
          <div className="block-label">Itens do pedido</div>
          <table className="minitable" style={{ marginBottom: 18 }}>
            <tbody>
              {lines.map(l => (
                <tr key={l.sku}>
                  <td>
                    <div className="item-cell">
                      <div className={cn('swatch', l.item.type === 'kit' && 'swatch--kit')}><Icon name="flame" size={15} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-title">{l.item.name} {l.item.variant}</div>
                        <div className="cell-sub sku">{l.item.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="r muted" style={{ whiteSpace: 'nowrap' }}>{l.qty} × {BRL(l.item.price)}</td>
                  <td className="r" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{BRL(l.item.price * l.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* totals */}
          <div className="field"><span className="field-k">Subtotal</span><span className="field-v">{BRL(subtotal)}</span></div>
          <div className="field"><span className="field-k">Frete</span><span className="field-v">{order.freight ? BRL(order.freight) : 'a definir'}</span></div>
          {order.discount > 0 && <div className="field"><span className="field-k">Desconto</span><span className="field-v om-text--bad">− {BRL(order.discount)}</span></div>}
          <div className="field" style={{ fontSize: 15 }}><span style={{ fontWeight: 600 }}>Total</span><span style={{ fontWeight: 700 }}>{BRL(order.total)}</span></div>

          {/* shipping */}
          <div className="block-label" style={{ marginTop: 18 }}>Envio</div>
          <div className="field"><span className="field-k">Rastreio</span><span className="field-v">{order.tracking ? <span className="sku">{order.tracking}</span> : <span className="muted">—</span>}</span></div>
          <div className="field">
            <span className="field-k">Etiqueta</span>
            <span className="field-v">{['mercadolivre','shopee'].includes(order.channel) ? <Badge tone="info">PDF anexada</Badge> : <span className="muted">interna</span>}</span>
          </div>

          {/* timeline */}
          <div className="block-label" style={{ marginTop: 18 }}>Histórico</div>
          <div className="stepper">
            {visibleFlow.map((s, idx) => {
              const sStep = ORDER_STATUS[s].step;
              const done = curStep > sStep && curStep > 0;
              const cur = order.status === s;
              return (
                <div className="step" key={s}>
                  <div className="step-rail">
                    <div className={cn('step-dot', done && 'step-dot--done', cur && 'step-dot--cur')}>
                      {done ? <Icon name="check" size={12} /> : cur ? <span style={{ width: 7, height: 7, borderRadius: 99, background: 'currentColor' }} /> : null}
                    </div>
                    {idx < visibleFlow.length - 1 && <div className={cn('step-line', done && 'step-line--done')} />}
                  </div>
                  <div className="step-body">
                    <div className="step-label" style={{ color: (done || cur) ? '' : 'hsl(var(--muted-foreground))' }}>{flowLabels[s]}</div>
                    {cur && <div className="step-time">{order.createdAt} · agora</div>}
                    {done && <div className="step-time">concluído</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="drawer-foot">
          {nextAction && <Button variant="default" icon={nextAction.icon} onClick={nextAction.fn} style={{ flex: 1 }}>{nextAction.label}</Button>}
          <Button variant="outline" icon="printer" onClick={() => window.AteliePrint.pickListOrder(order)}>Pick list</Button>
          <Button variant="outline" icon="more" />
        </div>
      </aside>
    </React.Fragment>
  );
}

function Pedidos({ go, route }) {
  const { orders, findItem, BRL, ORDER_STATUS } = window.DB;
  const [filter, setFilter] = React.useState(route.filter || 'todos');
  const [openId, setOpenId] = React.useState(route.open || null);
  const [q, setQ] = React.useState('');
  const [view, setView] = useView('pedidos', 'list');
  const [novo, setNovo] = React.useState(false);
  const [, bump] = React.useState(0);
  React.useEffect(() => { if (route.open) setOpenId(route.open); if (route.filter) setFilter(route.filter); }, [route]);

  const groups = {
    todos: () => orders.filter(o => o.status !== 'cancelado'),
    a_separar: () => orders.filter(o => ['pago', 'a_separar', 'separando'].includes(o.status)),
    separado: () => orders.filter(o => ['separado', 'embalando'].includes(o.status)),
    pronto_envio: () => orders.filter(o => ['embalado', 'pronto_envio'].includes(o.status)),
    enviado: () => orders.filter(o => ['enviado', 'entregue'].includes(o.status)),
    aguardando_pagamento: () => orders.filter(o => o.status === 'aguardando_pagamento'),
  };
  const tabs = [
    { value: 'todos', label: 'Todos', count: groups.todos().length },
    { value: 'a_separar', label: 'A separar', count: groups.a_separar().length },
    { value: 'separado', label: 'A embalar', count: groups.separado().length },
    { value: 'pronto_envio', label: 'Envio', count: groups.pronto_envio().length },
    { value: 'aguardando_pagamento', label: 'Pagamento', count: groups.aguardando_pagamento().length },
    { value: 'enviado', label: 'Enviados', count: groups.enviado().length },
  ];
  const baseRows = (groups[filter] || groups.todos)().filter(o => !q || (o.num + o.customerName + o.code + o.city).toLowerCase().includes(q.toLowerCase()));
  const qtyOf = (o) => o.items.reduce((s, it) => s + it.qty, 0);
  const sort = useSort(baseRows, {
    num: o => o.num, customerName: o => o.customerName, channel: o => window.DB.CHANNELS[o.channel],
    qty: o => qtyOf(o), total: o => o.total, status: o => ORDER_STATUS[o.status].step,
  });
  const rows = sort.sorted;
  const openOrder = orders.find(o => o.id === openId);

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div><h1 className="page-h1">Pedidos</h1><p className="page-lede">{rows.length} pedidos nesta visão</p></div>
        <div className="row-wrap">
          <Button variant="outline" icon="printer" onClick={() => window.AteliePrint.pickListBatch(rows.filter(o => ['pago','a_separar','separando'].includes(o.status)), 'Pick list consolidada · a separar')}>Pick list em lote</Button>
          <Button variant="default" icon="plus" onClick={() => setNovo(true)}>Novo pedido</Button>
        </div>
      </div>

      <div className="toolbar">
        <Tabs tabs={tabs} value={filter} onChange={setFilter} />
        <div className="spacer" />
        <div style={{ width: 240 }}><Input icon="search" placeholder="Cliente, nº, código…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === 'grid' ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {rows.map(o => {
            const st = ORDER_STATUS[o.status];
            const qty = o.items.reduce((s, it) => s + it.qty, 0);
            return (
              <div key={o.id} className="task" style={{ cursor: 'pointer' }} onClick={() => setOpenId(o.id)}>
                <div className="row between">
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={o.customerName} size={36} />
                    <div><div style={{ fontWeight: 650 }}>{o.num}</div><div className="muted" style={{ fontSize: 12 }}>{o.customerName}</div></div>
                  </div>
                  <ChannelBadge channel={o.channel} />
                </div>
                <div className="muted" style={{ fontSize: 12.5 }}><Icon name="mapPin" size={12} style={{ verticalAlign: '-1px' }} /> {o.city} · {qty} {qty > 1 ? 'itens' : 'item'}</div>
                <Sep />
                <div className="row between">
                  <Badge tone={st.tone} dot>{st.label}</Badge>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{BRL(o.total)}</div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <div style={{ gridColumn: '1 / -1' }}><Empty title="Nenhum pedido nesta visão" /></div>}
        </div>
      ) : (
      <Card style={{ overflow: 'hidden' }}>
        <table className="om-table">
          <thead>
            <tr>
              <SortTh label="Pedido" k="num" sort={sort} />
              <SortTh label="Cliente" k="customerName" sort={sort} />
              <SortTh label="Canal" k="channel" sort={sort} />
              <SortTh label="Itens" k="qty" sort={sort} />
              <SortTh label="Total" k="total" sort={sort} align="right" />
              <th>Pagamento</th>
              <SortTh label="Status" k="status" sort={sort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(o => {
              const st = ORDER_STATUS[o.status];
              const qty = o.items.reduce((s, it) => s + it.qty, 0);
              return (
                <tr key={o.id} className="om-row-click" onClick={() => setOpenId(o.id)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.num}</div>
                    <div className="code-pill">{o.code}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 550 }}>{o.customerName}</div>
                    <div className="cell-sub">{o.city}</div>
                  </td>
                  <td><ChannelBadge channel={o.channel} /></td>
                  <td className="muted">{qty} {qty > 1 ? 'itens' : 'item'}</td>
                  <td className="om-td-right" style={{ fontWeight: 600 }}>{BRL(o.total)}</td>
                  <td>{o.payment === 'pago' ? <Badge tone="ok" dot>Pago</Badge> : <Badge tone="warn" dot>Aguardando</Badge>}</td>
                  <td><Badge tone={st.tone}>{st.label}</Badge></td>
                  <td className="om-td-right"><Icon name="chevronRight" size={16} className="muted" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty title="Nenhum pedido nesta visão" hint="Quando entrarem pedidos deste status, eles aparecem aqui." />}
      </Card>
      )}

      {openOrder && <OrderDrawer order={openOrder} go={go} onClose={() => setOpenId(null)} />}
      <NovoPedidoModal open={novo} onClose={() => setNovo(false)} onCreate={(o) => { orders.unshift(o); bump(n => n + 1); }} />
    </div>
  );
}
window.Pedidos = Pedidos;
