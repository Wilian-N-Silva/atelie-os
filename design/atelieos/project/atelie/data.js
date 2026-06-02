/* ============================================================
   data.js — Instante Âmbar sample data (window.DB)
   Plain JS. Realistic BRL data for an artisanal candle atelier.
   ============================================================ */
(function () {
  const BRL = (n) => 'R$ ' + (n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (n, d = 0) => (n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  /* ---------- status maps ---------- */
  const ORDER_STATUS = {
    aguardando_pagamento: { label: 'Aguardando pagamento', tone: 'warn', step: 0 },
    pago:                 { label: 'Pago', tone: 'info', step: 1 },
    a_separar:            { label: 'A separar', tone: 'info', step: 2 },
    separando:            { label: 'Separando', tone: 'info', step: 3 },
    separado:             { label: 'Separado', tone: 'info', step: 4 },
    embalando:            { label: 'Embalando', tone: 'info', step: 5 },
    embalado:             { label: 'Embalado', tone: 'ok', step: 6 },
    pronto_envio:         { label: 'Pronto p/ envio', tone: 'ok', step: 7 },
    enviado:              { label: 'Enviado', tone: 'neutral', step: 8 },
    entregue:             { label: 'Entregue', tone: 'ok', step: 9 },
    cancelado:            { label: 'Cancelado', tone: 'bad', step: -1 },
  };
  const PROD_STATUS = {
    aguardando_materiais: { label: 'Aguardando materiais', tone: 'warn' },
    materiais_separados:  { label: 'Materiais separados', tone: 'info' },
    em_producao:          { label: 'Em produção', tone: 'info' },
    em_cura:              { label: 'Em cura', tone: 'cure' },
    aguardando_revisao:   { label: 'Aguardando revisão', tone: 'warn' },
    liberada:             { label: 'Liberada', tone: 'ok' },
    finalizada:           { label: 'Finalizada', tone: 'neutral' },
  };
  const CHANNELS = {
    instagram: 'Instagram', whatsapp: 'WhatsApp', mercadolivre: 'Mercado Livre',
    shopee: 'Shopee', feira: 'Feira', direta: 'Venda direta', tiktok: 'TikTok Shop',
  };

  /* ---------- items / catalog ---------- */
  const items = [
    // produtos acabados
    { code:'010300001287', sku:'VEL-LAV-156', name:'Vela Lavanda Francesa', variant:'156ml', type:'pa', cat:'Velas', unit:'un', min:24, phys:62, reserved:8, cure:30, blocked:0, costAvg:18.40, priceSugg:74, price:69, weightG:380, packWeightG:520, dims:'9×9×9', packDims:'12×12×12', fragile:true, sell:true, status:'ativo', cureDays:14, aroma:'Lavanda francesa, bergamota, almíscar branco', collection:'Refúgio' },
    { code:'010300001294', sku:'VEL-CAP-156', name:'Vela Capim-Limão', variant:'156ml', type:'pa', cat:'Velas', unit:'un', min:24, phys:41, reserved:5, cure:0, blocked:0, costAvg:17.90, priceSugg:74, price:69, weightG:380, packWeightG:520, dims:'9×9×9', packDims:'12×12×12', fragile:true, sell:true, status:'ativo', cureDays:14, aroma:'Capim-limão, gengibre, folha verde', collection:'Manhã' },
    { code:'010300001307', sku:'VEL-BAU-156', name:'Vela Baunilha & Âmbar', variant:'156ml', type:'pa', cat:'Velas', unit:'un', min:24, phys:18, reserved:2, cure:48, blocked:0, costAvg:19.10, priceSugg:79, price:74, weightG:380, packWeightG:520, dims:'9×9×9', packDims:'12×12×12', fragile:true, sell:true, status:'ativo', cureDays:14, aroma:'Baunilha bourbon, âmbar, sândalo', collection:'Refúgio' },
    { code:'010300001314', sku:'VEL-CED-220', name:'Vela Cedro & Sândalo', variant:'220ml', type:'pa', cat:'Velas', unit:'un', min:18, phys:9, reserved:0, cure:0, blocked:3, costAvg:24.60, priceSugg:98, price:92, weightG:520, packWeightG:680, dims:'10×10×11', packDims:'13×13×13', fragile:true, sell:true, status:'ativo', cureDays:14, aroma:'Cedro, sândalo, vetiver', collection:'Floresta' },
    { code:'010300001321', sku:'VEL-FLO-156', name:'Vela Flor de Laranjeira', variant:'156ml', type:'pa', cat:'Velas', unit:'un', min:24, phys:37, reserved:6, cure:0, blocked:0, costAvg:18.20, priceSugg:74, price:69, weightG:380, packWeightG:520, dims:'9×9×9', packDims:'12×12×12', fragile:true, sell:true, status:'ativo', cureDays:14, aroma:'Flor de laranjeira, néroli, mel', collection:'Manhã' },
    { code:'010300001338', sku:'VEL-EUC-220', name:'Vela Eucalipto & Menta', variant:'220ml', type:'pa', cat:'Velas', unit:'un', min:18, phys:22, reserved:1, cure:0, blocked:0, costAvg:24.10, priceSugg:98, price:92, weightG:520, packWeightG:680, dims:'10×10×11', packDims:'13×13×13', fragile:true, sell:true, status:'ativo', cureDays:14, aroma:'Eucalipto, menta, alecrim', collection:'Floresta' },
    { code:'010400000452', sku:'KIT-RIT-003', name:'Kit Ritual Noturno', variant:'3 velas', type:'kit', cat:'Kits', unit:'un', min:8, phys:11, reserved:3, cure:0, blocked:0, costAvg:58.90, priceSugg:219, price:198, weightG:1180, packWeightG:1480, dims:'—', packDims:'30×12×12', fragile:true, sell:true, status:'ativo', cureDays:0, aroma:'Lavanda · Baunilha & Âmbar · Cedro', collection:'Refúgio' },
    // matéria-prima
    { code:'010100000018', sku:'CER-SOJ-01', name:'Cera de Soja Ecosoya', variant:'sc 10kg', type:'mp', cat:'Cera', unit:'kg', min:8, phys:14.2, reserved:0, cure:0, blocked:0, costAvg:32.50, priceSugg:0, price:0, status:'ativo' },
    { code:'010100000025', sku:'ESS-LAV-FR', name:'Essência Lavanda Francesa', variant:'1L', type:'mp', cat:'Essências', unit:'ml', min:600, phys:430, reserved:0, cure:0, blocked:0, costAvg:0.42, priceSugg:0, price:0, status:'ativo' },
    { code:'010100000032', sku:'ESS-CAP-LM', name:'Essência Capim-Limão', variant:'1L', type:'mp', cat:'Essências', unit:'ml', min:600, phys:880, reserved:0, cure:0, blocked:0, costAvg:0.38, priceSugg:0, price:0, status:'ativo' },
    { code:'010100000049', sku:'ESS-BAU-AM', name:'Essência Baunilha & Âmbar', variant:'1L', type:'mp', cat:'Essências', unit:'ml', min:600, phys:510, reserved:0, cure:0, blocked:0, costAvg:0.55, priceSugg:0, price:0, status:'ativo' },
    { code:'010100000063', sku:'ESS-CED-SA', name:'Essência Cedro & Sândalo', variant:'1L', type:'mp', cat:'Essências', unit:'ml', min:500, phys:240, reserved:0, cure:0, blocked:0, costAvg:0.61, priceSugg:0, price:0, status:'ativo' },
    { code:'010100000056', sku:'PAV-ALG-18', name:'Pavio de Algodão 18mm', variant:'rolo', type:'mp', cat:'Pavios', unit:'un', min:200, phys:540, reserved:0, cure:0, blocked:0, costAvg:0.85, priceSugg:0, price:0, status:'ativo' },
    // embalagem
    { code:'010200000011', sku:'VID-NAD-156', name:'Vidro Nadir 156ml', variant:'âmbar', type:'emb', cat:'Vidros', unit:'un', min:60, phys:88, reserved:0, cure:0, blocked:0, costAvg:4.20, priceSugg:0, price:0, status:'ativo' },
    { code:'010200000028', sku:'VID-NAD-220', name:'Vidro Nadir 220ml', variant:'âmbar', type:'emb', cat:'Vidros', unit:'un', min:48, phys:31, reserved:0, cure:0, blocked:0, costAvg:5.10, priceSugg:0, price:0, status:'ativo' },
    { code:'010200000035', sku:'TMP-PIN-052', name:'Tampa Pinus 52mm', variant:'natural', type:'emb', cat:'Tampas', unit:'un', min:120, phys:96, reserved:0, cure:0, blocked:0, costAvg:1.60, priceSugg:0, price:0, status:'ativo' },
    { code:'010200000042', sku:'CXA-KFT-121212', name:'Caixa Kraft 12×12×12', variant:'parda', type:'emb', cat:'Caixas', unit:'un', min:100, phys:240, reserved:0, cure:0, blocked:0, costAvg:2.30, priceSugg:0, price:0, status:'ativo' },
    { code:'010200000059', sku:'CRT-AGR-01', name:'Cartão de Agradecimento', variant:'kraft', type:'emb', cat:'Brindes', unit:'un', min:150, phys:410, reserved:0, cure:0, blocked:0, costAvg:0.65, priceSugg:0, price:0, status:'ativo' },
  ];
  items.forEach(i => { i.available = Math.max(0, i.phys - i.reserved - i.cure - i.blocked); });

  const findItem = (sku) => items.find(i => i.sku === sku);

  /* ---------- orders ---------- */
  const orders = [
    { id:'o1', code:'040100000931', num:'#1042', channel:'instagram', extNum:null, customer:'Marina Alves', customerName:'Marina Alves', city:'São Paulo · SP', status:'a_separar', payment:'pago', createdAt:'31/05 09:12', freight:24.90, discount:0, total:162.90,
      items:[{sku:'VEL-LAV-156',qty:1},{sku:'VEL-BAU-156',qty:1}], tracking:null, note:'Cliente pediu cartão escrito à mão.' },
    { id:'o2', code:'040100000932', num:'#1043', channel:'whatsapp', extNum:null, customer:'Beatriz Lemos', customerName:'Beatriz Lemos', city:'Campinas · SP', status:'a_separar', payment:'pago', createdAt:'31/05 08:40', freight:22.00, discount:10, total:259.00,
      items:[{sku:'KIT-RIT-003',qty:1},{sku:'VEL-CAP-156',qty:1}], tracking:null, note:null },
    { id:'o3', code:'040300000118', num:'ML-88231', channel:'mercadolivre', extNum:'2000-8841-2231', customer:'João P.', customerName:'João Pereira', city:'Rio de Janeiro · RJ', status:'pago', payment:'pago', createdAt:'31/05 07:55', freight:0, discount:0, total:138.00,
      items:[{sku:'VEL-CED-220',qty:1},{sku:'VEL-EUC-220',qty:1}], tracking:null, note:'Etiqueta ML anexada (PDF).' },
    { id:'o4', code:'040100000930', num:'#1041', channel:'instagram', extNum:null, customer:'Carla Souza', customerName:'Carla Souza', city:'Santo André · SP', status:'separado', payment:'pago', createdAt:'30/05 18:22', freight:24.90, discount:0, total:162.90,
      items:[{sku:'VEL-FLO-156',qty:1},{sku:'VEL-LAV-156',qty:1}], tracking:null, note:null },
    { id:'o5', code:'040100000929', num:'#1040', channel:'whatsapp', extNum:null, customer:'Renata D.', customerName:'Renata Dias', city:'São Paulo · SP', status:'embalado', payment:'pago', createdAt:'30/05 16:08', freight:0, discount:0, total:198.00,
      items:[{sku:'KIT-RIT-003',qty:1}], tracking:null, note:'Retirada na feira de sábado.' },
    { id:'o6', code:'040100000928', num:'#1039', channel:'direta', extNum:null, customer:'Lúcia M.', customerName:'Lúcia Martins', city:'Sorocaba · SP', status:'pronto_envio', payment:'pago', createdAt:'30/05 11:30', freight:27.40, discount:0, total:211.40,
      items:[{sku:'VEL-CED-220',qty:2}], tracking:'BR849201773BR', note:null },
    { id:'o7', code:'040200000077', num:'#1038', channel:'shopee', extNum:'24053100AB9', customer:'Paula R.', customerName:'Paula Ribeiro', city:'Curitiba · PR', status:'aguardando_pagamento', payment:'aguardando', createdAt:'30/05 10:02', freight:19.90, discount:0, total:93.90,
      items:[{sku:'VEL-CAP-156',qty:1}], tracking:null, note:'Aguardando confirmação Shopee.' },
    { id:'o8', code:'040100000927', num:'#1037', channel:'instagram', extNum:null, customer:'Helena V.', customerName:'Helena Vargas', city:'Niterói · RJ', status:'enviado', payment:'pago', createdAt:'29/05 14:45', freight:26.10, discount:0, total:165.10,
      items:[{sku:'VEL-BAU-156',qty:1},{sku:'VEL-EUC-220',qty:1}], tracking:'BR849100021BR', note:null },
  ];

  /* ---------- production orders ---------- */
  const production = [
    { id:'p1', code:'030100000208', num:'OP-208', product:'VEL-LAV-156', productName:'Vela Lavanda Francesa 156ml', recipe:'Lavanda Francesa', recipeVer:'v3', planned:40, status:'aguardando_materiais', date:'31/05', resp:'Camila', cureUntil:null,
      missing:[{sku:'VID-NAD-156', need:40, have:88}], short:false },
    { id:'p2', code:'030100000207', num:'OP-207', product:'VEL-CED-220', productName:'Vela Cedro & Sândalo 220ml', recipe:'Cedro & Sândalo', recipeVer:'v2', planned:24, status:'aguardando_materiais', date:'31/05', resp:'Camila', cureUntil:null,
      missing:[{sku:'VID-NAD-220', need:24, have:31},{sku:'ESS-CED-SA', need:288, have:240}], short:true },
    { id:'p3', code:'030100000206', num:'OP-206', product:'VEL-CAP-156', productName:'Vela Capim-Limão 156ml', recipe:'Capim-Limão', recipeVer:'v2', planned:36, status:'em_producao', date:'30/05', resp:'Camila', cureUntil:null, progress:62 },
    { id:'p4', code:'030100000205', num:'OP-205', product:'VEL-BAU-156', productName:'Vela Baunilha & Âmbar 156ml', recipe:'Baunilha & Âmbar', recipeVer:'v4', planned:48, produced:48, status:'em_cura', date:'24/05', resp:'Camila', cureUntil:'07/06', cureDayLeft:7, lot:'020300000613' },
    { id:'p5', code:'030100000204', num:'OP-204', product:'VEL-LAV-156', productName:'Vela Lavanda Francesa 156ml', recipe:'Lavanda Francesa', recipeVer:'v3', planned:40, produced:40, status:'aguardando_revisao', date:'17/05', resp:'Camila', cureUntil:'31/05', cureDayLeft:0, lot:'020300000598' },
    { id:'p6', code:'030100000203', num:'OP-203', product:'VEL-FLO-156', productName:'Vela Flor de Laranjeira 156ml', recipe:'Flor de Laranjeira', recipeVer:'v1', planned:36, produced:35, status:'liberada', date:'12/05', resp:'Camila', cureUntil:'26/05', cureDayLeft:0, lot:'020300000571' },
  ];

  /* ---------- recipes / formulas ---------- */
  const recipes = [
    { id:'r1', name:'Lavanda Francesa', product:'VEL-LAV-156', productName:'Vela Lavanda Francesa 156ml', version:'v3', status:'ativa', yield:1, yieldUnit:'vela 156ml', cureDays:14, prodMin:8, loss:4, cost:18.40,
      components:[
        { sku:'CER-SOJ-01', name:'Cera de Soja Ecosoya', qty:0.142, unit:'kg', loss:3, req:true },
        { sku:'ESS-LAV-FR', name:'Essência Lavanda Francesa', qty:11, unit:'ml', loss:2, req:true },
        { sku:'PAV-ALG-18', name:'Pavio de Algodão 18mm', qty:1, unit:'un', loss:0, req:true },
        { sku:'VID-NAD-156', name:'Vidro Nadir 156ml', qty:1, unit:'un', loss:1, req:true },
        { sku:'TMP-PIN-052', name:'Tampa Pinus 52mm', qty:1, unit:'un', loss:0, req:true },
      ],
      tests:[
        { date:'05/05', qty:6, result:'aprovado', burn:'Queima limpa, sem fuligem', scent:'Difusão forte a frio e quente', finish:'Topo liso', next:'Manter v3' },
        { date:'21/04', qty:6, result:'ajustar', burn:'Túnel leve nas bordas', scent:'OK', finish:'Pequena retração', next:'+0.5% essência, baixar temp. de despeje' },
      ] },
    { id:'r2', name:'Capim-Limão', product:'VEL-CAP-156', productName:'Vela Capim-Limão 156ml', version:'v2', status:'ativa', yield:1, yieldUnit:'vela 156ml', cureDays:14, prodMin:8, loss:4, cost:17.90,
      components:[
        { sku:'CER-SOJ-01', name:'Cera de Soja Ecosoya', qty:0.142, unit:'kg', loss:3, req:true },
        { sku:'ESS-CAP-LM', name:'Essência Capim-Limão', qty:10, unit:'ml', loss:2, req:true },
        { sku:'PAV-ALG-18', name:'Pavio de Algodão 18mm', qty:1, unit:'un', loss:0, req:true },
        { sku:'VID-NAD-156', name:'Vidro Nadir 156ml', qty:1, unit:'un', loss:1, req:true },
        { sku:'TMP-PIN-052', name:'Tampa Pinus 52mm', qty:1, unit:'un', loss:0, req:true },
      ], tests:[{ date:'28/04', qty:6, result:'aprovado', burn:'Queima uniforme', scent:'Cítrico vivo', finish:'Topo liso', next:'Manter' }] },
    { id:'r3', name:'Baunilha & Âmbar', product:'VEL-BAU-156', productName:'Vela Baunilha & Âmbar 156ml', version:'v4', status:'ativa', yield:1, yieldUnit:'vela 156ml', cureDays:14, prodMin:8, loss:5, cost:19.10,
      components:[
        { sku:'CER-SOJ-01', name:'Cera de Soja Ecosoya', qty:0.142, unit:'kg', loss:3, req:true },
        { sku:'ESS-BAU-AM', name:'Essência Baunilha & Âmbar', qty:12, unit:'ml', loss:2, req:true },
        { sku:'PAV-ALG-18', name:'Pavio de Algodão 18mm', qty:1, unit:'un', loss:0, req:true },
        { sku:'VID-NAD-156', name:'Vidro Nadir 156ml', qty:1, unit:'un', loss:1, req:true },
        { sku:'TMP-PIN-052', name:'Tampa Pinus 52mm', qty:1, unit:'un', loss:0, req:true },
      ], tests:[{ date:'02/05', qty:6, result:'aprovado', burn:'Queima limpa', scent:'Doce equilibrado, âmbar persistente', finish:'Topo liso', next:'Manter v4' }] },
    { id:'r4', name:'Cedro & Sândalo', product:'VEL-CED-220', productName:'Vela Cedro & Sândalo 220ml', version:'v2', status:'ativa', yield:1, yieldUnit:'vela 220ml', cureDays:14, prodMin:6, loss:5, cost:24.60,
      components:[
        { sku:'CER-SOJ-01', name:'Cera de Soja Ecosoya', qty:0.200, unit:'kg', loss:3, req:true },
        { sku:'ESS-CED-SA', name:'Essência Cedro & Sândalo', qty:12, unit:'ml', loss:2, req:true },
        { sku:'PAV-ALG-18', name:'Pavio de Algodão 18mm', qty:1, unit:'un', loss:0, req:true },
        { sku:'VID-NAD-220', name:'Vidro Nadir 220ml', qty:1, unit:'un', loss:1, req:true },
        { sku:'TMP-PIN-052', name:'Tampa Pinus 52mm', qty:1, unit:'un', loss:0, req:true },
      ], tests:[] },
    { id:'r5', name:'Flor de Laranjeira', product:'VEL-FLO-156', productName:'Vela Flor de Laranjeira 156ml', version:'v1', status:'rascunho', yield:1, yieldUnit:'vela 156ml', cureDays:14, prodMin:8, loss:4, cost:18.20,
      components:[
        { sku:'CER-SOJ-01', name:'Cera de Soja Ecosoya', qty:0.142, unit:'kg', loss:3, req:true },
        { sku:'PAV-ALG-18', name:'Pavio de Algodão 18mm', qty:1, unit:'un', loss:0, req:true },
        { sku:'VID-NAD-156', name:'Vidro Nadir 156ml', qty:1, unit:'un', loss:1, req:true },
      ], tests:[] },
  ];

  /* ---------- stock movements ---------- */
  const movements = [
    { id:'m1', when:'31/05 09:40', sku:'VEL-LAV-156', type:'reserva', qty:-1, lot:'020300000598', loc:'Cura · A2', who:'Sistema', origin:'sistema', ref:'#1042' },
    { id:'m2', when:'31/05 08:15', sku:'CER-SOJ-01', type:'compra', qty:+10, lot:'020100000311', loc:'Prateleira · B1', who:'Camila', origin:'manual', ref:'Compra #54' },
    { id:'m3', when:'30/05 17:20', sku:'VEL-CAP-156', type:'saida_producao', qty:+36, lot:'020300000620', loc:'Bancada', who:'Camila', origin:'manual', ref:'OP-206' },
    { id:'m4', when:'30/05 16:55', sku:'CER-SOJ-01', type:'consumo_producao', qty:-5.1, lot:'020100000298', loc:'Bancada', who:'Camila', origin:'scanner', ref:'OP-206' },
    { id:'m5', when:'30/05 11:05', sku:'VEL-CED-220', type:'bloqueio', qty:-3, lot:'020300000540', loc:'Bloqueados', who:'Camila', origin:'manual', ref:'Topo irregular' },
    { id:'m6', when:'29/05 19:10', sku:'VEL-BAU-156', type:'ajuste_negativo', qty:-2, lot:'020300000613', loc:'Cura · A1', who:'Camila', origin:'manual', ref:'Quebra' },
    { id:'m7', when:'29/05 15:30', sku:'VID-NAD-156', type:'compra', qty:+72, lot:'020200000140', loc:'Embalagens · C3', who:'Camila', origin:'manual', ref:'Compra #53' },
    { id:'m8', when:'29/05 14:50', sku:'VEL-EUC-220', type:'envio_pedido', qty:-1, lot:'020300000505', loc:'Expedição', who:'Camila', origin:'scanner', ref:'#1037' },
  ];
  const MOVE_TYPES = {
    compra:{label:'Compra/entrada',tone:'ok'}, ajuste_positivo:{label:'Ajuste +',tone:'ok'},
    ajuste_negativo:{label:'Ajuste −',tone:'bad'}, perda:{label:'Perda',tone:'bad'},
    reserva:{label:'Reserva',tone:'info'}, consumo_producao:{label:'Consumo produção',tone:'neutral'},
    saida_producao:{label:'Saída produção',tone:'ok'}, envio_pedido:{label:'Envio pedido',tone:'neutral'},
    bloqueio:{label:'Bloqueio',tone:'bad'}, liberacao:{label:'Liberação',tone:'ok'},
    transferencia:{label:'Transferência',tone:'neutral'},
  };

  /* ---------- locations ---------- */
  const locations = [
    { code:'050100000017', name:'Prateleira · B1', type:'Prateleira', items:6 },
    { code:'050200000024', name:'Caixa organizadora · O3', type:'Caixa', items:4 },
    { code:'050300000031', name:'Bancada de produção', type:'Bancada', items:2 },
    { code:'050400000048', name:'Área de cura · A1', type:'Cura', items:3 },
    { code:'050400000055', name:'Área de cura · A2', type:'Cura', items:2 },
    { code:'050500000062', name:'Expedição', type:'Expedição', items:5 },
    { code:'050600000079', name:'Produtos bloqueados', type:'Bloqueio', items:1 },
    { code:'050700000086', name:'Estoque de embalagens · C3', type:'Embalagens', items:7 },
  ];

  /* ---------- AI content ---------- */
  const brandVoice = {
    personality:'Acolhedora, sofisticada, serena, poética, minimalista',
    promise:'Transformar o fim do dia em um ritual de paz e autocuidado',
    audience:'Mulheres adultas, rotina corrida, que buscam aconchego e autocuidado',
    prefer:['pausa','respiro','aconchego','calmaria','refúgio','cuidado','aroma','luz'],
    avoid:['compre agora','promoção imperdível','cura','terapêutico','garantido','milagroso'],
    tone:'Calmo, próximo, sem pressão',
  };
  const aiTemplates = [
    { id:'t1', name:'Descrição de catálogo', icon:'fileText', desc:'Texto curto + longo para o produto' },
    { id:'t2', name:'Legenda de lançamento', icon:'ia', desc:'Post de Instagram para estreia' },
    { id:'t3', name:'Post de reposição', icon:'refresh', desc:'Avisar que um aroma voltou' },
    { id:'t4', name:'Mensagem de pós-venda', icon:'pedidos', desc:'WhatsApp após o envio' },
    { id:'t5', name:'Texto de cartão', icon:'tag', desc:'Cartão que vai dentro da caixa' },
    { id:'t6', name:'Campanha de data', icon:'calendar', desc:'Dia das Mães, Natal…' },
  ];
  const aiHistory = [
    { id:'a1', product:'Vela Lavanda Francesa', type:'Descrição de catálogo', status:'aprovado', fav:true, when:'30/05', by:'Camila',
      text:'Quando a noite chega, a Lavanda Francesa convida a uma pausa. Um aroma sereno de lavanda e bergamota que envolve o ambiente em calmaria — para você fechar o dia com um respiro de cuidado.' },
    { id:'a2', product:'Vela Baunilha & Âmbar', type:'Legenda de lançamento', status:'usado', fav:false, when:'28/05', by:'Camila',
      text:'Chegou para morar nos seus fins de tarde. Baunilha & Âmbar é o abraço quente que faltava na sua casa — um refúgio doce para desacelerar. ✨' },
    { id:'a3', product:'Vela Capim-Limão', type:'Post de reposição', status:'rascunho', fav:false, when:'27/05', by:'Camila',
      text:'Ele voltou. O Capim-Limão está de volta ao ateliê — leve, cítrico e cheio de manhã. Para começar o dia com um respiro verde.' },
  ];

  /* ---------- brand presets (white-label) ---------- */
  const brandPresets = [
    { id: 'neutro-claro', name: 'Neutro claro', mode: 'light', radius: '0.5rem', system: true,
      colors: { background:'#FFFFFF', foreground:'#0A0A0B', card:'#FFFFFF', cardForeground:'#0A0A0B',
        primary:'#18181B', primaryForeground:'#FAFAFA', secondary:'#F4F4F5', secondaryForeground:'#18181B',
        muted:'#F4F4F5', mutedForeground:'#71717A', accent:'#6D5CE7', accentForeground:'#FFFFFF',
        border:'#E4E4E7', input:'#E4E4E7', ring:'#A1A1AA',
        success:'#2F9E5B', warning:'#C97A14', danger:'#D03A2F', info:'#2D6FD6', sidebarBackground:'#FAFAFA' } },
    { id: 'neutro-escuro', name: 'Neutro escuro', mode: 'dark', radius: '0.5rem', system: true,
      colors: { background:'#0E0E11', foreground:'#F4F4F5', card:'#17171B', cardForeground:'#F4F4F5',
        primary:'#FAFAFA', primaryForeground:'#18181B', secondary:'#26262B', secondaryForeground:'#F4F4F5',
        muted:'#26262B', mutedForeground:'#9B9BA4', accent:'#8B7CF0', accentForeground:'#0E0E11',
        border:'#2A2A30', input:'#2E2E34', ring:'#54545C',
        success:'#4ADE80', warning:'#FBBF24', danger:'#F87171', info:'#60A5FA', sidebarBackground:'#121216' } },
    { id: 'pb', name: 'Minimalista P&B', mode: 'light', radius: '0.25rem', system: true,
      colors: { background:'#FFFFFF', foreground:'#000000', card:'#FFFFFF', cardForeground:'#000000',
        primary:'#000000', primaryForeground:'#FFFFFF', secondary:'#F2F2F2', secondaryForeground:'#000000',
        muted:'#F2F2F2', mutedForeground:'#6B6B6B', accent:'#000000', accentForeground:'#FFFFFF',
        border:'#E0E0E0', input:'#E0E0E0', ring:'#9A9A9A',
        success:'#2E2E2E', warning:'#4A4A4A', danger:'#000000', info:'#3A3A3A', sidebarBackground:'#FFFFFF' } },
    { id: 'terroso', name: 'Artesanal terroso', mode: 'light', radius: '0.875rem', system: true,
      colors: { background:'#F7F3EE', foreground:'#33291F', card:'#FFFFFF', cardForeground:'#33291F',
        primary:'#7A5B3A', primaryForeground:'#FBF7F1', secondary:'#EADDD0', secondaryForeground:'#33291F',
        muted:'#EFE6DB', mutedForeground:'#766354', accent:'#B07D4E', accentForeground:'#FBF7F1',
        border:'#E0D2C2', input:'#E0D2C2', ring:'#A07A53',
        success:'#4F7D3F', warning:'#B5821C', danger:'#A6453B', info:'#4B6E94', sidebarBackground:'#33291F' } },
    { id: 'ambar', name: 'Instante Âmbar', mode: 'light', radius: '0.875rem', system: true,
      colors: { background:'#FAF7F2', foreground:'#2A211D', card:'#FFFFFF', cardForeground:'#2A211D',
        primary:'#8A5A44', primaryForeground:'#FFFFFF', secondary:'#E8D7CD', secondaryForeground:'#2A211D',
        muted:'#F1E9E3', mutedForeground:'#6B5B53', accent:'#C49A6C', accentForeground:'#2A211D',
        border:'#E2D4C8', input:'#E2D4C8', ring:'#8A5A44',
        success:'#3F7D58', warning:'#B7791F', danger:'#A94442', info:'#3A6EA5', sidebarBackground:'#2A211D' } },
  ];

  /* ---------- workflow presets (configurable kanban) ---------- */
  const STEP_COLORS = ['neutral', 'info', 'cure', 'warn', 'ok', 'bad'];
  const workflowPresets = {
    production: [
      { id: 'wf-velas', name: 'Produção — Velas', entity: 'production', steps: [
        { key:'aguardando_materiais', label:'Aguardando material', color:'warn', automation:'none', is_initial:true, blocks_availability:false, requires_checklist:false, requires_reason:false, requires_quantity_input:false },
        { key:'em_producao', label:'Em produção', color:'info', automation:'start_production', blocks_availability:false, requires_quantity_input:true },
        { key:'em_cura', label:'Em cura', color:'cure', automation:'block_stock_availability', blocks_availability:true, requires_checklist:true },
        { key:'aguardando_revisao', label:'Revisão de qualidade', color:'warn', automation:'request_quality_review', requires_checklist:true },
        { key:'liberada', label:'Liberada para venda', color:'ok', automation:'release_stock_availability' },
        { key:'finalizada', label:'Finalizada', color:'neutral', automation:'none', is_final:true },
      ]},
      { id: 'wf-generica', name: 'Produção — Genérica', entity: 'production', steps: [
        { key:'aguardando_materiais', label:'Aguardando material', color:'warn', is_initial:true },
        { key:'em_producao', label:'Em produção', color:'info', automation:'start_production' },
        { key:'aguardando_revisao', label:'Aguardando revisão', color:'warn', requires_checklist:true },
        { key:'liberada', label:'Aprovada', color:'ok', automation:'release_stock_availability' },
        { key:'finalizada', label:'Finalizada', color:'neutral', is_final:true },
      ]},
      { id: 'wf-alimentos', name: 'Produção — Alimentos', entity: 'production', steps: [
        { key:'aguardando_materiais', label:'Preparando ingredientes', color:'warn', is_initial:true },
        { key:'em_producao', label:'Em preparo', color:'info', automation:'start_production' },
        { key:'em_cura', label:'Resfriamento / descanso', color:'cure', automation:'block_stock_availability', blocks_availability:true },
        { key:'aguardando_revisao', label:'Embalagem', color:'warn' },
        { key:'liberada', label:'Pronta para venda', color:'ok', automation:'release_stock_availability' },
        { key:'finalizada', label:'Finalizada', color:'neutral', is_final:true },
      ]},
      { id: 'wf-kits', name: 'Produção — Kits', entity: 'production', steps: [
        { key:'aguardando_materiais', label:'Separando componentes', color:'warn', is_initial:true },
        { key:'em_producao', label:'Montando kit', color:'info', automation:'start_production' },
        { key:'aguardando_revisao', label:'Conferência', color:'warn', requires_checklist:true },
        { key:'liberada', label:'Pronto para estoque', color:'ok' },
        { key:'finalizada', label:'Finalizada', color:'neutral', is_final:true },
      ]},
    ],
    order: [
      { id: 'wf-pedidos', name: 'Pedidos — Simples', entity: 'order', steps: [
        { key:'aguardando_pagamento', label:'Aguardando pagamento', color:'warn', is_initial:true },
        { key:'pago', label:'Pago', color:'info', automation:'reserve_stock' },
        { key:'a_separar', label:'Separar', color:'info' },
        { key:'separado', label:'Separado', color:'info' },
        { key:'embalado', label:'Embalar', color:'info', requires_checklist:true },
        { key:'pronto_envio', label:'Pronto para envio', color:'ok', automation:'mark_ready_to_ship' },
        { key:'enviado', label:'Enviado', color:'neutral', automation:'mark_shipped', is_final:true },
      ]},
    ],
  };
  const AUTOMATIONS = ['none','reserve_stock','release_reservation','start_production','consume_materials','create_output_lot','block_stock_availability','release_stock_availability','request_quality_review','mark_ready_to_ship','mark_shipped','mark_delivered'];

  /* ---------- label sheet models (Pimaco etc.) ---------- */
  const labelSheets = [
    { id:'ps-a4-grade', name:'Folha A4 — grade 3×8', brand:'Genérico', code:'A4-3x8', pageW:210, pageH:297, cols:3, rows:8, labelW:63.5, labelH:33.9, mTop:9, mLeft:7, gutX:2.5, gutY:0 },
    { id:'ps-a4056', name:'Pimaco A4056 (exemplo)', brand:'Pimaco', code:'A4056', pageW:210, pageH:297, cols:4, rows:10, labelW:48, labelH:25, mTop:11, mLeft:7, gutX:2, gutY:1.5 },
    { id:'ps-6080', name:'Folha A4 — endereço 3×7', brand:'Genérico', code:'A4-3x7', pageW:210, pageH:297, cols:3, rows:7, labelW:63.5, labelH:38.1, mTop:9, mLeft:7, gutX:2.5, gutY:0 },
    { id:'ps-6082', name:'Folha A4 — larga 2×7', brand:'Genérico', code:'A4-2x7', pageW:210, pageH:297, cols:2, rows:7, labelW:101.6, labelH:33.9, mTop:12, mLeft:3, gutX:1.5, gutY:0 },
    { id:'ps-rolo', name:'Rolo térmico 50×30', brand:'Genérico', code:'ROLO-50x30', pageW:50, pageH:30, cols:1, rows:1, labelW:50, labelH:30, mTop:0, mLeft:0, gutX:0, gutY:0, roll:true },
    { id:'ps-rolo-80', name:'Rolo térmico 80×40', brand:'Genérico', code:'ROLO-80x40', pageW:80, pageH:40, cols:1, rows:1, labelW:80, labelH:40, mTop:0, mLeft:0, gutX:0, gutY:0, roll:true },
  ];

  /* ---------- finance snapshot (for dashboard) ---------- */
  const finance = { aReceber: 1284.30, aPagar: 642.00, recebidoMes: 8940.00, margemBruta: 0.58 };

  /* ---------- label templates (editor de etiquetas) ---------- */
  const labelTemplates = [
    { id:'lt1', name:'Etiqueta de Item', target:'item', icon:'tag', w:50, h:30, desc:'Produto/insumo com SKU e código',
      fields:['name','variant','sku','code','barcode'], default:true },
    { id:'lt2', name:'Etiqueta de Lote', target:'lote', icon:'layers', w:50, h:30, desc:'Lote com validade e produção',
      fields:['name','lot','prodDate','code','barcode'] },
    { id:'lt3', name:'Etiqueta de OP', target:'op', icon:'producao', w:60, h:40, desc:'Ordem de produção para bancada',
      fields:['opNum','productName','planned','recipe','code','barcode'] },
    { id:'lt4', name:'Etiqueta de Pedido', target:'pedido', icon:'pedidos', w:100, h:60, desc:'Volume / caixa do pedido',
      fields:['orderNum','customer','city','code','barcode'] },
    { id:'lt5', name:'Etiqueta de Localização', target:'local', icon:'mapPin', w:60, h:40, desc:'Prateleira, cura, expedição',
      fields:['locName','locType','code','barcode'] },
  ];
  const labelHistory = [
    { id:'lh1', when:'31/05 08:20', template:'Etiqueta de Item', target:'Vidro Nadir 156ml', qty:72, by:'Camila', size:'50×30' },
    { id:'lh2', when:'30/05 17:05', template:'Etiqueta de Lote', target:'Lote 020300000620 · Capim-Limão', qty:36, by:'Camila', size:'50×30' },
    { id:'lh3', when:'30/05 11:40', template:'Etiqueta de OP', target:'OP-206 · Capim-Limão', qty:1, by:'Camila', size:'60×40' },
    { id:'lh4', when:'29/05 15:35', template:'Etiqueta de Item', target:'Cera de Soja Ecosoya', qty:1, by:'Camila', size:'50×30' },
    { id:'lh5', when:'29/05 09:10', template:'Etiqueta de Localização', target:'Área de cura · A2', qty:1, by:'Camila', size:'60×40' },
  ];

  /* ---------- dynamic notifications ---------- */
  function buildNotifications() {
    const out = [];
    // itens abaixo do mínimo
    items.filter(i => i.available < i.min).forEach(i => {
      const zero = i.available === 0;
      out.push({
        id: 'low-' + i.code, group: 'estoque',
        severity: zero ? 'critical' : 'warning',
        icon: zero ? 'alertCircle' : 'alert', tone: zero ? 'bad' : 'warn',
        title: zero ? `${i.name} ${i.variant} zerado` : `${i.name} ${i.variant} abaixo do mínimo`,
        desc: `${num(i.available)} ${i.unit} disponível · mínimo ${i.min}`,
        action: { screen: 'estoque' }, actionLabel: 'Ver estoque', critical: zero,
      });
    });
    // produção com material faltando
    production.filter(p => p.short).forEach(p => {
      out.push({ id: 'prodshort-' + p.id, group: 'producao', severity: 'warning', icon: 'box', tone: 'warn',
        title: `${p.num} sem material suficiente`, desc: `${p.productName} · falta insumo para produzir ${p.planned} un`,
        action: { screen: 'producao' }, actionLabel: 'Resolver produção' });
    });
    // lote aguardando revisão
    production.filter(p => p.status === 'aguardando_revisao').forEach(p => {
      out.push({ id: 'rev-' + p.id, group: 'producao', severity: 'warning', icon: 'listChecks', tone: 'warn',
        title: `${p.num} aguardando revisão`, desc: `Cura concluída · lote ${p.lot} pronto para liberar`,
        action: { screen: 'producao' }, actionLabel: 'Revisar lote' });
    });
    // lote termina cura
    production.filter(p => p.status === 'em_cura' && p.cureDayLeft <= 7).forEach(p => {
      out.push({ id: 'cure-' + p.id, group: 'producao', severity: 'info', icon: 'thermometer', tone: 'cure',
        title: `${p.num} em cura · faltam ${p.cureDayLeft} dias`, desc: `Liberação prevista para ${p.cureUntil}`,
        action: { screen: 'producao' }, actionLabel: 'Ver produção' });
    });
    // pedidos pagos não separados
    const naoSep = orders.filter(o => ['pago', 'a_separar'].includes(o.status));
    if (naoSep.length) out.push({ id: 'unpicked', group: 'pedidos', severity: 'warning', icon: 'pedidos', tone: 'info',
      title: `${naoSep.length} pedidos pagos a separar`, desc: 'Pagos e aguardando separação na bancada',
      action: { screen: 'pedidos', filter: 'a_separar' }, actionLabel: 'Separar pedidos' });
    // conta vencendo
    out.push({ id: 'bill', group: 'financeiro', severity: 'warning', icon: 'banknote', tone: 'warn',
      title: 'Conta a pagar vence amanhã', desc: `Fornecedor de essências · ${BRL(420)}`,
      action: { screen: 'hoje' }, actionLabel: 'Ver financeiro' });
    // etiqueta pendente
    out.push({ id: 'label', group: 'etiquetas', severity: 'info', icon: 'tag', tone: 'info',
      title: 'Etiquetas de lote pendentes', desc: 'Lote 020300000620 recebido sem etiquetas impressas',
      action: { screen: 'etiquetas' }, actionLabel: 'Imprimir etiquetas' });
    return out;
  }

  window.DB = {
    BRL, num, items, orders, production, recipes, movements, locations,
    brandVoice, aiTemplates, aiHistory, finance, labelTemplates, labelHistory,
    brandPresets, workflowPresets, AUTOMATIONS, labelSheets, STEP_COLORS,
    ORDER_STATUS, PROD_STATUS, CHANNELS, MOVE_TYPES, findItem, buildNotifications,
  };
})();
