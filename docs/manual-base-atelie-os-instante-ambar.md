# Base para Manual de Uso — Ateliê OS / Instante Âmbar

> **Versão otimizada para criação posterior de manual visual**  
> Este documento não é o manual final diagramado. Ele serve como base textual, estrutural e narrativa para outro agente de IA transformar em um manual mais visual, com imagens, fluxos, diagramas, capturas de tela, ícones e exemplos.

---

## 0. Como usar este documento

Este arquivo deve ser usado para criar um manual simples, visual e didático para a pessoa que vai operar o sistema no dia a dia.

O tom recomendado do manual final deve ser:

- acolhedor;
- claro;
- direto;
- sem linguagem excessivamente técnica;
- com exemplos reais da operação de velas;
- com passo a passo;
- com poucos termos em inglês;
- com quadros de atenção para erros importantes;
- com checklists práticos.

O manual final deve explicar **como usar o sistema**, não como ele foi desenvolvido.

Sempre que possível, transformar blocos longos em:

- cards;
- fluxogramas;
- checklists;
- tabelas simples;
- exemplos visuais;
- telas simuladas;
- “antes de começar”; 
- “quando usar”; 
- “passo a passo”; 
- “problemas comuns”.

---

## 1. Apresentação do sistema

### 1.1 O que é o Ateliê OS

O **Ateliê OS** é o sistema interno da Instante Âmbar para organizar a rotina do ateliê.

Ele ajuda a controlar:

- produtos;
- matérias-primas;
- embalagens;
- fornecedores;
- compras;
- estoque;
- receitas;
- produção;
- cura das velas;
- pedidos;
- separação;
- embalagem;
- frete;
- etiquetas;
- financeiro simples;
- textos para produtos e posts.

Ele foi pensado para uma operação artesanal, onde cada produto precisa ser feito com cuidado, separado corretamente, embalado com carinho e enviado sem erro.

### 1.2 O que o sistema resolve

O sistema ajuda a responder perguntas como:

- O que tenho em estoque?
- O que está acabando?
- Tenho material suficiente para produzir?
- Qual receita uso para fazer cada vela?
- Quais lotes estão em cura?
- Quais lotes já podem ser vendidos?
- Quais pedidos precisam ser separados?
- Qual produto vai em cada pedido?
- Quanto custa o frete?
- Qual etiqueta pertence a cada pedido?
- Quanto custou produzir uma vela?
- Que texto posso usar para divulgar esse produto?

### 1.3 O que o sistema não faz no começo

No primeiro momento, o sistema **não é uma loja online pública**.

Também não é:

- emissor fiscal;
- sistema contábil;
- clone do Upseller;
- publicador automático de Instagram;
- gerador de imagens;
- gerador de vídeos;
- integrador completo de marketplaces.

Ele nasce como um **backoffice**, ou seja, uma ferramenta para organizar os bastidores da operação.

---

## 2. Conceitos importantes

Esta seção deve aparecer logo no início do manual final, com linguagem visual e exemplos.

### 2.1 Produto

Produto é aquilo que pode ser vendido ou controlado no sistema.

Exemplos:

- Vela Lavanda Francesa 156ml;
- Vela Capim Limão 156ml;
- Kit Presente 2 Velas;
- Cartão de agradecimento;
- Caixa kraft;
- Pavio;
- Vidro;
- Tampa;
- Essência;
- Cera.

No sistema, tanto produtos finais quanto insumos podem ser cadastrados como itens.

### 2.2 SKU

SKU é um código amigável para identificar um item.

Exemplos:

| Produto | SKU sugerido |
|---|---|
| Vela Lavanda Francesa 156ml | `VEL-LAV-156` |
| Vela Capim Limão 156ml | `VEL-CAP-156` |
| Vidro Nadir 156ml | `VID-NAD-156` |
| Tampa de Pinus 52mm | `TMP-PIN-052` |
| Essência Lavanda Francesa | `ESS-LAV-FR` |

O SKU ajuda a pessoa a entender o produto.  
O código de barras ajuda o sistema e o leitor.

### 2.3 Código de barras interno

O sistema usa códigos numéricos internos com tamanho fixo para facilitar a leitura.

Exemplo de estrutura:

```txt
TT SS NNNNNNN C
```

Onde:

- `TT` identifica o tipo principal;
- `SS` identifica o subtipo;
- `NNNNNNN` é a sequência;
- `C` é o dígito verificador.

Exemplo:

```txt
010300000128
```

A operadora não precisa decorar o código. A etiqueta deve mostrar também o nome do item.

### 2.4 Lote

Lote é um grupo de itens que entrou ou foi produzido em uma mesma operação.

Exemplos:

