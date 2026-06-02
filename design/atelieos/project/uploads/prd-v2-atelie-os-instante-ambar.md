# PRD v2 — Ateliê OS: Backoffice Artesanal para Instante Âmbar

> **Versão 2 — otimizada para agente de IA / Codex**  
> Documento criado para orientar o desenvolvimento de um novo projeto do zero.  
> Não assumir existência de código legado. Conversas e documentos anteriores servem apenas como referência conceitual.

---

## 0. Como usar este PRD

Este PRD deve ser usado como fonte principal para implementação do sistema. O objetivo é permitir que um agente de desenvolvimento, como Codex, consiga:

1. entender o produto;
2. criar a arquitetura inicial;
3. modelar o banco de dados;
4. implementar os módulos em ordem segura;
5. preservar regras de negócio essenciais;
6. gerar uma base que futuramente também permita criar um manual de uso para a operadora.

A versão atual é voltada para desenvolvimento. Ela também inclui requisitos para uma documentação interna no próprio sistema, permitindo que a operadora consulte ajuda prática por módulo. Uma versão posterior poderá ser adaptada para manual de uso visual, com linguagem ainda mais simples e apoio gráfico.

---

## 1. Visão geral do produto

### 1.1 Nome provisório

**Ateliê OS**

Nome interno/provisório para o backoffice da Instante Âmbar. O sistema não precisa expor esse nome para clientes finais.

### 1.2 O que é

Um backoffice para uma pequena operação artesanal de velas aromáticas. O sistema deve controlar o ciclo operacional completo do ateliê:

- cadastro de produtos, insumos e embalagens;
- estoque por movimentos, lotes e locais;
- compras e fornecedores;
- receitas/fórmulas;
- planejamento e execução de produção;
- cura, revisão e liberação de lotes;
- pedidos manuais e pedidos de canais externos;
- separação de produtos;
- conferência com scanner ou manual;
- embalagem;
- cálculo de frete;
- etiquetas internas;
- anexos de etiquetas externas;
- financeiro gerencial;
- geração de textos com IA;
- preparação futura para integrações com marketplaces.

### 1.3 O que não é

O MVP não é:

- loja online pública;
- clone do Upseller;
- sistema fiscal;
- PDV completo;
- CRM completo;
- emissor de nota fiscal;
- integrador omnichannel completo;
- ferramenta de publicação automática em Instagram;
- ferramenta de geração de imagens ou vídeos;
- sistema contábil.

### 1.4 Objetivo principal

Dar à operadora da Instante Âmbar uma forma simples e confiável de responder:

- o que tenho em estoque?
- o que está faltando?
- o que preciso comprar?
- o que consigo produzir hoje?
- quais materiais preciso separar para uma produção?
- quais lotes estão em cura?
- quais lotes estão liberados para venda?
- quais pedidos estão pagos?
- quais pedidos precisam ser separados?
- quais pedidos precisam ser embalados?
- quanto custa enviar um pedido?
- qual etiqueta ou documento pertence a cada pedido?
- qual foi o custo real de um produto?
- qual texto posso usar para vender ou divulgar este produto?

---

## 2. Contexto da marca

A Instante Âmbar é uma marca artesanal de velas aromáticas com território emocional forte. A comunicação da marca gira em torno de:

- calmaria;
- paz;
- aconchego;
- autocuidado;
- pausa;
- refúgio;
- luz;
- memória olfativa;
- presente com carinho;
- sofisticação serena;
- linguagem poética e acessível.

O produto físico precisa sustentar a promessa de marca. Por isso, o sistema deve valorizar:

- consistência entre lotes;
- controle de formulação;
- controle de cura;
- registro de testes;
- rastreabilidade do que foi enviado para cada cliente;
- experiência de embalagem e unboxing;
- textos de venda coerentes com a voz da marca.

---

## 3. Princípios de desenvolvimento

### 3.1 Backoffice primeiro

A loja online poderá ser construída no futuro. O MVP deve priorizar operação interna.

### 3.2 Scanner é acelerador, não dependência

Toda ação feita por scanner deve ter alternativa manual por teclado, mouse ou touch.

Regra obrigatória:

```txt
Toda ação feita por scanner deve ter uma alternativa equivalente por mouse/teclado.
O scanner acelera o fluxo, mas nunca deve ser obrigatório para concluir uma operação.
```

### 3.3 Melhor Envio é opcional

O sistema deve estar pronto para funcionar com Melhor Envio, mas a integração só deve operar após autenticação/configuração dentro do backoffice.

Se Melhor Envio não estiver configurado, o sistema deve continuar permitindo:

- frete manual;
- rastreio manual;
- anexar etiqueta PDF externa;
- imprimir etiqueta anexada;
- concluir pedidos normalmente.

### 3.4 Marketplaces são preparados, não completos

O MVP deve preparar o terreno para TikTok Shop, Mercado Livre e Shopee, mas sem implementar integração completa no primeiro momento.

O MVP deve permitir:

- cadastrar canal externo;
- registrar pedido manual com número externo;
- importar CSV/planilha;
- mapear SKU externo para produto interno;
- anexar etiqueta PDF baixada manualmente;
- imprimir etiqueta anexada;
- salvar rastreio manual;
- manter histórico de origem do pedido.

Fora do MVP:

- sincronização automática de estoque;
- publicação de anúncios;
- atualização de preço;
- integração com chat/reclamações;
- cancelamento/reembolso via API;
- fiscal/nota;
- omnichannel completo.

### 3.5 IA somente textual

O sistema pode usar IA apenas para gerar ou reescrever textos.

Proibido no escopo atual:

- geração de imagem;
- geração de vídeo;
- publicação automática;
- criação de layout visual;
- edição de arte;
- agendamento de posts;
- análise automática de engajamento.

### 3.6 Produto em cura não é disponível

Velas podem estar fisicamente prontas, mas ainda não disponíveis.

O sistema deve diferenciar:

- físico;
- reservado;
- disponível;
- bloqueado;
- em cura;
- aguardando revisão;
- liberado para venda.

### 3.7 Estoque por movimentos

Não editar saldo diretamente. Todo saldo deve ser consequência de movimentos.

Movimentos possíveis:

- compra/entrada;
- ajuste positivo;
- ajuste negativo;
- perda;
- reserva;
- liberação de reserva;
- consumo de produção;
- saída de produção;
- envio de pedido;
- retorno/devolução;
- bloqueio;
- liberação;
- transferência entre locais.

---

## 4. Stack recomendada

### 4.1 Frontend e aplicação

- Next.js App Router;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- React Hook Form;
- Zod;
- TanStack Table para tabelas complexas;
- Server Actions ou Route Handlers, conforme necessidade;
- PWA opcional para evolução futura.

### 4.2 Banco e autenticação

- PostgreSQL via Neon;
- Drizzle ORM;
- Better Auth ou equivalente;
- multiusuário desde o MVP;
- single-company na interface inicial;
- modelagem com `company_id` para permitir evolução white-label.

### 4.3 Arquivos

Criar abstração de storage para:

- etiquetas anexadas;
- PDFs gerados;
- comprovantes;
- arquivos de importação;
- logs de importação;
- documentos de envio;
- possíveis fotos de pedido embalado.

Em desenvolvimento, pode usar storage local. Em produção, preferir S3/R2 ou equivalente.

### 4.4 PDFs e impressão

O MVP pode gerar PDFs por:

- HTML + print do navegador;
- biblioteca de PDF;
- rota de renderização específica.

As etiquetas internas devem usar Code128.

ZPL direto fica fora do MVP.

---

## 5. Papéis e permissões

### 5.1 Roles

- `owner` — acesso total;
- `admin` — acesso operacional completo;
- `operator` — produção, estoque, pedidos, separação, embalagem;
- `finance` — financeiro, compras e relatórios financeiros;
- `readonly` — leitura.

### 5.2 Matriz de permissões

| Módulo | owner | admin | operator | finance | readonly |
|---|---|---|---|---|---|
| Dashboard | sim | sim | sim | sim | sim |
| Itens/SKUs | sim | sim | leitura | leitura | leitura |
| Estoque | sim | sim | sim | leitura | leitura |
| Compras | sim | sim | sim | sim | leitura |
| Fornecedores | sim | sim | leitura | sim | leitura |
| Receitas | sim | sim | leitura | leitura | leitura |
| Produção | sim | sim | sim | não | leitura |
| Pedidos | sim | sim | sim | leitura | leitura |
| Frete/Envio | sim | sim | sim | leitura | leitura |
| Financeiro | sim | sim | não | sim | leitura |
| IA Conteúdo | sim | sim | sim | não | leitura |
| Etiquetas | sim | sim | sim | não | leitura |
| Configurações | sim | parcial | não | não | não |
| Auditoria | sim | sim | não | não | não |

---

## 6. Sistema de códigos numéricos e etiquetas

### 6.1 Objetivo

Criar códigos internos padronizados, numéricos e de tamanho fixo para facilitar leitura por scanner, validação e operação sem teclado.

### 6.2 Padrão de código

Usar códigos internos de **12 dígitos numéricos**.

Formato:

```txt
TTSSNNNNNNNC
```

Onde:

- `TT` = tipo principal;
- `SS` = subtipo;
- `NNNNNNN` = sequência;
- `C` = dígito verificador.

Exemplo:

```txt
010300001287
```

### 6.3 Tipos principais

| Prefixo | Tipo |
|---|---|
| 01 | Item / SKU |
| 02 | Lote |
| 03 | Ordem de produção |
| 04 | Pedido |
| 05 | Localização |
| 06 | Volume / caixa |
| 07 | Ação de processo |
| 08 | Quantidade / comando auxiliar |
| 09 | Código externo/importado |

### 6.4 Subtipos de item

| Código | Tipo |
|---|---|
| 0101 | Matéria-prima |
| 0102 | Embalagem |
| 0103 | Produto acabado |
| 0104 | Kit |
| 0105 | Auxiliar |

### 6.5 Subtipos de lote

| Código | Tipo |
|---|---|
| 0201 | Lote de matéria-prima |
| 0202 | Lote de embalagem |
| 0203 | Lote de produto acabado |
| 0204 | Lote bloqueado/quarentena |
| 0205 | Lote vencido/expirado |

O código do lote não deve mudar quando o status muda. O status é dado do banco.

### 6.6 Subtipos de ordem de produção

| Código | Tipo |
|---|---|
| 0301 | OP normal |
| 0302 | OP de teste |
| 0303 | Reprocesso |
| 0304 | Montagem de kit |

### 6.7 Subtipos de pedido

| Código | Tipo |
|---|---|
| 0401 | Pedido manual |
| 0402 | Pedido Instagram/WhatsApp |
| 0403 | Pedido marketplace |
| 0404 | Pedido feira/presencial |
| 0405 | Pedido teste/interno |

### 6.8 Subtipos de localização

| Código | Tipo |
|---|---|
| 0501 | Prateleira |
| 0502 | Caixa organizadora |
| 0503 | Bancada |
| 0504 | Área de cura |
| 0505 | Expedição |
| 0506 | Produtos bloqueados |
| 0507 | Estoque de embalagens |

### 6.9 Ações de processo

| Código base | Grupo |
|---|---|
| 0701 | Ações de produção |
| 0702 | Ações de pedido |
| 0703 | Ações de estoque |
| 0704 | Ações de embalagem |
| 0705 | Ações de envio |
| 0706 | Ações de qualidade |

Exemplos de ações iniciais:

| Código | Ação |
|---|---|
| 070100000001 | Separar materiais da produção |
| 070100000002 | Iniciar produção |
| 070100000003 | Enviar para cura |
| 070100000004 | Liberar lote pós-cura |
| 070200000001 | Iniciar separação de pedido |
| 070200000002 | Conferir pedido |
| 070400000001 | Iniciar embalagem |
| 070500000001 | Marcar pronto para envio |
| 070600000001 | Bloquear item/lote |
| 070600000002 | Liberar item/lote |

### 6.10 Dígito verificador

Implementar dígito verificador simples, preferencialmente módulo 10/Luhn ou equivalente.

Se o código lido não passar na validação, bloquear com mensagem clara:

```txt
Código inválido ou leitura incompleta.
```

### 6.11 Code128

Usar Code128 para impressão operacional.

### 6.12 Separar SKU humano de código interno

Cada item deve ter:

- SKU humano, exemplo: `VEL-LAV-156`;
- código interno numérico, exemplo: `010300001287`.

O usuário vê os dois. O scanner usa o código numérico.

---

## 7. Módulos do MVP

## 7.1 Dashboard — “Hoje no ateliê”

### Objetivo

Ser uma central de tarefas do dia. O dashboard deve mostrar o que precisa ser feito agora.

### Cards obrigatórios

- Pedidos aguardando pagamento;
- Pedidos pagos a separar;
- Pedidos separados a embalar;
- Pedidos prontos para envio;
- Produções aguardando material;
- Produções em andamento;
- Lotes em cura;
- Lotes para revisar/liberar;
- Itens abaixo do mínimo;
- Contas a pagar vencendo;
- Conteúdos IA recentes, opcional.

### Ações rápidas

- Novo pedido;
- Nova produção;
- Receber compra;
- Ajustar estoque;
- Abrir modo operação;
- Calcular frete;
- Gerar conteúdo IA;
- Imprimir etiquetas.

### Critérios de aceite

- Ao entrar no sistema, a usuária deve conseguir ver as pendências prioritárias sem navegar por vários módulos.
- Cada card deve ter link para a tela filtrada correspondente.
- Se não houver pendências, exibir estado vazio positivo.

---

## 7.2 Configuração inicial guiada

### Objetivo

Ajudar a operadora a configurar o sistema sem partir de tela vazia.

### Checklist inicial

1. Criar empresa;
2. Configurar dados do ateliê;
3. Configurar locais de estoque;
4. Configurar unidades de medida;
5. Cadastrar fornecedores;
6. Cadastrar matérias-primas;
7. Cadastrar embalagens;
8. Cadastrar produtos prontos;
9. Criar primeira receita;
10. Receber primeira compra;
11. Planejar primeira produção;
12. Criar primeiro pedido;
13. Imprimir primeiras etiquetas;
14. Configurar Melhor Envio, opcional;
15. Configurar voz da marca para IA, opcional.

### Critérios de aceite

- Checklist deve aparecer até ser concluído ou dispensado.
- Etapas opcionais devem estar marcadas como opcionais.
- Cada etapa deve levar à tela correta.

---

## 7.3 Itens / SKUs

### Objetivo

Cadastrar tudo que pode ser comprado, consumido, produzido, vendido ou rastreado.

### Tipos de item

- Matéria-prima;
- Embalagem;
- Produto acabado;
- Kit;
- Auxiliar.

### Campos

- nome;
- SKU humano;
- código interno numérico;
- tipo;
- categoria;
- unidade base;
- local padrão;
- estoque mínimo;
- controla lote;
- possui validade;
- custo estimado;
- custo médio;
- preço de venda sugerido;
- preço de venda atual;
- peso do produto;
- dimensões do produto;
- peso embalado;
- dimensões embalado;
- produto frágil;
- permite venda;
- status: ativo, arquivado, bloqueado;
- observações.

### Exemplos de SKU humano

- `VEL-LAV-156` — Vela Lavanda Francesa 156ml;
- `VEL-CAP-156` — Vela Capim Limão 156ml;
- `ESS-LAV-FR` — Essência Lavanda Francesa;
- `VID-NAD-156` — Vidro Nadir 156ml;
- `TMP-PIN-052` — Tampa pinus 52mm;
- `CXA-KFT-121212` — Caixa kraft 12x12x12.

### Ações

- criar item;
- editar item;
- arquivar item;
- bloquear item;
- imprimir etiqueta;
- ver estoque;
- ver movimentos;
- ver receitas relacionadas;
- ver histórico.

### Critérios de aceite

- Todo item criado deve receber código interno numérico válido.
- SKU humano deve ser único por empresa.
- Código interno deve ser único por empresa.
- Itens arquivados não devem aparecer em seletores operacionais, mas devem continuar visíveis em histórico.

---

## 7.4 Estoque

### Objetivo

Controlar saldos reais por movimento, lote e local.

### Saldos por item

- físico;
- reservado;
- disponível;
- bloqueado;
- em cura;
- aguardando revisão;
- liberado;
- mínimo;
- cobertura estimada.

### Movimentos

- compra/entrada;
- ajuste positivo;
- ajuste negativo;
- perda;
- reserva;
- liberação de reserva;
- consumo de produção;
- saída de produção;
- envio de pedido;
- retorno/devolução;
- bloqueio;
- liberação;
- transferência entre locais.

### Locais

- prateleira;
- caixa organizadora;
- bancada de produção;
- área de cura;
- bancada de embalagem;
- expedição;
- produtos bloqueados;
- estoque de embalagens.

Cada local deve ter código interno numérico e etiqueta imprimível.

### Ajuste de estoque

Não permitir editar saldo diretamente. Deve criar movimento com motivo.

Motivos:

- contagem física;
- perda/quebra;
- erro de lançamento;
- vencimento;
- teste;
- uso interno;
- outro.

### Critérios de aceite

- Nenhum saldo deve ser editado diretamente.
- Movimentos que deixariam saldo negativo devem ser bloqueados, exceto se houver regra explícita de permissão administrativa.
- Histórico de movimentos deve mostrar origem, usuário e data.

---

## 7.5 Compras e fornecedores

### Fornecedores

Campos:

- nome;
- documento;
- telefone;
- WhatsApp;
- e-mail;
- site;
- endereço;
- prazo médio;
- pedido mínimo;
- observações;
- status.

### Receber compra

Fluxo:

1. selecionar fornecedor ou criar novo;
2. informar data;
3. adicionar itens;
4. informar quantidade;
5. informar unidade;
6. informar custo unitário;
7. calcular custo total;
8. informar lote do fornecedor, opcional;
9. informar validade, opcional;
10. selecionar local destino;
11. adicionar observações;
12. criar lotes internos;
13. criar movimentos de entrada;
14. permitir imprimir etiquetas dos lotes recebidos;
15. opcionalmente criar despesa no financeiro.

### Reversão

Permitir reversão somente para `admin` ou `owner` e apenas se os lotes ainda não foram consumidos.

