# Addendum v2.1 — Branding White Label e Kanban Configurável

> **Arquivo de apoio para agente de IA / Codex**  
> Este addendum complementa o PRD v2 do Ateliê OS.  
> Use este documento quando o agente já tiver recebido o PRD anterior e precisar aplicar somente os ajustes de v2.1.

---

## 1. Objetivo do addendum

Adicionar dois requisitos estruturais ao projeto:

1. **Configuração visual white label**  
   Criar uma página de configuração de marca para personalizar cores, temas via JSON e logotipo por empresa.

2. **Kanban e workflows configuráveis**  
   Permitir que o usuário configure as etapas de produção/pedidos, evitando status hardcoded como “Em cura”, que serve para velas, mas não para todos os contextos white label.

Esses ajustes devem ser tratados como base arquitetural, não como detalhe visual.

---

## 2. Branding white label

### 2.1 Problema

O sistema começará com a Instante Âmbar, mas poderá ser usado por outros pequenos fabricantes artesanais. Logo, cores, logotipo e identidade visual não devem ficar fixos no código.

### 2.2 Requisito principal

Criar uma área:

```txt
/settings/branding
```

Nome no menu:

```txt
Aparência da marca
```

A página deve permitir:

- alterar logotipo;
- alterar ícone/logo reduzido;
- selecionar tema de cores;
- editar cores via formulário simples;
- editar tema via JSON avançado;
- pré-visualizar tema antes de aplicar;
- restaurar tema padrão;
- registrar auditoria das alterações.

### 2.3 Tokens obrigatórios

A UI deve consumir tokens semânticos. Evitar cores hardcoded espalhadas.

Tokens mínimos:

```txt
--background
--foreground
--card
--card-foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--destructive
--destructive-foreground
--border
--input
--ring
--success
--warning
--info
--sidebar-background
--sidebar-foreground
--sidebar-primary
--sidebar-accent
```

### 2.4 Exemplo de JSON de tema

```json
{
  "version": 1,
  "name": "Instante Âmbar",
  "mode": "light",
  "radius": "0.875rem",
  "fonts": {
    "sans": "Inter",
    "serif": "Cormorant Garamond"
  },
  "colors": {
    "background": "#FAF7F2",
    "foreground": "#2A211D",
    "card": "#FFFFFF",
    "cardForeground": "#2A211D",
    "primary": "#8A5A44",
    "primaryForeground": "#FFFFFF",
    "secondary": "#E8D7CD",
    "secondaryForeground": "#2A211D",
    "accent": "#C49A6C",
    "accentForeground": "#2A211D",
    "muted": "#F1E9E3",
    "mutedForeground": "#6B5B53",
    "border": "#E2D4C8",
    "input": "#E2D4C8",
    "ring": "#8A5A44",
    "success": "#3F7D58",
    "warning": "#B7791F",
    "danger": "#A94442",
    "info": "#3A6EA5",
    "sidebarBackground": "#2A211D",
    "sidebarForeground": "#FAF7F2",
    "sidebarPrimary": "#C49A6C",
    "sidebarAccent": "#3A2C25"
  }
}
```

### 2.5 Presets iniciais

Seedar presets:

1. Instante Âmbar;
2. Neutro claro;
3. Neutro escuro;
4. Minimalista preto e branco;
5. Artesanal terroso.

Cada preset pode ser duplicado e editado por empresa.

### 2.6 Validações

Ao salvar tema:

- JSON precisa ser válido;
- campos mínimos precisam existir;
- cores devem aceitar `#RRGGBB` no MVP;
- texto não pode ficar invisível sobre fundo;
- tema inválido não deve ser aplicado;
- se tema falhar, usar fallback seguro.

### 2.7 Upload de logo

Requisitos:

- aceitar PNG, JPG, WEBP e SVG seguro;
- validar tamanho máximo;
- preview antes de salvar;
- fallback para nome textual;
- opção de remover logo;
- auditoria ao alterar.

### 2.8 Modelo de dados sugerido

```txt
company_brand_settings
- id
- company_id
- display_name
- logo_url
- icon_url
- logo_alt
- active_theme_id
- created_at
- updated_at

brand_themes
- id
- company_id nullable para presets globais
- name
- description
- mode: light | dark | system
- tokens_json
- is_system_preset
- is_active
- created_by
- created_at
- updated_at

theme_change_history
- id
- company_id
- brand_theme_id
- changed_by
- previous_tokens_json
- next_tokens_json
- created_at
```