- lote de essência comprado de um fornecedor;
- lote de vidros recebido;
- lote de velas produzido em um dia;
- lote de velas em cura;
- lote de velas bloqueado para revisão.

O lote ajuda a saber:

- quando foi comprado ou produzido;
- qual foi o custo;
- se tem validade;
- se está liberado;
- em quais pedidos foi usado.

### 2.5 Receita

Receita é a composição usada para produzir um produto.

Exemplo de receita para uma vela:

- cera;
- essência;
- pavio;
- vidro;
- tampa;
- etiqueta;
- dust cover;
- caixa;
- cartão.

A receita permite calcular:

- custo;
- quantidade necessária de material;
- rendimento;
- perdas;
- disponibilidade para produção.

### 2.6 Ordem de Produção

A Ordem de Produção, ou OP, é o registro de uma produção planejada.

Exemplo:

```txt
OP 00042
Produto: Vela Lavanda Francesa
Quantidade planejada: 24 unidades
Status: Separando materiais
```

A OP guia o processo desde a separação dos materiais até a finalização e entrada no estoque.

### 2.7 Pick List

Pick List é uma lista de separação.

Pode ser usada para:

- separar produtos de pedidos;
- separar materiais de uma produção.

Ela responde:

> “O que eu preciso pegar agora?”

### 2.8 Modo Operação

O Modo Operação é uma tela grande, rápida e prática para trabalhar com leitor de código de barras, teclado, mouse ou touch.

Ele pode ser usado para:

- separar pedido;
- conferir pedido;
- separar materiais de produção;
- conferir produção;
- embalar pedido;
- marcar pedido como pronto.

Regra importante:

> O leitor de código de barras ajuda, mas não é obrigatório. Tudo que pode ser feito com leitor também deve poder ser feito com mouse e teclado.

---

## 3. Mapa geral do sistema

O manual final pode transformar esta seção em uma página visual com ícones.

### 3.1 Áreas principais

| Área | Para que serve |
|---|---|
| Hoje no Ateliê | Ver o que precisa de atenção agora |
| Itens | Cadastrar produtos, insumos e embalagens |
| Estoque | Ver saldos, lotes e movimentações |
| Compras | Registrar compras e fornecedores |
| Receitas | Montar fórmulas de produção |
| Produção | Planejar, separar, produzir, curar e liberar lotes |
| Pedidos | Registrar vendas e acompanhar etapas |
| Separação & Conferência | Gerar pick lists e usar o modo operação |
| Frete & Envios | Calcular frete, salvar rastreio e anexar etiquetas |
| Etiquetas | Gerar etiquetas internas e imprimir códigos |
| Financeiro | Registrar entradas, saídas e pendências |
| Conteúdo IA | Gerar textos para produtos, posts e mensagens |
| Configurações | Ajustar preferências, integrações e dados da loja |

---

## 4. Primeiros passos

### 4.1 Checklist inicial

Antes de começar a vender e produzir com o sistema, configurar:

```txt
[ ] Dados da empresa/ateliê
[ ] Locais de estoque
[ ] Unidades de medida
[ ] Canais de venda
[ ] Fornecedores principais
[ ] Matérias-primas
[ ] Embalagens
[ ] Produtos finais
[ ] Receitas principais
[ ] Modelos de etiqueta
[ ] Configuração de frete manual
[ ] Melhor Envio, se já houver conta autenticada
[ ] Voz da marca para IA textual
```

### 4.2 Ordem recomendada de cadastro

1. Configurar unidades de medida.
2. Configurar locais de estoque.
3. Cadastrar fornecedores.
4. Cadastrar matérias-primas.
5. Cadastrar embalagens.
6. Cadastrar produtos finais.
7. Criar receitas.
8. Registrar primeira compra.
9. Planejar primeira produção.
10. Criar primeiro pedido.
11. Gerar primeiras etiquetas.
12. Testar Modo Operação.

### 4.3 Locais de estoque sugeridos

Exemplos para o ateliê:

- Prateleira A — insumos;
- Prateleira B — embalagens;
- Armário de essências;
- Área de cura;
- Produtos prontos;
- Produtos bloqueados;
- Bancada de produção;
- Bancada de embalagem;
- Expedição;
- Pedidos separados.

---

## 5. Hoje no Ateliê

### 5.1 Objetivo da tela

A tela **Hoje no Ateliê** mostra o que precisa ser feito primeiro.

Ela deve funcionar como uma lista de prioridades, não como uma tela cheia de gráficos.

### 5.2 O que aparece nessa tela

Exemplos de cards:

```txt
Pedidos para separar: 4
Pedidos para embalar: 2
Pedidos prontos para envio: 1
Produções aguardando material: 2
Lotes em cura: 3
Lotes prontos para revisão: 1
Itens abaixo do mínimo: 5
Contas vencendo: 2
```

