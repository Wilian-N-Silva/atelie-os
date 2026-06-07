# QA Checklist — feature/remove-localstorage-persistence

Manual browser QA before merging to `development`. Login: `admin@example.com` / seed password.
Mark each item PASS/FAIL and note anything off. For the full delivered list see `feature-log.md`.

## 0. Setup
- [ ] `docker compose up -d postgres` · `npm run db:migrate` · `npm run db:seed` · `npm run dev`
- [ ] `.env`: `NEXT_PUBLIC_APP_URL`/`BETTER_AUTH_URL` = `http://localhost:3000` (else 401 on login)
- [ ] Login works; dashboard loads.

## 1. Pedidos / rastreio
- [ ] Clicar num pedido abre **tela dedicada** (não painel sob a lista); botão "Pedidos" volta.
- [ ] Fluxo de envio Melhor Envio (sandbox): cotar → carrinho → comprar/gerar/imprimir.
- [ ] `orders.metadata.shippingLabel` recebe `tracking` após gerar/webhook.

## 2. Receitas + protocolo de teste
- [ ] Criar receita; "Novo teste" gera card com código de barras.
- [ ] "Etiqueta" imprime só o código de barras.
- [ ] Modo Operação: bipar/selecionar a etiqueta de teste abre os 5 critérios; salvar.
- [ ] "Aprovar versão" só habilita com ≥1 teste aprovado.

## 3. Kits
- [ ] Criar item tipo **kit**; em Configurações do item escolher modo (Montado/Virtual).
- [ ] Receita do kit aceita **produtos acabados** como componentes (ex.: 3 velas + caixa).
- [ ] Montado: planejar OP do kit consome componentes e gera o kit.
- [ ] Virtual: disponibilidade do kit = limite dos componentes; pedido com kit virtual, ao reservar/enviar, baixa os **componentes**; pick list e Modo Operação mostram os componentes.

## 4. Precificação
- [ ] Tela Precificação lista produtos vendáveis com custo/sugerido/praticado/margem.
- [ ] Drawer: ajustar margem/mão de obra/extras → preço sugerido atualiza; alerta de margem baixa.
- [ ] Salvar preço → reflete em `currentPrice` e aparece no histórico.

## 5. Contagem de estoque
- [ ] "Nova contagem" cria com esperado = físico de cada item.
- [ ] Digitar contado → divergência exibida; "Salvar" persiste.
- [ ] "Aplicar ajustes" gera movimentos só nas divergências; estoque reflete; status "Ajustada".

## 6. Qualidade (pós-cura)
- [ ] Tela Qualidade lista lotes em cura/revisão.
- [ ] Aprovar → lote vira disponível (transfere cura→vendável).
- [ ] Bloquear → continua indisponível. Perda → movimento de perda na quantidade.

## 7. Exportação CSV
- [ ] Configurações? Não — tela "Exportar dados": baixar CSV de itens/estoque/pedidos/clientes/fornecedores/financeiro.
- [ ] CSV abre no Excel com acentos corretos (UTF-8/BOM, separador `;`).

## 8. Notificações
- [ ] Sino mostra alertas derivados (estoque baixo/zerado, lotes a revisar, pedidos pagos a separar, contas a pagar).
- [ ] Clicar no alerta leva à tela correta.

## 9. Incidentes / devoluções
- [ ] Registrar incidente (não move estoque na criação).
- [ ] "Resolver": escolher impacto (disponível/bloqueado/perda/nenhum) + reembolso → movimento correto + lançamento no financeiro; status "resolved".

## 10. Configurações > Catálogo
- [ ] Criar/renomear unidade e categoria.
- [ ] Unidade padrão (g/kg/...) e itens em uso **não** podem ser excluídos.

## 11. Rastreio público (site separado)
- [ ] `http://localhost:3000/rastreio?token=demorastreio00000000000000000001` mostra pagamento + timeline + transportadora.
- [ ] Consulta por nº `#9999` + e-mail funciona; token inválido = não encontrado.

## Regressão rápida
- [ ] `npm run lint` · `npm run test` · `npm run build` verdes.
- [ ] Dados sobrevivem a recarregar e novo login.