### Critérios de aceite

- Receber compra deve atualizar estoque por movimento.
- Itens com controle de lote devem gerar lote.
- Deve ser possível imprimir etiquetas dos lotes recém-criados.

---

## 7.6 Receitas / Fórmulas

### Objetivo

Registrar como um produto acabado ou kit é produzido.

### Campos da receita

- produto final;
- nome da receita;
- versão;
- rendimento;
- unidade de rendimento;
- status: rascunho, ativa, arquivada;
- observações;
- custo estimado;
- custo por unidade;
- perda estimada;
- tempo de cura padrão;
- tempo de produção estimado.

### Componentes

Cada componente deve ter:

- item;
- quantidade;
- unidade;
- percentual de perda;
- obrigatório/opcional;
- observações.

### Versionamento

Quando uma receita ativa for alterada, criar nova versão. Produções antigas devem manter referência à versão usada.

### Testes de receita

Campos:

- data;
- quantidade produzida;
- observações de aroma;
- observações de queima;
- observações de acabamento;
- aprovado/reprovado/ajustar;
- próximos ajustes.

### Critérios de aceite

- Receita ativa usada em produção não deve ser sobrescrita.
- Produção deve guardar referência à versão da receita.
- Custo estimado deve ser calculado a partir dos componentes.

---

## 7.7 Produção

### Objetivo

Transformar insumos em produtos prontos, com controle de material, lote, cura, perdas e liberação.

### Status sugeridos

- Planejada;
- Aguardando materiais;
- Materiais separados;
- Em produção;
- Em cura;
- Aguardando revisão;
- Liberada;
- Finalizada;
- Bloqueada;
- Cancelada.

### Criar ordem de produção

Campos:

- receita;
- quantidade planejada;
- lote/código da OP;
- data planejada;
- responsável;
- observações.

Ao criar OP:

- não consumir estoque ainda;
- calcular materiais necessários;
- mostrar faltantes;
- permitir gerar pick list de produção;
- permitir imprimir PDF da OP.

### Separação de materiais

Pode ser feita:

- por scanner;
- por modo operação manual;
- por pick list impressa e confirmação posterior.

Validações:

- item escaneado deve pertencer à receita;
- lote não pode estar bloqueado/vencido;
- quantidade não pode exceder necessário sem confirmação;
- estoque não pode ficar negativo.

### Finalização de produção

Campos:

- quantidade produzida;
- quantidade aprovada;
- quantidade perdida;
- motivo de perda;
- lote gerado;
- local destino;
- data de cura até;
- observações.

Ao finalizar:

- consumir insumos por FIFO/FEFO;
- criar lote de produto acabado;
- criar movimentos de saída de insumo;
- criar movimento de entrada de produto acabado;
- se houver cura, status do lote deve ser `em cura`, não `disponível`.

### Liberação pós-cura

Fluxo:

1. lote atinge data de cura;
2. aparece em pendências;
3. usuária revisa;
4. pode liberar, bloquear ou estender cura;
5. ao liberar, entra como disponível.

### Critérios de aceite

- OP não consome estoque ao ser criada.
- Consumo ocorre na finalização ou em etapa explícita definida.
- Produto em cura não deve aparecer como disponível para pedido.
- Deve ser possível rastrear quais lotes de insumos foram usados em qual lote produzido.

---

## 7.8 Pedidos

### Objetivo

Registrar pedidos manuais e pedidos de canais externos, reservando estoque e conduzindo separação, embalagem e envio.

### Canais iniciais

- Instagram;
- WhatsApp;
- Feira/presencial;
- Mercado Livre;
- Shopee;
- TikTok Shop;
- Venda direta;
- Outro.

### Campos do pedido

- número interno;
- código numérico interno;
- canal;
- número externo, opcional;
- cliente;
- status do pedido;
- status de pagamento;
- itens;
- frete;
- desconto;
- taxa do canal;
- total;
- observações;
- endereço de entrega;
- documentos anexos;
- rastreio;
- etiqueta de envio;
- histórico.

### Status sugeridos

- Novo;
- Aguardando pagamento;
- Pago;
- A separar;
- Separando;
- Separado;
- Embalando;
- Embalado;
- Pronto para envio;
- Enviado;
- Entregue;
- Cancelado;
- Bloqueado.

### Reserva de estoque

Configuração por empresa:

- reservar ao criar pedido;
- reservar ao marcar como pago;
- reservar ao iniciar separação;
- reservar manualmente.

Baixa definitiva:

- ao marcar como enviado;
- ao marcar como entregue;
- manualmente.

### Critérios de aceite

- Pedido deve poder existir sem frete calculado.
- Pedido externo deve guardar canal e número externo.
- Cancelar pedido não enviado deve liberar reserva.
- Pedido enviado não deve ser cancelado sem fluxo administrativo específico.

---

## 7.9 Pick list de pedidos

### Objetivo

Consolidar o que precisa ser separado para um ou vários pedidos.

### Criar pick list

Pode ser criada por:

- pedido individual;
- seleção de vários pedidos;
- filtro de pedidos pagos e não separados;
- canal;
- data;
- status.

### Conteúdo

- código da pick list;
- pedidos incluídos;
- produtos consolidados;
- quantidades;
- local sugerido;
- lote sugerido, se aplicável;
- embalagens necessárias;
- responsável;
- data;
- código de barras da pick list.

### PDF de pick list de pedidos

Gerar PDF A4 com:

- cabeçalho;
- código da pick list;
- lista de pedidos;
- checklist de produtos;
- checklist de embalagens;
- locais;
- espaço para assinatura/responsável;
- observações.

### Critérios de aceite

- Pick list deve consolidar itens repetidos de múltiplos pedidos.
- Deve permitir imprimir PDF.
- Deve permitir abrir modo operação a partir da pick list.

---

## 7.10 Pick list de produção

### Objetivo

Gerar lista de materiais necessários para uma ordem de produção.

### Conteúdo

- código da OP;
- produto final;
- receita e versão;
- quantidade planejada;
- materiais necessários;
- quantidades;
- lotes sugeridos;
- locais sugeridos;
- etapas da produção;
- observações.

### PDF de pick list de produção

Gerar PDF A4 com:

- dados da OP;
- checklist de materiais;
- checklist de etapas;
- espaço para perdas;
- espaço para observações;
- código de barras da OP.

### Critérios de aceite

- PDF deve ser claro para uso na bancada.
- Deve indicar faltantes antes de autorizar produção.
- Deve respeitar unidade de medida dos componentes.

---

## 7.11 Modo Operação / Mesa de Conferência

### Objetivo

Executar separação e conferência com scanner ou manualmente, em tela cheia.

### Modos

- Separação de pedidos;
- Conferência de pedidos;
- Embalagem;
- Expedição;
- Separação de produção;
- Conferência de produção;
- Contagem de estoque.

### Abertura

Pode abrir:

- pelo dashboard;
- pela tela de pedidos;
- pela tela de produção;
- pela tela de estoque;
- pela tela de pick list.

Se aberto a partir de pedido ou OP, já carregar o documento correspondente.

### Entrada rápida

Deve haver campo com foco permanente:

- scanner envia código + Enter;
- usuário pode digitar código, SKU, nome ou número;
- usuário pode buscar manualmente.

### Alternativas manuais

Cada ação de scanner deve ter botão equivalente:

- `+1`;
- `-1`;
- marcar completo;
- selecionar lote;
- informar quantidade;
- desfazer última ação;
- finalizar etapa;
- bloquear;
- sair.

### Feedback de tela

Exibir:

- documento ativo;
- progresso;
- itens esperados;
- itens já conferidos;
- última leitura;
- erro atual;
- histórico recente.

### Erros

Mensagens claras para:

- código inválido;
- item não pertence à lista;
- quantidade excedida;
- lote bloqueado;
- lote vencido;
- produto em cura;
- pedido já conferido;
- OP já finalizada;
- estoque insuficiente.

### Critérios de aceite

- Deve ser possível concluir fluxo inteiro sem scanner.
- Deve ser possível concluir fluxo inteiro sem teclado, usando scanner e códigos de ação.
- Erros devem bloquear avanço indevido.
- Última ação deve poder ser desfeita se ainda não finalizada.

---

## 7.12 Embalagem e checklist

### Objetivo

Garantir que cada pedido seja embalado corretamente.

### Checklist padrão

- produto correto;
- aroma correto;
- vidro sem defeito;
- tampa correta;
- etiqueta inferior aplicada;
- dust cover aplicado;
- cartão incluído;
- proteção kraft/colmeia;
- caixa fechada;
- etiqueta de envio aplicada;
- foto do pedido, opcional.

### Ações

- marcar item do checklist;
- anexar etiqueta;
- imprimir etiqueta;
- registrar observação;
- marcar como embalado;
- mover para pronto para envio.

### PDF

Gerar PDF de checklist do pedido com:

- pedido;
- cliente;
- canal;
- itens;
- checklist;
- rastreio, se houver;
- espaço para assinatura/conferência.

### Critérios de aceite

- Pedido não deve ir para “pronto para envio” se checklist obrigatório estiver incompleto, a menos que admin force com motivo.

---

## 7.13 Frete e Melhor Envio

