/* ============================================================
   settings_labels.jsx — Modelos de folha e tamanhos de etiqueta
   Genérico: defina qualquer grade colunas×linhas e tamanho.
   ============================================================ */
function A4Sheet({ sheet, scale = 0.62, sample }) {
  const { pageW, pageH, cols, rows, labelW, labelH, mTop, mLeft, gutX, gutY } = sheet;
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    cells.push({
      left: mLeft + c * (labelW + gutX),
      top: mTop + r * (labelH + gutY),
      i: r * cols + c,
    });
  }
  return (
    <div className="a4-preview" style={{ width: pageW * scale, height: pageH * scale }}>
      {cells.map(cell => (
        <div key={cell.i} className="a4-label" style={{ left: cell.left * scale, top: cell.top * scale, width: labelW * scale, height: labelH * scale }}>
          {sample ? sample(cell.i, labelW * scale, labelH * scale) : null}
        </div>
      ))}
    </div>
  );
}

function MiniSheet({ sheet }) {
  const max = 5;
  const c = Math.min(sheet.cols, max), r = Math.min(sheet.rows, 8);
  return (
    <div className="sheet-mini" style={{ width: 84, height: 84 * (sheet.pageH / sheet.pageW), gridTemplateColumns: `repeat(${c}, 1fr)`, gridTemplateRows: `repeat(${r}, 1fr)` }}>
      {Array.from({ length: c * r }).map((_, i) => <div key={i} className="sheet-mini-cell" />)}
    </div>
  );
}

function SettingsLabels({ sheets, setSheets }) {
  const [selId, setSelId] = React.useState(sheets[0].id);
  const sel = sheets.find(s => s.id === selId) || sheets[0];
  const perSheet = sel.cols * sel.rows;

  const setField = (k, v) => setSheets(list => list.map(s => s.id === selId ? { ...s, [k]: k === 'name' || k === 'code' ? v : (parseFloat(v) || 0) } : s));
  const addSheet = () => {
    const id = 'custom-' + Date.now();
    const ns = { id, name: 'Novo modelo', brand: 'Personalizado', code: 'CUSTOM', pageW: 210, pageH: 297, cols: 3, rows: 8, labelW: 63.5, labelH: 33.9, mTop: 9, mLeft: 7, gutX: 2.5, gutY: 0 };
    setSheets(list => [...list, ns]); setSelId(id);
  };
  const dupSheet = () => {
    const id = 'custom-' + Date.now();
    setSheets(list => [...list, { ...sel, id, name: sel.name + ' (cópia)', brand: 'Personalizado' }]); setSelId(id);
  };
  const delSheet = () => {
    if (sheets.length <= 1) return;
    setSheets(list => list.filter(s => s.id !== selId)); setSelId(sheets.find(s => s.id !== selId).id);
  };

  const NUM = [
    ['cols', 'Colunas'], ['rows', 'Linhas'],
    ['labelW', 'Largura etiqueta (mm)'], ['labelH', 'Altura etiqueta (mm)'],
    ['mLeft', 'Margem esquerda (mm)'], ['mTop', 'Margem topo (mm)'],
    ['gutX', 'Espaço horizontal (mm)'], ['gutY', 'Espaço vertical (mm)'],
  ];

  return (
    <div>
      <div className="row between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="set-section-title">Modelos de folha e etiqueta</div>
          <div className="set-section-lede" style={{ marginBottom: 0 }}>Defina tamanhos de etiqueta e quantas saem por folha. Use folhas A4 em grade ou rolos térmicos.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="outline" icon="copy" onClick={dupSheet}>Duplicar</Button>
          <Button variant="default" icon="plus" onClick={addSheet}>Novo modelo</Button>
        </div>
      </div>

      {/* model cards */}
      <Card style={{ marginBottom: 'var(--gap)' }}>
        <CardContent style={{ paddingTop: 'var(--card-pad)' }}>
          <div className="sheet-grid-cards">
            {sheets.map(s => (
              <div key={s.id} className={cn('sheet-card', selId === s.id && 'sheet-card--on')} onClick={() => setSelId(s.id)}>
                <MiniSheet sheet={s} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{s.roll ? 'Rolo' : `${s.cols}×${s.rows}`} · {s.cols * s.rows}/folha</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* editor + preview */}
      <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 'var(--gap)', alignItems: 'start' }}>
        <Card>
          <CardHeader><CardTitle>Configuração</CardTitle><Button variant="ghost" size="sm" icon="trash" onClick={delSheet} disabled={sheets.length <= 1}>Excluir</Button></CardHeader>
          <CardContent style={{ paddingTop: 8 }}>
            <div className="set-field">
              <label className="set-field-label">Nome do modelo</label>
              <Input value={sel.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div className="num-grid">
              {NUM.map(([k, label]) => (
                <div className="set-field" key={k} style={{ marginBottom: 0 }}>
                  <label className="set-field-label">{label}</label>
                  <Input type="number" value={sel[k]} onChange={e => setField(k, e.target.value)} />
                </div>
              ))}
            </div>
            <Sep style={{ margin: '16px 0' }} />
            <div className="row between">
              <span className="muted" style={{ fontSize: 13 }}>Etiquetas por folha</span>
              <Badge tone="ok" className="mono" style={{ fontSize: 13 }}>{perSheet}</Badge>
            </div>
            <div className="row between" style={{ marginTop: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>Tamanho da folha</span>
              <span className="mono" style={{ fontSize: 13 }}>{sel.pageW}×{sel.pageH} mm</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização da folha</CardTitle>
            <span className="muted" style={{ fontSize: 12.5 }}>{sel.cols}×{sel.rows} · etiqueta {sel.labelW}×{sel.labelH}mm</span>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', justifyContent: 'center', background: 'hsl(var(--muted) / 0.5)', borderRadius: 10, padding: 24, overflow: 'auto' }}>
              <A4Sheet sheet={sel} scale={sel.roll ? 1.4 : 0.66} sample={(i, w, h) => (
                <div style={{ textAlign: 'center', lineHeight: 1.1, color: '#222', padding: 2 }}>
                  <div style={{ fontSize: Math.max(5, h * 0.13), fontWeight: 700 }}>Vela Lavanda</div>
                  <div style={{ fontSize: Math.max(4, h * 0.1), fontFamily: 'Geist Mono, monospace', color: '#555' }}>VEL-LAV-156</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 0.5, marginTop: h * 0.08, height: h * 0.22, alignItems: 'flex-end' }}>
                    {Array.from({ length: Math.floor(w / 3) }).map((_, k) => <div key={k} style={{ width: 1, height: ((k * 7) % 3 + 1) / 3 * 100 + '%', background: '#222' }} />)}
                  </div>
                </div>
              )} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 12, textAlign: 'center' }}>Imprime {perSheet} etiqueta{perSheet > 1 ? 's' : ''} por folha · use em Etiquetas → escolher modelo de folha</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
window.SettingsLabels = SettingsLabels;
window.A4Sheet = A4Sheet;