### 5.3 Como usar

1. Abrir o sistema.
2. Ver os alertas principais.
3. Clicar no card mais urgente.
4. Resolver a pendência.
5. Voltar para a tela inicial e seguir para a próxima tarefa.

### 5.4 Exemplos de alertas importantes

- Produto em estoque baixo.
- Pedido pago ainda não separado.
- Produção planejada com material faltando.
- Lote com cura finalizada.
- Pedido embalado sem etiqueta de envio.
- Conta vencida.
- Produto vendido sem custo atualizado.

---

## 6. Itens

### 6.1 O que cadastrar em Itens

Cadastrar tudo que precisa ser controlado:

- matérias-primas;
- embalagens;
- produtos acabados;
- kits;
- auxiliares de produção.

### 6.2 Tipos de item

| Tipo | Exemplo |
|---|---|
| Matéria-prima | Cera, essência, corante |
| Embalagem | Vidro, tampa, caixa, etiqueta, cartão |
| Produto acabado | Vela pronta |
| Kit | Kit presente, kit leitura |
| Auxiliar | Itens usados no processo, mas não vendidos diretamente |

### 6.3 Campos importantes

Para cada item, cadastrar:

- nome;
- SKU;
- tipo;
- unidade;
- categoria;
- estoque mínimo;
- localização padrão;
- controla lote ou não;
- tem validade ou não;
- custo estimado;
- preço de venda, quando for produto final;
- peso e dimensões, quando for produto vendido;
- observações.

### 6.4 Produto final vs insumo

Produto final é algo que pode ser vendido.

Insumo é algo usado para produzir.

Exemplo:

```txt
Produto final:
Vela Lavanda Francesa 156ml

Insumos:
Cera de coco
Essência Lavanda
Pavio
Vidro
Tampa
Etiqueta
Caixa
```

---

## 7. Estoque

### 7.1 Como o estoque funciona

O estoque não deve ser editado diretamente.

Toda alteração acontece por movimentação.

Exemplos:

- entrada por compra;
- saída por produção;
- entrada de produto pronto;
- reserva para pedido;
- saída por envio;
- perda;
- ajuste;
- transferência de local.

### 7.2 Saldos principais

| Saldo | Significado |
|---|---|
| Físico | Quantidade que existe fisicamente |
| Reservado | Quantidade prometida para pedidos |
| Disponível | Quantidade livre para uso/venda |
| Em cura | Produzido, mas ainda não liberado |
| Bloqueado | Não pode ser usado até revisão |

### 7.3 Quando usar ajuste de estoque

Usar ajuste quando:

- encontrou diferença na contagem;
- houve perda;
- quebrou vidro;
- item foi descartado;
- houve erro de cadastro anterior;
- entrou item sem compra registrada.

Sempre preencher observação.

### 7.4 Contagem de estoque

Fluxo sugerido:

1. Escolher local.
2. Imprimir ou abrir lista de contagem.
3. Contar fisicamente.
4. Conferir com o sistema.
5. Registrar diferenças com justificativa.

---

## 8. Compras e fornecedores

### 8.1 Para que serve

Registrar compras ajuda a controlar:

- entrada de estoque;
- custo real;
- fornecedor;
- lote;
- validade;
- histórico de preços.

### 8.2 Receber compra

Passo a passo:

1. Abrir Compras.
2. Clicar em **Receber compra**.
3. Selecionar fornecedor ou cadastrar novo.
4. Informar data.
5. Adicionar itens comprados.
6. Informar quantidade.
7. Informar custo unitário.
8. Informar validade, se houver.
9. Escolher local de destino.
10. Confirmar recebimento.
11. Imprimir etiquetas de lote, se necessário.

### 8.3 Exemplo

```txt
Fornecedor: Casa das Essências
Item: Essência Lavanda Francesa
Quantidade: 500 ml
Custo: R$ 45,00
Validade: 01/06/2027
Local: Armário de essências
```

Resultado:

- estoque aumenta;
- lote é criado;
- custo fica registrado;
- etiqueta de lote pode ser impressa.

---

## 9. Receitas

### 9.1 Para que serve

Receita é o guia para produzir um produto.

Ela permite saber:

- quais materiais são usados;
- quanto de cada material é necessário;
- quanto custa produzir;
- se há material suficiente;
- quanto rende cada produção.

### 9.2 Criar receita

Passo a passo:

1. Abrir Receitas.
2. Clicar em **Nova receita**.
3. Escolher produto final.
4. Informar rendimento.
5. Adicionar componentes.
6. Informar quantidade de cada componente.
7. Informar perdas previstas, se houver.
8. Salvar.
9. Revisar custo estimado.
10. Ativar receita quando estiver correta.

### 9.3 Exemplo simplificado