### Objetivo

Permitir cotar e registrar frete de forma rápida, com Melhor Envio opcional.

### Comportamento sem Melhor Envio

Se não configurado:

- exibir status “Melhor Envio não configurado”;
- permitir frete manual;
- permitir rastreio manual;
- permitir anexar etiqueta PDF externa;
- não bloquear pedido.

### Comportamento com Melhor Envio configurado

Se autenticado:

- permitir cotação de frete;
- salvar cotações;
- selecionar opção;
- salvar valor escolhido no pedido;
- opcionalmente comprar etiqueta;
- opcionalmente imprimir etiqueta;
- salvar rastreio;
- acompanhar status, se implementado.

### MVP obrigatório

- tela de configuração/autenticação;
- status de conexão;
- calculadora avulsa de frete;
- cotação de frete dentro do pedido;
- salvar cotação escolhida;
- fallback manual.

### Fase futura

- compra de etiqueta;
- pagamento de etiqueta;
- impressão de etiqueta oficial;
- rastreio automático;
- cancelamento de etiqueta;
- logística reversa.

### Dados logísticos por produto

- peso do produto;
- peso embalado;
- altura;
- largura;
- comprimento;
- embalagem sugerida;
- frágil;
- permite empilhar.

### Modelos de embalagem

Campos:

- nome;
- altura;
- largura;
- comprimento;
- peso da embalagem;
- custo da embalagem;
- capacidade sugerida;
- observações.

### Calculadora avulsa

Campos:

- produto;
- quantidade;
- CEP destino;
- embalagem;
- peso/dimensões calculados;
- botão calcular;
- opções retornadas;
- copiar mensagem para WhatsApp.

### Critérios de aceite

- Sistema deve funcionar completamente sem autenticação do Melhor Envio.
- Se a API falhar, o usuário deve conseguir preencher frete manualmente.
- Cotação salva deve ficar vinculada ao pedido.

---

## 7.14 Marketplaces e canais externos

### Objetivo

Preparar o sistema para canais externos sem implementar integração completa.

### MVP

- cadastrar canal de venda;
- pedido manual com número externo;
- importar CSV;
- mapear SKU externo para item interno;
- salvar payload bruto da importação;
- mostrar pendências de importação;
- anexar etiqueta PDF;
- imprimir etiqueta anexada;
- salvar rastreio manual;
- logar origem do pedido.

### Pendências de importação

Tela deve mostrar:

- pedidos com SKU desconhecido;
- pedidos com estoque insuficiente;
- pedidos duplicados;
- pedidos com dados inválidos;
- ações para resolver.

### Mapeamento de SKU externo

Permitir mapear:

- SKU Mercado Livre;
- SKU Shopee;
- SKU TikTok Shop;
- outros códigos externos;
- para item interno.

### Fora do MVP

- OAuth/API real com Mercado Livre/Shopee/TikTok Shop;
- sincronização automática de estoque;
- publicação de anúncios;
- atualização de preço;
- chat;
- reclamações;
- reembolso;
- fiscal.

### Critérios de aceite

- Importação CSV não deve criar pedidos duplicados.
- Pedidos com SKU desconhecido devem ficar em pendência, não falhar silenciosamente.
- Deve ser possível resolver mapeamento uma vez e reaproveitar nas próximas importações.

---

## 7.15 IA de conteúdo textual

### Objetivo

Ajudar a criar textos comerciais e operacionais coerentes com a marca.

### Escopo

Somente texto.

### Tipos de conteúdo

- descrição curta de produto;
- descrição longa de produto;
- legenda de Instagram;
- mensagem de WhatsApp;
- texto de cartão;
- slogan curto;
- ideias de stories em texto;
- reescrita de conteúdo;
- naming auxiliar;
- campanha textual.

### Voz da marca

Criar configuração com:

- personalidade;
- promessa;
- público;
- palavras preferidas;
- palavras proibidas;
- tom padrão;
- instruções de segurança;
- claims proibidos.

Valores iniciais:

- personalidade: acolhedora, sofisticada, serena, poética, minimalista;
- promessa: transformar o fim do dia em um ritual de paz e autocuidado;
- público: mulheres adultas, rotina corrida, buscam aconchego e autocuidado;
- palavras preferidas: pausa, respiro, aconchego, calmaria, refúgio, cuidado, aroma, luz;
- evitar: compre agora, promoção imperdível, cura, terapêutico, garantido, milagroso.

### Contexto usado pela IA

Usar dados estruturados:

- nome do produto;
- aroma;
- coleção;
- descrição interna;
- notas olfativas;
- ingredientes relevantes;
- categoria;
- preço, se aplicável;
- ocasião de uso;
- tom da marca;
- briefing manual da usuária.

### Proibições

A IA não deve inventar:

- tempo de queima;
- benefícios terapêuticos;
- composição exata;
- certificações;
- propriedades médicas;
- informações de segurança não cadastradas.

### Templates de geração

- descrição de catálogo;
- legenda de lançamento;
- post de reposição;
- mensagem de pós-venda;
- texto de cartão;
- campanha de data comemorativa.

### Templates de mensagem

Permitir variáveis:

- `{{cliente}}`;
- `{{pedido}}`;
- `{{produto}}`;
- `{{total}}`;
- `{{prazo}}`;
- `{{rastreio}}`;
- `{{forma_pagamento}}`;
- `{{data_retirada}}`.

### Histórico

Salvar:

- produto relacionado;
- receita relacionada, opcional;
- tipo;
- template usado;
- briefing do usuário;
- contexto usado;
- resultado;
- status: rascunho, aprovado, usado, arquivado;
- favorito;
- criado por;
- criado em.

### Critérios de aceite

- Conteúdo gerado deve poder ser editado antes de salvo como aprovado.
- Deve haver botão copiar.
- Deve haver histórico por produto.
- IA não deve publicar nada automaticamente.

---

## 7.16 Financeiro gerencial

### Objetivo

Controlar entradas, saídas e margem de forma simples, sem caráter fiscal/contábil.

Exibir aviso:

```txt
Este financeiro é gerencial e não substitui contabilidade ou emissão fiscal.
```

### Funcionalidades

- lançar receita;
- lançar despesa;
- vincular pedido;
- vincular compra;
- marcar pago;
- cancelar;
- vencimentos;
- contas a pagar;
- contas a receber;
- resumo mensal;
- margem bruta estimada.

### Categorias iniciais

- Matéria-prima;
- Embalagem;
- Frete;
- Taxas de canal;
- Marketing;
- Equipamentos;
- Assinaturas;
- Manutenção;
- Outros.

### Critérios de aceite

- Receita vinculada a pedido deve respeitar status de pagamento.
- Despesa vinculada a compra deve poder ser marcada como paga.
- Cancelar financeiro não deve apagar histórico.

---

## 7.17 Relatórios simples

### Vendas

- pedidos por período;
- vendas por canal;
- ticket médio;
- produtos mais vendidos;
- clientes recorrentes.

### Produção

- unidades produzidas;
- perdas por lote;
- custo médio por produto;
- produções em atraso;
- lotes bloqueados.

### Estoque

- abaixo do mínimo;
- sem saldo;
- com reserva;
- em cura;
- bloqueado;
- validade próxima;
- cobertura estimada.

### Financeiro

- recebido;
- a receber;
- pago;
- a pagar;
- margem estimada.

### Critérios de aceite

- Relatórios podem começar como tabelas filtráveis.
- Gráficos não são obrigatórios no MVP.

---

## 7.18 Auditoria

### Objetivo

Registrar ações importantes para rastreabilidade.

### Registrar logs para

- criação;
- edição;
- arquivamento;
- ajuste de estoque;
- reversão;
- finalização de produção;
- liberação de lote;
- bloqueio;
- envio de pedido;
- cancelamento;
- importação;
- impressão de etiqueta;
- geração de conteúdo IA.

### Campos do log

- empresa;
- usuário;
- entidade;
- ID da entidade;
- ação;
- origem: manual, scanner, importação, sistema, IA;
- antes;
- depois;
- timestamp.

### Critérios de aceite

- Ações críticas devem gerar log.
- Logs não devem ser editáveis por usuários comuns.

---


## 7.19 Precificação e margem

### Objetivo

Permitir que a operadora calcule preços com base em custo real, margem desejada, taxa do canal, embalagem, perda e outros custos indiretos. O sistema deve ajudar a evitar vendas com prejuízo.

### Conceitos

- **Custo de produção:** soma de insumos consumidos pela receita/fórmula.
- **Custo de embalagem:** caixa, etiqueta, cartão, proteção, adesivos, brindes e demais materiais de envio/unboxing.
- **Custo de mão de obra:** campo opcional. Pode ser por unidade, por lote ou percentual.
- **Perda estimada:** percentual ou valor previsto para perdas de produção.
- **Taxa do canal:** comissão ou custo fixo de Instagram/manual, Shopee, Mercado Livre, TikTok Shop, feira etc.
- **Margem desejada:** margem mínima definida pela empresa.
- **Preço sugerido:** preço calculado pelo sistema.
- **Preço praticado:** preço final que a usuária decidiu cobrar.

### Entradas necessárias

Em cada produto vendável:

- custo estimado da receita ativa;
- custo médio real de produção, quando houver histórico;
- custo de embalagem padrão;
- preço atual de venda;
- margem mínima desejada;
- margem atual calculada;
- canal padrão de venda, opcional.

Em cada canal de venda:

- taxa percentual;
- taxa fixa por pedido;
- taxa fixa por item, opcional;
- observações;
- se a taxa entra ou não no cálculo de margem.

### Fluxo de cálculo

```txt
Produto → Receita ativa → Custo de materiais
        → Embalagem padrão
        → Perda estimada
        → Taxas do canal
        → Margem desejada
        → Preço sugerido
```

### Tela de precificação

A tela deve permitir:

- selecionar produto;
- ver custo estimado por unidade;
- ver custo real médio por lote, se houver;
- simular canal de venda;
- simular margem desejada;
- simular preço final;
- salvar preço praticado;
- registrar histórico de alteração de preço;
- alertar se preço praticado estiver abaixo do preço mínimo recomendado.

### Exemplo

```txt
Produto: Vela Lavanda Francesa 156ml
Custo receita: R$ 18,40
Custo embalagem: R$ 6,20
Perda estimada: R$ 1,50
Taxa canal: R$ 0,00
Custo total estimado: R$ 26,10
Margem desejada: 60%
Preço mínimo sugerido: R$ 65,25
Preço praticado: R$ 75,00
Margem estimada: OK
```

### Regras

- O sistema não deve alterar preço automaticamente sem confirmação.
- O sistema deve permitir preço manual, mesmo abaixo do sugerido, mas deve exibir alerta.
- Alteração de preço deve gerar histórico.
- Preço por canal pode ser diferente, mas no MVP pode ser apenas simulação.
- O custo real de produção deve prevalecer sobre custo estimado quando houver lote finalizado.

### Critérios de aceite

- Deve ser possível calcular preço sugerido para produto com receita ativa.
- Deve ser possível simular taxa por canal.
- Deve ser possível salvar preço praticado.
- Deve haver alerta de margem baixa.
- Deve haver histórico de alterações de preço.

---

## 7.20 Ocorrências, trocas, devoluções e problemas de pedido

### Objetivo

Registrar problemas pós-venda e dar tratamento correto a cancelamentos, quebras, trocas, devoluções e reembolsos manuais sem quebrar a rastreabilidade do estoque.

### Tipos de ocorrência

- cancelamento solicitado;
- produto chegou quebrado;
- produto errado enviado;
- item faltante;
- atraso no envio;
- endereço incorreto;
- troca solicitada;
- devolução;
- reembolso manual;
- reclamação;
- observação interna.

### Estados da ocorrência

- aberta;
- em análise;
- aguardando cliente;
- resolvida;
- cancelada.

### Regras de estoque

- Pedido ainda não enviado pode ser cancelado e liberar reserva.
- Pedido enviado não deve ser simplesmente cancelado. Deve abrir ocorrência.
- Devolução pode gerar retorno de estoque como:
  - disponível;
  - bloqueado para revisão;
  - perda;
  - descarte.
- Produto quebrado não deve voltar ao estoque disponível.
- Reembolso manual deve ser registrado no financeiro, mas não precisa integrar gateway.

### Tela de ocorrência

Campos:

- pedido relacionado;
- cliente;
- tipo;
- descrição;
- responsável;
- status;
- ação tomada;
- impacto financeiro;
- impacto no estoque;
- anexos, opcional;
- data de resolução.

### Ações possíveis

- abrir ocorrência;
- registrar resposta ao cliente;
- marcar como resolvida;
- registrar perda;
- registrar devolução;
- gerar novo envio;
- registrar reembolso manual;
- bloquear item/lote relacionado.

### Critérios de aceite

- Deve ser possível abrir ocorrência a partir de um pedido.
- Deve ser possível definir se a ocorrência impacta estoque.
- Deve ser possível registrar devolução como disponível, bloqueada ou perda.
- Deve haver histórico da ocorrência.
- A ocorrência deve aparecer no dashboard enquanto estiver aberta.

---

## 7.21 Controle de qualidade

### Objetivo

Garantir que lotes produzidos sejam revisados antes de serem liberados para venda, especialmente porque velas precisam de cura, acabamento adequado e consistência de aroma.

### Pontos de qualidade para velas

Checklist sugerido:

- aroma aprovado;
- intensidade do aroma aceitável;
- vidro sem trinca;
- acabamento da cera aprovado;
- pavio centralizado;
- tampa correta;
- etiqueta aplicada corretamente;
- dust cover aplicado, quando houver;
- lote identificado;
- embalagem sem defeito;
- aprovado para venda.

### Estados de qualidade do lote

- aguardando cura;
- aguardando revisão;
- aprovado;
- aprovado com observação;
- bloqueado;
- perda parcial;
- perda total.

### Fluxo

```txt
Finalizar produção
→ cria lote produzido
→ lote entra em cura
→ sistema calcula data de liberação
→ dashboard avisa quando cura terminar
→ usuária revisa checklist de qualidade
→ lote é liberado, bloqueado ou marcado como perda
```

### Regras

- Lote em cura não fica disponível para venda.
- Lote aguardando revisão não fica disponível para venda.
- Lote bloqueado não fica disponível para venda.
- Apenas lote aprovado deve entrar como disponível.
- Perda parcial deve gerar movimento de perda.
- Qualidade deve registrar usuário e data.

### Tela

Dentro do lote produzido:

- informações do lote;
- produto;
- OP de origem;
- data de produção;
- cura até;
- checklist de qualidade;
- campo de observações;
- decisão final;
- botão “Liberar para venda”;
- botão “Bloquear lote”;
- botão “Registrar perda”.

### Critérios de aceite

- Lote produzido deve exigir liberação pós-cura antes de ficar disponível.
- Deve ser possível preencher checklist de qualidade.
- Deve ser possível aprovar, bloquear ou registrar perda.
- Deve haver log de auditoria para liberação e bloqueio.

---

## 7.22 Contagem de estoque

### Objetivo

Permitir conferir o estoque físico por local, item ou categoria, registrando divergências de forma controlada.

### Tipos de contagem

- por localização;
- por item;
- por categoria;
- contagem geral;
- contagem cíclica.

### Fluxo

```txt
Criar contagem
→ escolher local ou itens
→ sistema mostra saldo esperado
→ usuária conta fisicamente
→ informa quantidade contada
→ sistema calcula divergência
→ usuária revisa
→ confirma ajuste com justificativa
```

### Regra principal

Diferença encontrada não deve alterar estoque automaticamente. O usuário deve revisar e confirmar o ajuste.

### Campos

- código da contagem;
- tipo;
- local;
- itens incluídos;
- quantidade esperada;
- quantidade contada;
- divergência;
- motivo da divergência;
- status;
- responsável;
- data de início;
- data de conclusão.

### Estados

- rascunho;
- em contagem;
- aguardando revisão;
- ajustada;
- cancelada.

### Modo scanner/manual

- Scanner pode ler localização e itens.
- Sem scanner, usuário deve conseguir clicar no item e informar quantidade.
- Deve ser possível exportar ou imprimir lista de contagem.

### Critérios de aceite

- Deve ser possível criar contagem por localização.
- Deve ser possível registrar quantidade contada.
- Deve ser possível gerar ajuste apenas após confirmação.
- Ajuste deve gerar movimento de estoque e auditoria.

---

## 7.23 Compras sugeridas e reposição

### Objetivo

Ajudar a operadora a decidir o que comprar antes de faltar material para pedidos ou produções.

### O sistema deve considerar

- estoque físico;
- estoque reservado;
- estoque disponível;
- estoque mínimo;
- pedidos em aberto;
- produções planejadas;
- materiais faltantes;
- consumo médio futuro, opcional;
- fornecedor padrão;
- prazo médio do fornecedor.

### Saída esperada

```txt
Item: Vidro 156ml
Estoque físico: 8
Reservado/necessário: 24
Mínimo: 24
Sugestão: comprar 48 unidades
Fornecedor sugerido: Fornecedor X
Motivo: estoque abaixo do mínimo + produção planejada
```

### Tela

A tela “Reposição” deve exibir:

- itens críticos;
- itens abaixo do mínimo;
- itens necessários para produção;
- itens necessários para pedidos;
- quantidade sugerida;
- fornecedor sugerido;
- botão “Criar compra” ou “Adicionar à lista de compras”.

### Regras

- Sugestão não cria compra automaticamente.
- Usuária pode ajustar quantidade sugerida.
- Deve ser possível ignorar sugestão com justificativa opcional.
- Item sem fornecedor deve aparecer como pendência.

### Critérios de aceite

- Deve sugerir compra quando estoque disponível estiver abaixo do mínimo.
- Deve considerar materiais necessários para OPs planejadas.
- Deve permitir gerar lista de compras.
- Deve mostrar motivo da sugestão.

---

## 7.24 Segurança de integrações, tokens e dados sensíveis

### Objetivo

Garantir que integrações como Melhor Envio, IA e futuros marketplaces sejam implementadas com segurança desde o início.

### Regras obrigatórias