### 2.9 Critérios de aceite

- Owner consegue acessar `/settings/branding`.
- Owner consegue alterar logotipo.
- Owner consegue escolher preset.
- Owner consegue editar JSON do tema.
- Tema inválido não salva.
- Tema salvo altera visual do app sem rebuild.
- App funciona sem configuração usando tema padrão.
- Alteração de tema/logo gera auditoria.

---

## 3. Kanban e workflows configuráveis

### 3.1 Problema

O fluxo de velas pode ter etapas como “Em cura”. Porém, em outro contexto artesanal, essa etapa pode não existir. Um fabricante de brownie pode ter “Resfriamento”, uma papelaria pode ter “Impressão”, uma marca de sabonetes pode ter “Secagem”, e uma montadora de kits pode ter “Montagem”.

Portanto, o sistema não deve depender de nomes fixos de status.

### 3.2 Requisito principal

Criar uma área:

```txt
/settings/workflows
```

Nome no menu:

```txt
Fluxos e Kanban
```

A página deve permitir:

- criar workflow;
- duplicar workflow;
- editar etapas;
- reordenar colunas;
- configurar cores;
- configurar etapa inicial/final;
- configurar comportamentos técnicos;
- arquivar etapas;
- definir workflow padrão;
- importar/exportar JSON de workflow.

### 3.3 Regra central

Separar nome visível de comportamento técnico.

Exemplo:

```txt
Nome visível: Em cura
Chave técnica: waiting_release
Comportamento: bloqueia disponibilidade para venda
```

Outro tenant pode usar:

```txt
Nome visível: Secagem
Chave técnica: waiting_release
Comportamento: bloqueia disponibilidade para venda
```

A regra interna deve depender da chave técnica/comportamento, nunca do texto visível.

### 3.4 Entidades com workflow

Prioridade MVP:

- produção;
- pedidos;
- pick lists;
- qualidade/lotes, se possível.

### 3.5 Campos de etapa

Cada etapa deve ter:

```txt
id
workflow_id
technical_key
label
description
color
position
is_initial
is_final
blocks_availability
requires_reason
requires_checklist
requires_quantity_input
automation_type
is_protected
is_archived
```

### 3.6 Automações possíveis

Automations iniciais:

```txt
none
reserve_stock
release_reservation
start_production
consume_materials
create_output_lot
block_stock_availability
release_stock_availability
request_quality_review
mark_ready_to_ship
mark_shipped
mark_delivered
```

### 3.7 Presets obrigatórios

#### Produção — Velas

```txt
Planejada
Separando materiais
Pronta para produzir
Em produção
Em cura
Revisão de qualidade
Liberada para venda
Finalizada
Bloqueada
Cancelada
```

#### Produção — Genérica

```txt
Planejada
Separando materiais
Em produção
Aguardando revisão
Aprovada
Finalizada
Bloqueada
Cancelada
```

#### Produção — Alimentos

```txt
Planejada
Preparando ingredientes
Em preparo
Resfriamento/descanso
Embalagem
Pronta para venda
Finalizada
Bloqueada
Cancelada
```

#### Produção — Kits

```txt
Planejada
Separando componentes
Montando kit
Conferência
Pronto para estoque
Finalizada
Cancelada
```

#### Pedidos — Simples

```txt
Novo
Aguardando pagamento
Pago
Separar
Separado
Embalar
Pronto para envio
Enviado
Entregue
Cancelado
```

### 3.8 Associação de workflow

Produção deve definir workflow por precedência:

```txt
workflow escolhido manualmente > receita > categoria do produto > padrão da empresa
```

No MVP, pode simplificar:

```txt
empresa usa um workflow padrão de produção ativo
```

Mas o modelo deve estar preparado para sobrescrita futura.

### 3.9 Regras de segurança

- Workflow ativo precisa ter uma etapa inicial.
- Não pode existir mais de uma etapa inicial ativa.
- Etapa usada por registro histórico não pode ser deletada fisicamente.
- Ao remover etapa com registros abertos, exigir migração para outra etapa.
- Automação destrutiva exige confirmação.
- Alteração de workflow gera auditoria.
- Mudanças em workflow devem informar se afetam apenas novos registros ou também registros abertos.