```txt
Receita: Vela Lavanda Francesa 156ml
Rendimento: 24 unidades

Componentes:
- Cera de coco: 2.400 g
- Essência Lavanda: 240 g
- Pavio algodão P: 24 un
- Vidro 156ml: 24 un
- Tampa pinus: 24 un
- Etiqueta inferior: 24 un
- Dust cover: 24 un
- Caixa kraft: 24 un
```

### 9.4 Versões de receita

Quando uma receita mudar, o ideal é criar uma nova versão.

Exemplo:

- Lavanda v1 — teste inicial;
- Lavanda v2 — ajuste de essência;
- Lavanda v3 — versão aprovada.

Isso ajuda a saber qual fórmula foi usada em cada lote.

---

## 10. Produção

### 10.1 Fluxo geral

```txt
Planejar produção
↓
Separar materiais
↓
Iniciar produção
↓
Finalizar produção
↓
Enviar para cura
↓
Revisar lote
↓
Liberar para venda
```

### 10.2 Planejar produção

Passo a passo:

1. Abrir Produção.
2. Clicar em **Planejar produção**.
3. Escolher receita.
4. Informar quantidade planejada.
5. Conferir materiais necessários.
6. Ver se há itens faltando.
7. Confirmar OP.

### 10.3 Separar materiais

A separação pode ser feita de três formas:

- pela tela da OP;
- por pick list impressa;
- pelo Modo Operação com leitor.

### 10.4 Finalizar produção

Ao finalizar, informar:

- quantidade produzida;
- quantidade aprovada;
- perdas;
- motivo da perda;
- lote produzido;
- local de destino.

Exemplo:

```txt
Planejado: 24 unidades
Produzido: 24 unidades
Aprovado: 22 unidades
Perda: 2 unidades
Motivo: acabamento irregular
```

### 10.5 Cura

Depois da produção, o lote pode ficar em cura.

Enquanto estiver em cura:

- existe fisicamente;
- não deve aparecer como disponível para venda;
- não deve ser separado para pedido;
- deve aparecer como pendência quando chegar a data de revisão.

### 10.6 Revisão e liberação

Quando a cura terminar:

1. Abrir lote.
2. Conferir aparência.
3. Conferir aroma.
4. Conferir acabamento.
5. Marcar como liberado.
6. Produto entra no disponível.

Se houver problema:

- bloquear lote;
- registrar observação;
- impedir venda/envio.

---

## 11. Pedidos

### 11.1 Para que serve

A área de Pedidos organiza tudo que foi vendido ou precisa ser entregue.

### 11.2 Tipos de pedido

Exemplos:

- Instagram;
- WhatsApp;
- Shopee;
- Mercado Livre;
- TikTok Shop;
- feira;
- venda direta;
- pedido interno/teste.

### 11.3 Criar pedido manual

Passo a passo:

1. Abrir Pedidos.
2. Clicar em **Novo pedido**.
3. Selecionar ou cadastrar cliente.
4. Escolher canal de venda.
5. Informar número externo, se houver.
6. Adicionar produtos.
7. Informar frete, desconto e taxa do canal, se houver.
8. Definir status de pagamento.
9. Confirmar.
10. O sistema reserva estoque, se configurado.

### 11.4 Status sugeridos

```txt
Novo
Aguardando pagamento
Pago
A separar
Separando
Separado
Em embalagem
Embalado
Pronto para envio
Enviado
Entregue
Cancelado
```

### 11.5 Pedido de marketplace sem integração

Se o pedido veio de Shopee, Mercado Livre ou TikTok Shop, mas ainda não há API configurada:

1. Criar pedido manual.
2. Informar canal.
3. Informar número externo.
4. Adicionar produtos.
5. Baixar etiqueta no marketplace.
6. Anexar PDF no pedido.
7. Imprimir pelo sistema.
8. Seguir separação e embalagem normalmente.

### 11.6 Importação por planilha

Quando disponível:

1. Exportar pedidos do marketplace.
2. Importar planilha no sistema.
3. Conferir SKUs reconhecidos.
4. Resolver SKUs pendentes.
5. Criar pedidos internos.

---

## 12. Pick List

### 12.1 O que é

Pick List é uma lista para separar itens.

Ela pode ser usada para:

- separar produtos vendidos;
- separar materiais para produção.

### 12.2 Pick List de pedidos

Usar quando há pedidos pagos aguardando separação.

Exemplo:

```txt
Pick List #00018
Pedidos: 3

Separar:
[ ] 3x Vela Lavanda Francesa
[ ] 2x Vela Capim Limão
[ ] 1x Kit Presente

Embalagens:
[ ] 6x Caixa kraft
[ ] 6x Cartão
[ ] Papel kraft colmeia
```