- Tokens de integração devem ser criptografados no banco.
- Chaves de API nunca devem ser expostas no frontend.
- Logs não devem salvar tokens completos.
- Erros de API não devem vazar credenciais.
- Usuário deve poder desconectar integração.
- Deve haver status claro: não configurado, conectado, erro, expirado.
- Integrações devem ser opcionais.

### Melhor Envio

- Se não autenticado, mostrar “não configurado”.
- Se autenticado, habilitar cotação e recursos disponíveis.
- Falha de API deve permitir fallback manual.

### IA

- Chave da API deve ficar apenas no servidor.
- Histórico de prompts deve evitar salvar dados sensíveis desnecessários.
- Conteúdo gerado deve ser editável e nunca publicado automaticamente.

### Marketplaces futuros

- Preparar estrutura para tokens e refresh tokens.
- Tokens devem ter escopo por provedor.
- Sincronizações devem gerar logs.

### Critérios de aceite

- Nenhum token aparece em HTML, logs visíveis ou respostas de API públicas.
- Deve ser possível desconectar uma integração.
- Integração desconectada não quebra o fluxo manual.

---

## 7.25 Exportação, backup e portabilidade de dados

### Objetivo

Permitir que a operadora mantenha controle dos próprios dados e consiga exportar informações importantes em caso de migração, auditoria ou backup manual.

### Exportações mínimas em CSV

- itens;
- estoque atual;
- lotes;
- movimentos de estoque;
- fornecedores;
- clientes;
- compras;
- receitas;
- produções;
- pedidos;
- financeiro;
- conteúdos IA gerados;
- etiquetas geradas, opcional;
- auditoria, apenas owner/admin.

### Regras

- Exportação deve respeitar permissões.
- CSV deve ter cabeçalhos claros em português.
- Datas devem ser exportadas em formato consistente.
- Valores monetários devem ser exportados em formato amigável e, se possível, também numérico.
- Dados sensíveis, como tokens, nunca devem ser exportados.

### Tela

Configurações → Exportar dados.

Opções:

- selecionar tipo de dado;
- selecionar período, quando aplicável;
- baixar CSV;
- baixar pacote completo, opcional futuro.

### Critérios de aceite

- Deve ser possível exportar pelo menos itens, estoque, pedidos e financeiro.
- Exportação não pode incluir credenciais.
- Exportação deve gerar auditoria.

---

## 7.26 Notificações internas e central de alertas

### Objetivo

Mostrar pendências importantes dentro do sistema, sem depender de e-mail, WhatsApp ou push no MVP.

### Tipos de alerta

- item abaixo do mínimo;
- item zerado;
- produção com material faltando;
- lote terminou cura hoje;
- lote aguardando revisão;
- pedido pago ainda não separado;
- pedido parado há X dias;
- pedido com ocorrência aberta;
- conta vencendo;
- conta vencida;
- Melhor Envio desconectado ou com erro;
- importação CSV com pendência;
- SKU externo não mapeado;
- margem baixa em produto;
- etiqueta pendente de impressão.

### Onde exibir

- dashboard “Hoje no ateliê”;
- badge no menu;
- lista de notificações;
- banner contextual dentro do módulo.

### Estados

- não lida;
- lida;
- resolvida;
- ignorada.

### Regras

- Notificação deve levar o usuário para a tela onde resolve o problema.
- Notificações críticas não devem sumir sem ação ou resolução.
- Algumas notificações podem ser geradas dinamicamente, sem tabela persistente.

### Critérios de aceite

- Dashboard deve mostrar pendências prioritárias.
- Deve haver link de ação para resolver pendência.
- Notificações de cura e estoque baixo devem funcionar no MVP.

---

## 7.27 Status técnicos, nomes editáveis e automações

### Objetivo

Permitir que a interface use nomes amigáveis, sem quebrar regras internas do sistema.

### Regra principal

O sistema não deve depender do texto visível do status para executar regras de negócio. Deve depender de chaves técnicas fixas.

### Exemplo

```txt
Nome visível: Em cura
Chave técnica: curing

Nome visível: Aguardando liberação
Chave técnica: awaiting_quality_review
```

### Entidades com status

- pedidos;
- produção;
- lotes;
- pick lists;
- ocorrências;
- financeiro;
- importações;
- etiquetas/documentos.

### Campos sugeridos em `custom_statuses`

- entidade;
- chave técnica;
- nome visível;
- cor;
- ordem;
- se é final;
- se bloqueia disponibilidade;
- automação associada;
- editável;
- ativo.

### Regras

- No MVP, status podem ser seedados e parcialmente editáveis.
- Usuário pode editar nome, cor e ordem, mas não chave técnica.
- Automação deve estar vinculada à chave técnica.
- Excluir status usado em registros históricos deve ser bloqueado.

### Critérios de aceite

- Renomear status não pode quebrar fluxo.
- Deve haver estados padrão para pedidos, produção, lotes e ocorrências.
- Status críticos devem ser protegidos contra exclusão.

---

## 7.28 Documentação e ajuda dentro do sistema

### Objetivo

Criar uma área de ajuda prática dentro do próprio backoffice para que a operadora consiga aprender e consultar como usar cada módulo sem depender de um manual externo.

Esta documentação interna deve servir como base viva para o manual visual que será produzido depois.

### Princípios da documentação interna

- linguagem simples;
- exemplos reais da Instante Âmbar;
- foco em tarefas, não em termos técnicos;
- textos curtos e acionáveis;
- ajuda contextual em cada módulo;
- busca por palavra-chave;
- checklist de primeiros passos;
- glossário de termos.

### Estrutura principal

Criar uma área no menu chamada:

```txt
Ajuda
```

Subáreas:

- Primeiros passos;
- Rotina diária;
- Itens e SKUs;
- Estoque;
- Compras;
- Receitas;
- Produção;
- Pedidos;
- Pick Lists;
- Modo Operação;
- Etiquetas;
- Frete e Melhor Envio;
- Conteúdo IA;
- Financeiro;
- Problemas comuns;
- Glossário.

### Ajuda contextual

Cada módulo deve ter um botão:

```txt
Como usar esta tela?
```

Ao clicar, abrir um drawer/modal lateral com:

- para que serve a tela;
- quando usar;
- passo a passo principal;
- erros comuns;
- links para artigos relacionados.

Exemplo na tela de Receitas:

```txt
Nesta tela você cadastra como cada vela é produzida.
Use receitas para dizer ao sistema quais materiais entram em cada produto e qual é o rendimento esperado.

Passo a passo:
1. Clique em Nova receita.
2. Escolha o produto final.
3. Informe o rendimento.
4. Adicione cera, essência, pavio, vidro, tampa e embalagem.
5. Salve.
```

### Documentação por tarefa

Além de artigos por módulo, a ajuda deve ter guias por tarefa:

- Como cadastrar a primeira vela;
- Como receber uma compra;
- Como imprimir etiquetas;
- Como criar uma receita;
- Como planejar uma produção;
- Como separar materiais;
- Como liberar um lote pós-cura;
- Como criar pedido manual;
- Como separar e embalar pedido;
- Como calcular frete;
- Como gerar texto de Instagram;
- Como resolver estoque divergente;
- Como lidar com produto quebrado.

### Checklist de primeiros passos

No dashboard e na área de ajuda, exibir um checklist:

```txt
[ ] Cadastrar unidades de medida
[ ] Cadastrar locais de estoque
[ ] Cadastrar fornecedores
[ ] Cadastrar matérias-primas
[ ] Cadastrar embalagens
[ ] Cadastrar produtos finais
[ ] Criar primeira receita
[ ] Receber primeira compra
[ ] Planejar primeira produção
[ ] Imprimir primeiras etiquetas
[ ] Criar primeiro pedido
```

Cada item deve levar para a tela correta.

### Estados vazios educativos

Quando uma tela não tiver dados, ela deve ensinar o próximo passo.

Exemplo em Receitas:

```txt
Nenhuma receita cadastrada ainda.
Comece criando a receita da Vela Lavanda Francesa. A receita diz ao sistema quais materiais são usados e ajuda a calcular custo e produção.

[ Criar primeira receita ] [ Ler guia rápido ]
```

### Glossário

Termos mínimos:

- SKU;
- lote;
- OP;
- pick list;
- reserva;
- estoque físico;
- estoque disponível;
- estoque bloqueado;
- cura;
- receita;
- margem;
- canal de venda;
- etiqueta interna;
- etiqueta de envio;
- Melhor Envio;
- ocorrência;
- contagem de estoque.

### Conteúdo da ajuda

O conteúdo pode ser inicialmente seedado em Markdown ou MDX simples.

Cada artigo deve ter:

- título;
- slug;
- módulo;
- resumo;
- conteúdo;
- ordem;
- status: rascunho/publicado;
- tags;
- última atualização.

### Administração da ajuda

No MVP, artigos podem ser seedados no código. Se for simples implementar, permitir edição por owner/admin em tela interna.

### Critérios de aceite

- Deve existir menu Ajuda.
- Cada módulo principal deve ter botão “Como usar esta tela?”.
- Deve existir checklist de primeiros passos.
- Deve existir busca simples na ajuda.
- Estados vazios devem orientar a próxima ação.
- Ajuda deve usar exemplos da Instante Âmbar.

---

## 7.29 Dados de demonstração e seeds de desenvolvimento