### 3.10 Checklists por etapa

Cada etapa pode ter checklist próprio.

Exemplo para “Em cura”:

```txt
- registrar data de entrada em cura
- informar data prevista de liberação
- manter lote bloqueado para venda
```

Exemplo para “Revisão de qualidade”:

```txt
- conferir vidro
- conferir aroma
- conferir pavio
- conferir etiqueta
- aprovar ou bloquear lote
```

### 3.11 Modelo de dados sugerido

```txt
workflows
- id
- company_id
- entity_type: production | order | pick_list | quality
- name
- description
- is_default
- is_active
- created_by
- created_at
- updated_at

workflow_steps
- id
- workflow_id
- technical_key
- label
- description
- color
- position
- is_initial
- is_final
- blocks_availability
- requires_reason
- requires_checklist
- requires_quantity_input
- automation_type
- is_protected
- is_archived
- created_at
- updated_at

workflow_step_checklists
- id
- workflow_step_id
- title
- description
- required
- position

workflow_transition_rules
- id
- workflow_id
- from_step_id
- to_step_id
- allowed_roles_json
- requires_confirmation
- requires_reason
- created_at

workflow_assignments
- id
- company_id
- entity_type
- scope_type: company | category | formula | item
- scope_id nullable
- workflow_id
- priority

workflow_change_history
- id
- company_id
- workflow_id
- changed_by
- action
- previous_json
- next_json
- created_at
```

### 3.12 Impacto nos módulos existentes

#### Produção

- Kanban deve renderizar etapas do workflow configurado.
- Não pode existir lista hardcoded de status de produção.
- Produção de velas pode usar preset com “Em cura”.
- Outro tenant pode remover/renomear “Em cura”.

#### Pedidos

- Status de pedido deve usar workflow configurado.
- Automações de reserva, separação e envio devem estar associadas a `automation_type`.

#### Pick lists

- Pick lists devem respeitar workflow configurado.
- Finalização de pick list pode mover pedido/produção para etapa configurada.

#### Modo Operação

- Códigos de ação devem mapear para automações ou etapas configuradas.
- Se uma etapa foi renomeada, o modo operação deve continuar funcionando.

### 3.13 Critérios de aceite

- Owner consegue criar workflow.
- Owner consegue duplicar preset.
- Owner consegue renomear “Em cura” sem quebrar sistema.
- Owner consegue reordenar colunas.
- Produção renderiza kanban a partir do workflow ativo.
- Pedido renderiza status a partir do workflow ativo.
- Etapa em uso não é deletada fisicamente.
- Mudança de workflow gera auditoria.
- O sistema funciona para Instante Âmbar e também para um tenant genérico sem etapa “Em cura”.

---

## 4. Orientação de implementação para Codex

Implementar em camadas:

### Fase A — Base de branding

1. Criar tabelas de branding.
2. Seedar presets de tema.
3. Aplicar CSS variables no app shell.
4. Criar página simples de branding.
5. Adicionar preview e validação.

### Fase B — Base de workflow

1. Criar tabelas de workflow.
2. Seedar workflows de produção e pedidos.
3. Fazer produção/pedidos consultarem workflow ativo.
4. Criar CRUD inicial de etapas.
5. Adicionar auditoria.

### Fase C — UI avançada

1. Editor visual de kanban.
2. Import/export JSON de workflow.
3. Checklists por etapa.
4. Associação por categoria/receita.

### Fase D — Integração operacional

1. Modo Operação respeitar workflows.
2. Pick lists respeitarem workflows.
3. Documentação interna explicar como configurar temas e fluxos.

---

## 5. Fora de escopo deste addendum

Não implementar agora:

- loja online pública;
- múltiplos temas por usuário;
- marketplace completo;
- construtor visual avançado estilo no-code;
- permissões extremamente granulares por coluna;
- editor visual de layout do app;
- temas públicos compartilháveis entre tenants, exceto presets seedados.

---

## 6. Resumo para agente

O sistema deve nascer white label de verdade:

1. **Visual configurável** por empresa, com logo e tema JSON.
2. **Fluxos configuráveis** por empresa, com kanban dinâmico.
3. **Regras internas protegidas** por chaves técnicas, nunca por nomes visíveis.
4. **Instante Âmbar deve ser um preset**, não uma limitação estrutural.