### 12.3 Pick List de produção

Usar para separar materiais de uma OP.

Exemplo:

```txt
OP #00042
Produto: Vela Lavanda Francesa
Quantidade: 24 un

Separar:
[ ] 2.400 g Cera de coco
[ ] 240 g Essência Lavanda
[ ] 24 un Pavio
[ ] 24 un Vidro
[ ] 24 un Tampa
```

### 12.4 PDF da Pick List

O sistema deve permitir gerar PDF para impressão.

O PDF deve mostrar:

- código da pick list;
- data;
- responsável;
- pedidos ou OPs incluídas;
- itens a separar;
- quantidades;
- locais sugeridos;
- códigos de barras;
- espaço para marcação manual;
- observações.

### 12.5 Quando usar papel

Usar o PDF quando:

- o leitor não estiver disponível;
- a pessoa preferir separar primeiro e conferir depois;
- houver muitos itens;
- a produção precisar de ficha impressa na bancada;
- o computador não estiver perto da área física.

---

## 13. Modo Operação

### 13.1 O que é

O Modo Operação é uma tela em tela cheia para trabalhar rápido.

Ele funciona com:

- leitor de código de barras;
- teclado;
- mouse;
- touch.

### 13.2 Como abrir

O sistema deve ter botões como:

- **Abrir Modo Operação**;
- **Separar com scanner/manual**;
- **Conferir pedido**;
- **Separar materiais**;
- **Embalar pedido**.

### 13.3 Modos disponíveis

| Modo | Uso |
|---|---|
| Separação de pedido | Conferir produtos vendidos |
| Embalagem | Conferir checklist de embalagem |
| Expedição | Marcar pronto/enviado |
| Separação de produção | Separar materiais da OP |
| Conferência de produção | Validar materiais e lotes |
| Estoque | Consultar item, lote ou local |

### 13.4 Tela sem depender do leitor

A tela deve ter:

- campo de entrada sempre focado;
- busca manual;
- botões grandes;
- ações +1 e -1;
- botão marcar completo;
- histórico de leituras;
- mensagens de erro claras;
- botão finalizar.

### 13.5 Exemplo de uso com leitor

```txt
1. Escanear pedido
2. Escanear ação "Iniciar separação"
3. Escanear produto
4. Sistema confirma
5. Escanear próximo produto
6. Escanear ação "Finalizar separação"
```

### 13.6 Exemplo de uso sem leitor

```txt
1. Buscar pedido pelo número ou cliente
2. Clicar no pedido
3. Clicar em +1 nos produtos separados
4. Marcar itens completos
5. Clicar em Finalizar separação
```

### 13.7 Erros comuns no Modo Operação

| Erro | O que significa | O que fazer |
|---|---|---|
| Código desconhecido | O sistema não encontrou o código | Buscar manualmente ou verificar etiqueta |
| Item errado | Produto não pertence ao pedido/OP | Separar o item correto |
| Quantidade excedida | Já foi separado tudo que precisava | Conferir se o pedido está correto |
| Lote em cura | Produto ainda não foi liberado | Escolher outro lote ou aguardar cura |
| Lote bloqueado | Produto está impedido de uso | Revisar motivo do bloqueio |
| Estoque insuficiente | Não há quantidade disponível | Produzir, comprar ou ajustar estoque |

---

## 14. Etiquetas

### 14.1 Para que servem

As etiquetas ajudam a identificar rapidamente:

- itens;
- lotes;
- pedidos;
- ordens de produção;
- locais;
- volumes;
- ações de processo.

### 14.2 Tipos de etiqueta

| Tipo | Exemplo |
|---|---|
| Item/SKU | Vela Lavanda, Vidro, Essência |
| Lote | Lote produzido, lote comprado |
| OP | Ordem de produção |
| Pedido | Pedido interno |
| Localização | Prateleira, bancada, cura |
| Volume | Caixa 1/2, caixa 2/2 |
| Ação | Iniciar embalagem, finalizar separação |

### 14.3 Código numérico interno

O código de barras deve usar números com tamanho fixo.

Exemplo de tipos:

| Prefixo | Tipo |
|---|---|
| 01 | Item/SKU |
| 02 | Lote |
| 03 | Ordem de produção |
| 04 | Pedido |
| 05 | Localização |
| 06 | Volume |
| 07 | Ação de processo |
| 08 | Quantidade ou documento auxiliar |
| 09 | Código externo/importado |

### 14.4 Etiqueta de item

Deve mostrar:

- código de barras;
- código numérico;
- SKU;
- nome do item.

Exemplo:

```txt
010300000128
VEL-LAV-156
Vela Lavanda Francesa 156ml
```

### 14.5 Etiqueta de lote

Deve mostrar:

- código de barras;
- código do lote;
- produto ou insumo;
- data;
- validade ou cura, se houver;
- status, se necessário.

### 14.6 Etiqueta de pedido interno

Não substitui a etiqueta de envio.

Serve para organizar a operação interna.

Exemplo:

```txt
Pedido: 040200000157
Cliente: Maria
Canal: Instagram
Itens: 2
```

### 14.7 Etiqueta de envio

Pode vir de:

- Melhor Envio;
- marketplace;
- arquivo PDF anexado manualmente;
- preenchimento manual.

Se Melhor Envio não estiver configurado, o sistema deve permitir anexar e imprimir a etiqueta normalmente.

### 14.8 Impressão

O sistema deve permitir:

- imprimir etiqueta individual;
- imprimir em massa;
- reimprimir;
- gerar PDF;
- escolher modelo;
- usar folha A4;
- usar rolo contínuo;
- registrar histórico de impressão.

---

## 15. Frete e Envios

### 15.1 Objetivo

A área de Frete ajuda a responder rapidamente:

> “Quanto fica para enviar esse pedido?”

### 15.2 Melhor Envio opcional

O Melhor Envio deve funcionar como integração opcional.

Se estiver autenticado:

- calcular frete;
- escolher serviço;
- salvar cotação;
- comprar etiqueta, quando implementado;
- salvar rastreio;
- imprimir etiqueta.

Se não estiver autenticado:

- calcular manualmente;
- preencher valor do frete;
- anexar etiqueta PDF;
- preencher rastreio manual;
- concluir envio normalmente.

### 15.3 Dados necessários para calcular frete

O sistema precisa saber:

- CEP de origem;
- CEP de destino;
- peso;
- dimensões;
- valor declarado;
- embalagem usada;
- quantidade de produtos.

### 15.4 Modelos de embalagem

Cadastrar embalagens como:

| Embalagem | Exemplo |
|---|---|
| Caixa individual | 12 x 12 x 12 cm |
| Caixa para 2 velas | 20 x 14 x 12 cm |
| Caixa presente | 22 x 16 x 10 cm |
| Caixa maior | para kits ou múltiplas unidades |

### 15.5 Calculadora avulsa

A calculadora serve para quando alguém perguntar o frete antes de fechar pedido.

Passo a passo:

1. Escolher produto.
2. Informar quantidade.
3. Informar CEP.
4. Escolher embalagem.
5. Calcular.
6. Copiar resposta para WhatsApp.

### 15.6 Frete dentro do pedido

No pedido:

1. Conferir produtos.
2. Informar CEP.
3. Calcular frete.
4. Escolher opção.
5. Salvar valor.
6. Gerar mensagem para cliente.

### 15.7 Mensagem de frete

Exemplo:

```txt
Oi, Maria! Para o seu CEP, encontrei estas opções:

PAC: R$ 24,90 — até 6 dias úteis
SEDEX: R$ 38,70 — até 2 dias úteis

Com PAC, o total do seu pedido fica R$ 149,90.
```

---

## 16. Embalagem e checklist

### 16.1 Por que existe checklist

Velas são frágeis e a experiência de unboxing faz parte da marca.

O checklist ajuda a evitar:

- produto errado;
- aroma errado;
- vidro com defeito;
- falta de cartão;
- falta de proteção;
- etiqueta de envio errada.

### 16.2 Checklist sugerido

```txt
[ ] Produto correto
[ ] Aroma correto
[ ] Lote correto
[ ] Vidro sem defeito
[ ] Tampa correta
[ ] Etiqueta inferior aplicada
[ ] Dust cover aplicado
[ ] Cartão incluído
[ ] Produto protegido
[ ] Caixa fechada
[ ] Etiqueta de envio aplicada
[ ] Pedido pronto para envio
```

### 16.3 Quando usar

Usar sempre antes de marcar pedido como embalado ou pronto para envio.

---

## 17. Financeiro simples

### 17.1 Para que serve

O financeiro do sistema é gerencial, não contábil.

Serve para acompanhar:

- entradas;
- saídas;
- contas a pagar;
- contas a receber;
- pedidos pagos;
- pedidos pendentes;
- custos de compra;
- margem estimada.

### 17.2 Lançar entrada

Usar para:

- pagamento de pedido;
- venda direta;
- recebimento manual;
- ajuste financeiro.

### 17.3 Lançar saída

Usar para:

- compra de matéria-prima;
- compra de embalagem;
- frete;
- taxa de marketplace;
- equipamento;
- assinatura;
- manutenção;
- marketing.

### 17.4 Atenção

O sistema ajuda na gestão, mas não substitui contador, nota fiscal ou controle fiscal oficial.

---

## 18. Conteúdo IA

### 18.1 O que a IA faz

A IA do sistema gera apenas textos.