### Objetivo

Facilitar desenvolvimento, testes, demonstração e criação futura do manual.

### Seeds mínimos

Empresa:

- Instante Âmbar.

Usuários:

- Dono/admin;
- Operador, opcional;
- Financeiro, opcional.

Itens:

- Vela Lavanda Francesa 156ml;
- Vela Capim Limão 156ml;
- Essência Lavanda Francesa;
- Essência Capim Limão;
- Cera de coco;
- Pavio algodão P;
- Vidro Nadir 156ml;
- Tampa pinus;
- Caixa kraft 12x12x12;
- Cartão de agradecimento;
- Etiqueta inferior;
- Papel kraft colmeia.

Locais:

- Prateleira A;
- Armário de essências;
- Área de cura;
- Bancada de produção;
- Bancada de embalagem;
- Expedição;
- Produtos bloqueados.

Receitas:

- Receita Vela Lavanda Francesa;
- Receita Vela Capim Limão.

Fluxos de exemplo:

- compra recebida com lote de essência;
- OP planejada;
- lote produzido em cura;
- pedido manual pago;
- pick list de pedido;
- etiqueta de item;
- etiqueta de lote;
- conteúdo IA gerado.

### Critérios de aceite

- Ambiente de desenvolvimento deve poder rodar com seeds.
- Seeds devem permitir testar o fluxo completo sem cadastro manual extenso.
- Dados de exemplo devem ser coerentes com a marca.

---

## 8. Telas principais

### 8.1 Login

- email;
- senha;
- erro inline;
- recuperar senha, opcional.

### 8.2 Onboarding

- criar empresa;
- checklist inicial;
- pular etapas opcionais.

### 8.3 Dashboard

- tarefas do dia;
- pendências;
- cards rápidos;
- status do Melhor Envio;
- alertas de estoque.

### 8.4 Itens/SKUs

- lista com filtros;
- novo item;
- editar item;
- arquivar item;
- imprimir etiqueta;
- ver estoque;
- ver receitas relacionadas;
- histórico.

### 8.5 Estoque

- saldos;
- filtros;
- movimentos;
- ajustar estoque;
- transferir local;
- contagem;
- etiquetas de localização.

### 8.6 Compras

- receber compra;
- fornecedores;
- histórico;
- imprimir etiquetas de lotes;
- criar despesa.

### 8.7 Receitas

- lista de receitas;
- criar receita;
- versionar;
- componentes;
- testes;
- custo estimado.

### 8.8 Produção

- kanban/lista;
- criar OP;
- materiais necessários;
- pick list;
- finalizar produção;
- cura;
- liberação.

### 8.9 Pedidos

- lista;
- criar pedido;
- pedido externo;
- itens;
- pagamento;
- reserva;
- separação;
- embalagem;
- envio;
- anexos.

### 8.10 Pick Lists

- pick list de pedidos;
- pick list de produção;
- PDF;
- abrir modo operação.

### 8.11 Modo Operação

- fullscreen;
- campo com foco permanente;
- histórico de leituras;
- botões manuais;
- progresso;
- erros grandes;
- finalizar etapa.

### 8.12 Frete e Envios

- calculadora avulsa;
- frete por pedido;
- status Melhor Envio;
- frete manual;
- etiquetas anexadas;
- rastreio.

### 8.13 Conteúdo IA

- gerar texto;
- templates;
- voz da marca;
- histórico;
- favoritos;
- copiar.

### 8.14 Financeiro

- entradas;
- saídas;
- contas a pagar;
- contas a receber;
- resumo.

### 8.15 Etiquetas

- gerar etiquetas;
- modelos;
- histórico;
- reimpressão;
- impressão em massa.

### 8.16 Configurações

- empresa;
- usuários;
- unidades;
- locais;
- canais;
- status;
- Melhor Envio;
- voz da marca;
- templates;
- segurança de integrações;
- exportações;
- ajuda interna.


### 8.17 Precificação

- selecionar produto;
- ver custo estimado;
- ver custo real médio;
- simular margem;
- simular canal;
- salvar preço praticado;
- consultar histórico de preço.

### 8.18 Qualidade

- lotes aguardando cura;
- lotes aguardando revisão;
- checklist de qualidade;
- liberar lote;
- bloquear lote;
- registrar perda.

### 8.19 Ocorrências

- abrir ocorrência a partir do pedido;
- classificar problema;
- registrar ação tomada;
- controlar devolução/troca/reembolso manual;
- encerrar ocorrência.

### 8.20 Contagem de estoque

- iniciar contagem;
- escolher local ou item;
- registrar quantidade contada;
- revisar divergência;
- gerar ajuste com justificativa.

### 8.21 Reposição sugerida

- listar itens críticos;
- mostrar motivo da sugestão;
- fornecedor sugerido;
- quantidade sugerida;
- gerar lista de compras.

### 8.22 Ajuda interna

- artigos por módulo;
- busca;
- checklist de primeiros passos;
- glossário;
- botão contextual “Como usar esta tela?”;
- problemas comuns.

---

## 9. Modelo de dados sugerido

> Nomes são sugestões. Implementação pode ajustar, mas deve preservar os conceitos.

### 9.1 Auth e empresa

- `users`
- `companies`
- `company_members`
- `roles`
- `sessions`

### 9.2 Configurações

- `company_settings`
- `units`
- `unit_conversions`
- `categories`
- `inventory_locations`
- `sales_channels`
- `custom_statuses`
- `message_templates`
- `ai_brand_voice`

### 9.3 Catálogo

- `items`
- `item_aliases`
- `item_barcodes`
- `item_logistics`
- `packaging_models`

### 9.4 Códigos e etiquetas

- `barcodes`
- `label_templates`
- `label_print_jobs`
- `label_print_items`

### 9.5 Estoque

- `inventory_lots`
- `stock_movements`
- `stock_counts`
- `stock_count_items`

### 9.6 Compras

- `suppliers`
- `purchase_orders`
- `purchase_order_items`

### 9.7 Receitas

- `formulas`
- `formula_versions`
- `formula_components`
- `formula_tests`

### 9.8 Produção

- `production_orders`
- `production_material_requirements`
- `production_material_separations`
- `production_consumptions`
- `production_outputs`
- `production_status_history`

### 9.9 Pedidos

- `customers`
- `orders`
- `order_items`
- `order_status_history`
- `shipments`
- `order_documents`

### 9.10 Pick lists e operação

- `pick_lists`
- `pick_list_sources`
- `pick_list_items`
- `operation_sessions`
- `operation_events`

### 9.11 Frete e integrações

- `integration_accounts`
- `shipping_quotes`
- `shipping_labels`
- `external_orders`
- `external_order_items`
- `channel_sku_mappings`
- `sync_logs`

### 9.12 IA

- `ai_generation_templates`
- `ai_generated_contents`
- `ai_usage_logs`

### 9.13 Financeiro

- `financial_transactions`
- `financial_categories`
- `accounts_payable`
- `accounts_receivable`

### 9.14 Auditoria

- `audit_logs`


### 9.15 Precificação

- `pricing_profiles`
- `pricing_calculations`
- `product_price_history`
- `channel_fee_rules`

### 9.16 Qualidade

- `quality_checklists`
- `quality_checklist_items`
- `quality_reviews`
- `lot_quality_status_history`

### 9.17 Ocorrências, devoluções e trocas

- `order_incidents`
- `order_incident_events`
- `returns`
- `return_items`
- `refund_records`

### 9.18 Reposição

- `replenishment_suggestions`
- `shopping_lists`
- `shopping_list_items`

### 9.19 Notificações

- `notifications`
- `notification_rules`

### 9.20 Ajuda interna

- `help_articles`
- `help_collections`
- `help_article_tags`
- `help_context_links`
- `help_checklists`
- `help_checklist_items`
- `user_help_progress`

### 9.21 Exportações

- `export_jobs`
- `export_job_files`

### 9.22 Segurança de integrações

- `integration_secrets`
- `integration_connection_events`

---

## 10. Regras críticas de negócio

### 10.1 Estoque

- Saldo é derivado de movimentos.
- Movimento não pode deixar estoque negativo sem autorização explícita.
- Produto em cura não é disponível.
- Produto bloqueado não é disponível.
- Produto reservado não é disponível.

### 10.2 Produção

- Criar OP não consome estoque.
- Separar material registra progresso, mas consumo real ocorre conforme regra definida.
- Finalizar produção deve registrar perdas.
- Lote produzido deve guardar custo real.
- Lote produzido deve guardar insumos/lotes consumidos.

### 10.3 Pedido

- Pedido pode ser criado sem frete.
- Pedido pago pode reservar estoque conforme configuração.
- Pedido cancelado deve liberar reserva se não enviado.
- Pedido enviado deve gerar baixa definitiva.

### 10.4 Scanner

- Código inválido deve ser bloqueado.
- Item errado deve ser bloqueado.
- Quantidade excedente deve pedir confirmação ou bloquear.
- Ação via scanner deve ter equivalente manual.

### 10.5 Melhor Envio

- Não configurado não bloqueia operação.
- Falha de API não bloqueia frete manual.
- Cotação escolhida deve ficar salva no pedido.

### 10.6 IA

