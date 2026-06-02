/* ============================================================
   screen_ia.jsx — Conteúdo IA: geração de texto na voz da marca
   IA só textual. Não inventa dados técnicos. Resultado editável.
   ============================================================ */
function buildContent(template, product, brief) {
  const aroma = (product.aroma || '').split(',')[0].trim().toLowerCase();
  const nome = product.name;
  const col = product.collection;
  const T = {
    't1': [
      `Quando a noite chega, ${nome} convida a uma pausa. Notas de ${aroma} envolvem o ambiente em calmaria — um respiro de cuidado para fechar o dia com leveza.`,
      `Da coleção ${col}, ${nome} é um pequeno refúgio de luz. Acenda, respire e deixe o aroma de ${aroma} transformar o seu cantinho num ritual de aconchego.`,
    ],
    't2': [
      `Chegou para morar nos seus fins de tarde. ${nome} é o abraço quente que faltava na sua casa — um refúgio de ${aroma} para desacelerar. ✨`,
      `Estreia no ateliê: ${nome}. Para quem busca uma pausa de verdade no meio da rotina. Acenda e sinta o aroma de ${aroma} pedir calma. 🤍`,
    ],
    't3': [
      `Ele voltou. ${nome} está de volta ao ateliê — ${aroma} em forma de luz, para um respiro de aconchego sempre que você precisar.`,
    ],
    't4': [
      `Oi! Seu pedido com ${nome} já está a caminho 🤍 Preparamos tudo com muito cuidado, do aroma à embalagem. Que ele traga um momento de pausa pra você.`,
    ],
    't5': [
      `Que este aroma de ${aroma} seja um convite à calmaria. Acenda quando precisar de um respiro — você merece esse cuidado. Com carinho, Instante Âmbar.`,
    ],
    't6': [
      `Neste mês especial, presenteie com pausa. ${nome} é um gesto de cuidado — um refúgio de ${aroma} para quem você ama desacelerar.`,
    ],
  };
  const variants = T[template] || T.t1;
  return variants.map(v => brief ? v : v);
}