Ela pode ajudar com:

- descrição de produto;
- legenda de Instagram;
- texto para stories;
- mensagem de WhatsApp;
- texto de cartão;
- ideias de campanha;
- nomes de aromas;
- nomes de kits;
- reescrita de texto.

### 18.2 O que a IA não faz

A IA não deve gerar:

- imagem;
- vídeo;
- arte final;
- layout;
- publicação automática;
- promessa técnica inventada;
- informação que não está cadastrada.

### 18.3 Como gerar texto para produto

Passo a passo:

1. Abrir produto.
2. Clicar em **Gerar conteúdo com IA**.
3. Escolher tipo de conteúdo.
4. Escrever o que deseja transmitir.
5. Escolher tom.
6. Gerar opções.
7. Revisar.
8. Editar, se necessário.
9. Salvar ou copiar.

### 18.4 Tons sugeridos

- acolhedor;
- poético;
- sofisticado;
- direto;
- comercial suave;
- íntimo;
- delicado.

### 18.5 Voz da marca

A IA deve respeitar a voz da Instante Âmbar:

```txt
Acolhedora, serena, poética, minimalista e sofisticada.
Fala sobre pausa, aconchego, autocuidado, respiro, refúgio, luz e memória olfativa.
Evita urgência agressiva, promessas exageradas e linguagem genérica.
```

### 18.6 Exemplo de pedido para IA

```txt
Produto: Vela Lavanda Francesa
Quero transmitir: paz, descanso e fim de dia
Ocasião: autocuidado
Tom: acolhedor e poético
Gerar: legenda de Instagram curta
```

---

## 19. Marketplaces e canais externos

### 19.1 O que o MVP permite

Mesmo sem integração automática, o sistema deve permitir controlar pedidos vindos de:

- Shopee;
- Mercado Livre;
- TikTok Shop;
- Instagram;
- WhatsApp;
- feira;
- venda direta.

### 19.2 Como registrar pedido externo

1. Criar pedido.
2. Escolher canal.
3. Informar número externo.
4. Adicionar produtos.
5. Anexar etiqueta, se houver.
6. Seguir separação e embalagem.

### 19.3 Importação de planilha

Quando houver exportação do marketplace:

1. Baixar planilha.
2. Importar no sistema.
3. Conferir pedidos.
4. Resolver SKUs desconhecidos.
5. Criar pedidos internos.

### 19.4 Mapeamento de SKU

Quando o marketplace usa outro código para o produto, o sistema deve salvar a relação.

Exemplo:

```txt
SKU Shopee: LAVANDA_156
Produto interno: VEL-LAV-156
```

Depois de mapear uma vez, o sistema deve reconhecer nas próximas importações.

---

## 20. Relatórios simples

### 20.1 Relatórios úteis

O manual final pode apresentar como “Consultas importantes”.

Exemplos:

- produtos mais vendidos;
- pedidos por canal;
- estoque baixo;
- itens sem fornecedor;
- lotes em cura;
- lotes bloqueados;
- produções do mês;
- perdas de produção;
- custo médio por produto;
- contas em aberto;
- vendas por período.

### 20.2 Como usar

1. Escolher relatório.
2. Definir período.
3. Aplicar filtros.
4. Exportar ou imprimir, se necessário.

---

## 21. Rotinas recomendadas

### 21.1 Rotina diária

```txt
[ ] Abrir Hoje no Ateliê
[ ] Conferir pedidos pagos
[ ] Gerar pick list de pedidos
[ ] Separar e conferir pedidos
[ ] Embalar pedidos
[ ] Calcular ou conferir fretes
[ ] Imprimir/anexar etiquetas de envio
[ ] Marcar pedidos enviados
[ ] Conferir itens abaixo do mínimo
[ ] Registrar compras ou perdas do dia
```

### 21.2 Rotina de produção

```txt
[ ] Ver pedidos e demanda
[ ] Planejar OP
[ ] Conferir materiais necessários
[ ] Gerar pick list de produção
[ ] Separar materiais
[ ] Produzir
[ ] Registrar perdas
[ ] Criar lote produzido
[ ] Enviar para cura
[ ] Revisar após cura
[ ] Liberar ou bloquear lote
```

### 21.3 Rotina semanal

```txt
[ ] Conferir estoque baixo
[ ] Revisar fornecedores
[ ] Conferir contas a pagar
[ ] Conferir pedidos pendentes
[ ] Revisar lotes bloqueados
[ ] Revisar custos dos produtos
[ ] Gerar ideias de conteúdo IA para a semana
```

### 21.4 Rotina mensal

```txt
[ ] Conferir vendas do mês
[ ] Conferir margem dos produtos
[ ] Conferir perdas de produção
[ ] Atualizar custos médios
[ ] Revisar preços de venda
[ ] Fazer contagem de estoque principal
[ ] Revisar templates de mensagens
```