- IA não publica.
- IA não gera imagem/vídeo.
- IA não inventa dados técnicos não cadastrados.
- Resultado deve ser editável antes de aprovação.


### 10.7 Precificação

- Preço sugerido nunca deve sobrescrever preço praticado sem confirmação.
- Produto com margem abaixo do mínimo deve exibir alerta.
- Alterações de preço devem gerar histórico.
- Taxas por canal devem ser consideradas na simulação.

### 10.8 Qualidade

- Lote em cura, bloqueado ou aguardando revisão não é disponível.
- Liberação de lote deve exigir usuário e data.
- Perda parcial deve gerar movimento de perda.
- Checklist de qualidade deve ficar registrado no histórico do lote.

### 10.9 Ocorrências e devoluções

- Pedido enviado não deve ser cancelado diretamente; deve abrir ocorrência.
- Produto devolvido só volta ao disponível após revisão.
- Ocorrência com impacto financeiro deve gerar ou sugerir lançamento financeiro.
- Ocorrência aberta deve aparecer no dashboard.

### 10.10 Contagem de estoque

- Divergência de contagem não ajusta estoque automaticamente.
- Ajuste de contagem exige confirmação e justificativa.
- Ajuste de contagem deve gerar movimento de estoque e auditoria.

### 10.11 Segurança

- Tokens devem ser criptografados.
- Tokens nunca devem aparecer no frontend.
- Exportação nunca deve incluir credenciais.
- Logs devem mascarar dados sensíveis.

### 10.12 Ajuda interna

- Cada módulo principal deve ter ajuda contextual.
- Estados vazios devem ensinar a próxima ação.
- Artigos de ajuda devem usar linguagem simples.
- Documentação interna deve poder evoluir sem alterar regra de negócio.

---

## 11. Ordem sugerida de implementação

### Fase 0 — Base técnica

- projeto Next.js;
- auth;
- layout;
- banco;
- Drizzle;
- roles;
- empresa única;
- seed básico;
- estrutura de auditoria;
- estrutura de ajuda interna seedada.

### Fase 1 — Cadastros essenciais

- itens;
- categorias;
- unidades;
- locais;
- fornecedores;
- clientes;
- canais;
- códigos numéricos;
- etiquetas básicas;
- ajuda contextual nos estados vazios.

### Fase 2 — Etiquetas, modelos e impressão

- configurador de modelos;
- preview;
- impressão por navegador;
- PDF;
- histórico de impressão;
- reimpressão;
- etiquetas de item, lote, OP, pedido e localização.

### Fase 3 — Estoque, compras e contagem

- movimentos;
- saldos;
- receber compra;
- lotes;
- etiquetas de lote;
- ajustes;
- contagem de estoque;
- divergências com justificativa.

### Fase 4 — Receitas, precificação e produção

- receitas;
- versões;
- cálculo de materiais;
- cálculo de custo;
- tela de precificação;
- OP;
- pick list de produção;
- finalização;
- cura;
- qualidade;
- liberação.

### Fase 5 — Pedidos, pick list e modo operação

- pedidos;
- reserva;
- pick list de pedidos;
- modo operação;
- conferência;
- checklist embalagem;
- PDFs;
- ocorrências básicas.

### Fase 6 — Frete e documentos

- modelos de embalagem;
- calculadora frete;
- Melhor Envio opcional;
- frete manual;
- anexar etiqueta;
- imprimir etiqueta anexada;
- rastreio manual.

### Fase 7 — Reposição, notificações e dashboard operacional

- compras sugeridas;
- central de alertas;
- lote pronto para revisão;
- estoque baixo;
- pedido parado;
- pendências de importação;
- margem baixa.

### Fase 8 — IA textual

- voz da marca;
- templates;
- geração por produto;
- mensagens;
- histórico;
- favoritos.

### Fase 9 — Financeiro, exportação e relatórios

- entradas/saídas;
- contas;
- resumos;
- relatórios simples;
- exportações CSV;
- backup manual.

### Fase 10 — CSV e canais externos

- importação;
- mapeamento SKU externo;
- pendências;
- logs;
- anexo de etiquetas externas.

### Fase 11 — Ajuda interna refinada e hardening

- artigos de ajuda por módulo;
- busca;
- glossário;
- checklist de primeiros passos;
- permissões finas;
- testes;
- estados vazios;
- tratamento de erro;
- responsividade;
- impressão.

---

## 12. Critérios gerais de aceite do MVP

O MVP estará aceitável quando for possível:

1. criar empresa e usuário;
2. acessar ajuda interna e checklist de primeiros passos;
3. cadastrar insumos, embalagens e produtos;
4. gerar códigos internos numéricos;
5. configurar modelos de etiqueta;
6. imprimir etiquetas internas;
7. receber compras e gerar lotes;
8. visualizar estoque por item, lote e local;
9. realizar contagem de estoque e ajustar divergência com justificativa;
10. criar receita;
11. calcular custo estimado;
12. simular preço e margem;
13. planejar produção;
14. gerar pick list de produção em PDF;
15. separar materiais por modo operação;
16. finalizar produção;
17. colocar lote em cura;
18. revisar qualidade;
19. liberar lote pós-cura;
20. criar pedido manual;
21. reservar estoque;
22. gerar pick list de pedidos em PDF;
23. separar pedido por scanner ou manualmente;
24. fazer checklist de embalagem;
25. abrir ocorrência de pedido;
26. registrar devolução/perda simples;
27. calcular ou informar frete;
28. usar Melhor Envio se configurado;
29. operar sem Melhor Envio se não configurado;
30. anexar etiqueta PDF;
31. marcar pedido como enviado;
32. registrar movimentações de estoque corretas;
33. gerar compras sugeridas;
34. consultar alertas no dashboard;
35. gerar texto de produto com IA;
36. salvar histórico de conteúdo;
37. registrar financeiro gerencial básico;
38. exportar dados principais em CSV;
39. consultar auditoria de ações críticas;
40. consultar documentação contextual dentro dos módulos.

---

## 13. Fora de escopo explícito do MVP

- loja online pública;
- checkout público;
- publicação automática em marketplace;
- sincronização automática de estoque com marketplace;
- emissão de nota fiscal;
- integração fiscal;
- geração de imagem;
- geração de vídeo;
- publicação automática no Instagram;
- app mobile nativo;
- ZPL direto;
- RFID;
- PDV de balcão completo;
- multiempresa visível para usuário final;
- relatórios avançados com BI.

---

## 14. Observações para futuro manual de uso

A documentação interna do sistema deve ser a primeira base para o manual visual. O manual externo poderá ser criado a partir dos artigos e fluxos cadastrados na área “Ajuda”.

Quando este PRD for convertido em manual, separar por tarefas reais da usuária:

1. Como fazer o primeiro acesso;
2. Como seguir o checklist de primeiros passos;
3. Como cadastrar um produto;
4. Como cadastrar uma matéria-prima;
5. Como receber uma compra;
6. Como imprimir etiquetas;
7. Como criar uma receita;
8. Como calcular preço e margem;
9. Como planejar uma produção;
10. Como separar materiais;
11. Como finalizar uma produção;
12. Como revisar qualidade;
13. Como liberar lote após cura;
14. Como criar um pedido;
15. Como separar um pedido;
16. Como embalar um pedido;
17. Como calcular frete;
18. Como usar Melhor Envio, quando configurado;
19. Como anexar uma etiqueta externa;
20. Como usar o modo operação;
21. Como abrir uma ocorrência;
22. Como contar estoque;
23. Como ver compras sugeridas;
24. Como gerar textos com IA;
25. Como ver o financeiro;
26. Como exportar dados;
27. Como resolver erros comuns.

O manual deve evitar linguagem técnica e usar exemplos da Instante Âmbar, como:

- Vela Lavanda Francesa;
- Vela Capim Limão;
- Vidro 156ml;
- Tampa pinus;
- Essência Lavanda;
- Caixa kraft;
- Pedido Instagram;
- Área de Cura;
- Bancada de Embalagem.

Para o agente visual/manual, cada capítulo deve conter preferencialmente:

- objetivo da tela;
- quando usar;
- antes de começar;
- passo a passo;
- exemplo real;
- cuidado/atenção;
- problema comum;
- próxima ação recomendada.

---

## 15. Resumo executivo para Codex

Construir um backoffice artesanal para a Instante Âmbar, do zero, com foco em operação interna. O sistema deve controlar catálogo, estoque por movimento, compras, receitas, precificação, produção, lotes, cura, qualidade, pedidos, ocorrências, pick lists, modo operação com scanner/manual, etiquetas internas, frete opcional via Melhor Envio, anexos de etiquetas externas, reposição sugerida, contagem de estoque, IA somente textual, financeiro gerencial, exportação, documentação interna e auditoria.

Priorizar robustez operacional sobre automações avançadas. Melhor Envio deve ser opcional. Marketplaces devem ser preparados via canais externos, CSV, SKU mapping e anexos, mas sem integração completa no MVP. Scanner deve acelerar, mas nunca ser obrigatório. O sistema deve ser fácil de operar na bancada, com PDFs imprimíveis, tela fullscreen de operação e ajuda contextual por módulo para que a operadora aprenda o sistema dentro do próprio produto.