function ConteudoIA({ go, route }) {
  const { items, aiTemplates, aiHistory, brandVoice } = window.DB;
  const products = items.filter(i => i.type === 'pa' || i.type === 'kit');
  const [tpl, setTpl] = React.useState('t1');
  const [prodSku, setProdSku] = React.useState(products[0].sku);
  const [brief, setBrief] = React.useState('');
  const [state, setState] = React.useState('idle'); // idle | gen | done
  const [result, setResult] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const product = products.find(p => p.sku === prodSku);

  const generate = () => {
    setState('gen'); setCopied(false);
    setTimeout(() => {
      const variants = buildContent(tpl, product, brief);
      setResult(variants[Math.floor(Math.random() * variants.length)]);
      setState('done');
    }, 950);
  };
  const copy = () => { navigator.clipboard && navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div><h1 className="page-h1">Conteúdo IA</h1><p className="page-lede">Textos comerciais na voz da Instante Âmbar — só texto, sempre editável</p></div>
        <Button variant="outline" icon="settings">Voz da marca</Button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        {/* generator */}
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--gap)' }}>
          <Card>
            <CardContent>
              <div className="block-label">Tipo de conteúdo</div>
              <div className="grid cols-3" style={{ gap: 9, marginBottom: 18 }}>
                {aiTemplates.map(t => (
                  <button key={t.id} onClick={() => setTpl(t.id)}
                    style={{ textAlign: 'left', border: `1px solid hsl(var(--border))`, background: tpl === t.id ? 'hsl(var(--accent))' : 'hsl(var(--card))',
                      outline: tpl === t.id ? '1.5px solid hsl(var(--brand-umber))' : 'none', borderRadius: 10, padding: '11px 12px', cursor: 'pointer' }}>
                    <div className="chip chip--brand" style={{ width: 28, height: 28, borderRadius: 7, marginBottom: 8 }}><Icon name={t.icon} size={14} /></div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{t.desc}</div>
                  </button>
                ))}
              </div>

              <div className="grid cols-2" style={{ gap: 12, marginBottom: 14 }}>
                <div>
                  <div className="block-label">Produto</div>
                  <select className="om-input" value={prodSku} onChange={e => setProdSku(e.target.value)}>
                    {products.map(p => <option key={p.sku} value={p.sku}>{p.name} {p.variant}</option>)}
                  </select>
                </div>
                <div>
                  <div className="block-label">Contexto usado</div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
                    <Badge tone="neutral">{product.collection}</Badge>
                    <Badge tone="neutral">{product.aroma.split(',')[0]}</Badge>
                  </div>
                </div>
              </div>

              <div className="block-label">Briefing (opcional)</div>
              <Textarea placeholder="Ex.: foco em Dia das Mães, tom mais íntimo…" value={brief} onChange={e => setBrief(e.target.value)} style={{ minHeight: 60, marginBottom: 14 }} />

              <Button variant="brand" icon="wand" onClick={generate} disabled={state === 'gen'}>
                {state === 'gen' ? 'Gerando…' : result ? 'Gerar novamente' : 'Gerar conteúdo'}
              </Button>
            </CardContent>
          </Card>

          {/* result */}
          {state !== 'idle' && (
            <Card>
              <CardHeader>
                <CardTitle><span className="row" style={{ gap: 8 }}><Icon name="ia" size={16} className="om-text--cure" />Resultado</span></CardTitle>
                {state === 'done' && <Badge tone="neutral">rascunho</Badge>}
              </CardHeader>
              <CardContent style={{ paddingTop: 6 }}>
                {state === 'gen' ? (
                  <div>
                    {[92, 100, 78].map((w, i) => <div key={i} style={{ height: 13, borderRadius: 6, background: 'hsl(var(--muted))', width: `${w}%`, marginBottom: 10, animation: 'pulse 1.2s infinite' }} />)}
                    <div className="muted row" style={{ gap: 8, fontSize: 12.5, marginTop: 6 }}><Icon name="wand" size={14} /> Escrevendo na voz da marca…</div>
                  </div>
                ) : (
                  <React.Fragment>
                    <Textarea value={result} onChange={e => setResult(e.target.value)} style={{ minHeight: 110, fontSize: 14.5, lineHeight: 1.6 }} />
                    <div className="row" style={{ gap: 9, marginTop: 12 }}>
                      <Button variant="default" icon={copied ? 'check' : 'copy'} onClick={copy}>{copied ? 'Copiado!' : 'Copiar'}</Button>
                      <Button variant="outline" icon="check">Salvar como aprovado</Button>
                      <Button variant="ghost" icon="refresh" onClick={generate}>Variação</Button>
                      <div className="spacer" />
                      <button className="icon-btn" title="Favoritar"><Icon name="tag" size={17} /></button>
                    </div>
                  </React.Fragment>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* voice + history */}
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--gap)' }}>
          <Card>
            <CardHeader><CardTitle>Voz da marca</CardTitle></CardHeader>
            <CardContent style={{ paddingTop: 6 }}>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}>
                <span className="muted">Personalidade · </span>{brandVoice.personality}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
                <span className="muted">Promessa · </span>{brandVoice.promise}
              </div>
              <div className="block-label">Palavras preferidas</div>
              <div className="row" style={{ gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                {brandVoice.prefer.map(w => <Badge key={w} tone="ok">{w}</Badge>)}
              </div>
              <div className="block-label">Evitar</div>
              <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                {brandVoice.avoid.map(w => <Badge key={w} tone="bad">{w}</Badge>)}
              </div>
              <div style={{ background: 'hsl(var(--warn-bg))', color: 'hsl(var(--warn))', padding: '9px 11px', borderRadius: 8, fontSize: 12, marginTop: 14, display: 'flex', gap: 7 }}>
                <Icon name="lock" size={14} /> A IA não inventa tempo de queima, benefícios ou composição não cadastrados.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Histórico</CardTitle><Button variant="ghost" size="sm">Ver tudo</Button></CardHeader>
            <CardContent style={{ paddingTop: 4 }}>
              {aiHistory.map(h => (
                <div key={h.id} className="lrow" style={{ alignItems: 'flex-start' }}>
                  <div className="lrow-main">
                    <div className="row" style={{ gap: 7, marginBottom: 3 }}>
                      <span className="lrow-title" style={{ flex: 'unset' }}>{h.product}</span>
                      {h.fav && <Icon name="tag" size={13} className="om-text--warn" />}
                    </div>
                    <div className="lrow-sub" style={{ marginBottom: 5 }}>{h.type} · {h.when}</div>
                    <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{h.text}</div>
                  </div>
                  <Badge tone={h.status === 'aprovado' ? 'ok' : h.status === 'usado' ? 'info' : 'neutral'}>{h.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
window.ConteudoIA = ConteudoIA;
