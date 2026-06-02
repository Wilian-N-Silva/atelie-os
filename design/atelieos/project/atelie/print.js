/* ============================================================
   print.js — reusable browser print (window.AteliePrint)
   Renders an HTML string into #global-print and prints it.
   ============================================================ */
(function () {
  function ensureContainer() {
    let el = document.getElementById('global-print');
    if (!el) { el = document.createElement('div'); el.id = 'global-print'; document.body.appendChild(el); }
    return el;
  }

  function printHTML(html) {
    const el = ensureContainer();
    el.innerHTML = html;
    const done = () => { window.removeEventListener('afterprint', done); setTimeout(() => { el.innerHTML = ''; }, 300); };
    window.addEventListener('afterprint', done);
    window.print();
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ----- Pick list for an order -----
  function pickListOrder(order) {
    const DB = window.DB;
    const lines = order.items.map(it => ({ ...it, item: DB.findItem(it.sku) }));
    const totalQty = lines.reduce((s, l) => s + l.qty, 0);
    const rows = lines.map(l => `
      <tr>
        <td><span class="pdoc-check"></span></td>
        <td><b>${esc(l.item.name)}</b> ${esc(l.item.variant)}<div class="pdoc-sku">${esc(l.item.sku)} · ${esc(l.item.code)}</div></td>
        <td><span class="pdoc-loc">${l.item.cure > 0 ? 'Cura' : 'Prateleira'}</span></td>
        <td class="r" style="font-size:18px;font-weight:700">${l.qty}</td>
      </tr>`).join('');
    const html = `
      <div class="pdoc">
        <div class="pdoc-head">
          <div>
            <div class="pdoc-h1">Pick list · ${esc(order.num)}</div>
            <div class="pdoc-sub">${esc(order.customerName)} · ${esc(order.city)} · ${esc(DB.CHANNELS[order.channel])}</div>
          </div>
          <div class="pdoc-meta">
            <div class="mono">${esc(order.code)}</div>
            <div>${esc(order.createdAt)}</div>
            <div>${totalQty} item(ns)</div>
          </div>
        </div>
        <table>
          <thead><tr><th style="width:32px">✓</th><th>Item</th><th>Local</th><th class="r">Qtd</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${order.note ? `<div style="margin-top:16px;font-size:12px;border:1px solid #ddd;border-radius:8px;padding:10px"><b>Obs.:</b> ${esc(order.note)}</div>` : ''}
        <div class="pdoc-foot"><span>Ateliê OS · separação</span><span>Conferente: __________________</span></div>
      </div>`;
    printHTML(html);
  }

  // ----- Pick list (consolidated) for many orders -----
  function pickListBatch(orders, title) {
    const DB = window.DB;
    const agg = {};
    orders.forEach(o => o.items.forEach(it => {
      if (!agg[it.sku]) agg[it.sku] = { item: DB.findItem(it.sku), qty: 0, orders: [] };
      agg[it.sku].qty += it.qty; agg[it.sku].orders.push(o.num);
    }));
    const rows = Object.values(agg).sort((a, b) => a.item.name.localeCompare(b.item.name)).map(a => `
      <tr>
        <td><span class="pdoc-check"></span></td>
        <td><b>${esc(a.item.name)}</b> ${esc(a.item.variant)}<div class="pdoc-sku">${esc(a.item.sku)}</div></td>
        <td style="font-size:11px;color:#777">${a.orders.map(esc).join(', ')}</td>
        <td class="r" style="font-size:18px;font-weight:700">${a.qty}</td>
      </tr>`).join('');
    const html = `
      <div class="pdoc">
        <div class="pdoc-head">
          <div><div class="pdoc-h1">${esc(title || 'Pick list consolidada')}</div>
          <div class="pdoc-sub">${orders.length} pedidos · separação por item</div></div>
          <div class="pdoc-meta"><div>${new Date().toLocaleDateString('pt-BR')}</div></div>
        </div>
        <table>
          <thead><tr><th style="width:32px">✓</th><th>Item</th><th>Pedidos</th><th class="r">Qtd total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="pdoc-foot"><span>Ateliê OS · separação em lote</span><span>Conferente: __________________</span></div>
      </div>`;
    printHTML(html);
  }

  // ----- Pick list for a production order (materials) -----
  function pickListProduction(op) {
    const DB = window.DB;
    const recipe = DB.recipes.find(r => r.product === op.product);
    const reqs = recipe ? recipe.components.map(c => {
      const need = +(c.qty * op.planned * (1 + c.loss / 100)).toFixed(2);
      const it = DB.findItem(c.sku);
      return { name: it ? it.name : c.sku, sku: c.sku, need, unit: c.unit, have: it ? it.available : 0 };
    }) : [];
    const rows = reqs.map(r => `
      <tr>
        <td><span class="pdoc-check"></span></td>
        <td><b>${esc(r.name)}</b><div class="pdoc-sku">${esc(r.sku)}</div></td>
        <td class="r" style="font-weight:700">${DB.num(r.need, r.need % 1 ? 2 : 0)} ${esc(r.unit)}</td>
        <td class="r" style="color:${r.have < r.need ? '#b00' : '#070'}">${DB.num(r.have, r.have % 1 ? 1 : 0)}</td>
      </tr>`).join('');
    const html = `
      <div class="pdoc">
        <div class="pdoc-head">
          <div><div class="pdoc-h1">Separação · ${esc(op.num)}</div>
          <div class="pdoc-sub">${esc(op.productName)} · ${op.planned} un · receita ${esc(op.recipe)} ${esc(op.recipeVer)}</div></div>
          <div class="pdoc-meta"><div class="mono">${esc(op.code)}</div><div>${esc(op.date)}</div></div>
        </div>
        <table>
          <thead><tr><th style="width:32px">✓</th><th>Material</th><th class="r">Necessário</th><th class="r">Em estoque</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="pdoc-foot"><span>Ateliê OS · produção</span><span>Responsável: ${esc(op.resp)}</span></div>
      </div>`;
    printHTML(html);
  }

  // ----- Consolidated materials for several production orders -----
  function pickListProductionBatch(ops) {
    const DB = window.DB;
    const agg = {};
    ops.forEach(op => {
      const recipe = DB.recipes.find(r => r.product === op.product);
      if (!recipe) return;
      recipe.components.forEach(c => {
        const need = c.qty * op.planned * (1 + c.loss / 100);
        if (!agg[c.sku]) { const it = DB.findItem(c.sku); agg[c.sku] = { name: it ? it.name : c.sku, sku: c.sku, unit: c.unit, need: 0, have: it ? it.available : 0, ops: [] }; }
        agg[c.sku].need += need; agg[c.sku].ops.push(op.num);
      });
    });
    const rows = Object.values(agg).sort((a, b) => a.name.localeCompare(b.name)).map(r => `
      <tr>
        <td><span class="pdoc-check"></span></td>
        <td><b>${esc(r.name)}</b><div class="pdoc-sku">${esc(r.sku)}</div></td>
        <td style="font-size:11px;color:#777">${[...new Set(r.ops)].map(esc).join(', ')}</td>
        <td class="r" style="font-weight:700">${DB.num(r.need, r.need % 1 ? 2 : 0)} ${esc(r.unit)}</td>
        <td class="r" style="color:${r.have < r.need ? '#b00' : '#070'}">${DB.num(r.have, r.have % 1 ? 1 : 0)}</td>
      </tr>`).join('');
    const html = `
      <div class="pdoc">
        <div class="pdoc-head">
          <div><div class="pdoc-h1">Separação de materiais</div>
          <div class="pdoc-sub">${ops.length} ordens de produção · consolidado</div></div>
          <div class="pdoc-meta"><div>${new Date().toLocaleDateString('pt-BR')}</div></div>
        </div>
        <table>
          <thead><tr><th style="width:32px">✓</th><th>Material</th><th>OPs</th><th class="r">Necessário</th><th class="r">Em estoque</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="pdoc-foot"><span>Ateliê OS · produção</span><span>Responsável: __________________</span></div>
      </div>`;
    printHTML(html);
  }

  window.AteliePrint = { printHTML, pickListOrder, pickListBatch, pickListProduction, pickListProductionBatch };
})();