---

## 22. Problemas comuns e como resolver

### 22.1 Produto não aparece disponível

Possíveis motivos:

- está em cura;
- está bloqueado;
- está reservado para pedido;
- estoque físico está zerado;
- lote não foi liberado;
- item foi arquivado.

### 22.2 Pedido não deixa finalizar separação

Possíveis motivos:

- item faltando;
- item errado foi escaneado;
- quantidade separada menor que a necessária;
- lote bloqueado;
- produto ainda em cura.

### 22.3 Frete não calcula

Possíveis motivos:

- Melhor Envio não autenticado;
- CEP inválido;
- produto sem peso;
- produto sem dimensão;
- embalagem não configurada;
- API indisponível.

Solução:

- usar frete manual;
- preencher peso e dimensões;
- revisar CEP;
- tentar novamente depois.

### 22.4 Scanner não funciona

Soluções:

- usar busca manual;
- clicar nos botões +1 e -1;
- digitar código manualmente;
- conferir se o leitor está enviando Enter;
- conferir se o campo principal está focado.

### 22.5 Código lido não é reconhecido

Possíveis motivos:

- etiqueta antiga;
- código danificado;
- item sem código cadastrado;
- leitura incompleta;
- dígito verificador inválido.

---

## 23. Sugestões para o manual visual

Esta seção é para o agente que criará o manual final.

### 23.1 Criar páginas visuais para

- mapa geral do sistema;
- rotina diária;
- fluxo de produção;
- fluxo de pedido;
- diferença entre pick list e checkout;
- como usar o Modo Operação;
- como funciona estoque físico/reservado/disponível;
- como funciona cura;
- como funciona Melhor Envio opcional;
- como usar IA textual.

### 23.2 Usar exemplos reais

Preferir exemplos como:

- Vela Lavanda Francesa;
- Vela Capim Limão;
- Vidro 156ml;
- Essência Lavanda;
- Pedido Instagram;
- Caixa kraft;
- Área de cura.

### 23.3 Sinalizar com caixas

Usar caixas do tipo:

```txt
Atenção
Dica
Exemplo
Quando usar
Erro comum
Passo a passo
```

### 23.4 Linguagem recomendada

Evitar:

- “entidade”;
- “payload”;
- “endpoint”;
- “integração assíncrona”;
- “movimentação transacional”.

Preferir:

- cadastro;
- registro;
- etapa;
- ação;
- leitura;
- conferência;
- pedido;
- produção;
- lote;
- estoque.

---

## 24. Glossário rápido

| Termo | Significado simples |
|---|---|
| Ateliê OS | Sistema interno de organização da produção e pedidos |
| SKU | Código amigável de um item |
| Código interno | Número lido pelo scanner |
| Item | Produto, insumo ou embalagem cadastrada |
| Lote | Grupo comprado ou produzido em uma mesma operação |
| Receita | Fórmula usada para produzir um produto |
| OP | Ordem de Produção |
| Pick List | Lista de separação |
| Modo Operação | Tela rápida para scanner/manual |
| Estoque físico | O que existe fisicamente |
| Estoque reservado | O que já está prometido para pedido |
| Estoque disponível | O que está livre para uso ou venda |
| Em cura | Produzido, mas ainda aguardando liberação |
| Bloqueado | Não pode ser usado ou vendido |
| Melhor Envio | Integração opcional para cotar e gerar frete |
| Etiqueta interna | Etiqueta usada dentro do ateliê |
| Etiqueta de envio | Etiqueta da transportadora ou marketplace |
| IA textual | Assistente que gera textos, não imagens |

---

## 25. Versão resumida do fluxo completo

```txt
Cadastrar itens
↓
Cadastrar receitas
↓
Receber compras
↓
Planejar produção
↓
Separar materiais
↓
Produzir
↓
Enviar para cura
↓
Liberar lote
↓
Criar pedido
↓
Reservar estoque
↓
Gerar pick list
↓
Separar pedido
↓
Embalar
↓
Calcular/anexar frete
↓
Imprimir etiqueta
↓
Enviar
↓
Registrar financeiro
↓
Acompanhar relatórios
```

---

## 26. Observação final para o manual

O manual final deve reforçar a ideia de que o sistema existe para deixar a rotina mais leve e segura.

Mensagem sugerida de abertura:

```txt
O Ateliê OS foi criado para ajudar a Instante Âmbar a organizar cada etapa do ateliê: do recebimento dos materiais até o envio do pedido. Ele não substitui o cuidado artesanal; ele protege esse cuidado, ajudando a evitar esquecimentos, erros de estoque, separações incorretas e retrabalho.
```

