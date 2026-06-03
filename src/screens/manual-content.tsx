"use client";

import * as React from "react";
import { Badge, Icon, cn } from "@/components/ui";

type ManualCalloutTone = "tip" | "attn" | "err" | "when" | "note";
type ConceptItem = { icon: string; title: string; body: string };
export type ManualSection = {
  id: string;
  num?: string;
  group: string;
  title: string;
  intro?: string;
  hero?: boolean;
  body: React.ReactNode;
};
export type ManualGroup = { label: string; sections: ManualSection[] };
/* ---------------- primitives ---------------- */
const MN_CALLOUT_ICON: Record<ManualCalloutTone, string> = { tip: 'wand', attn: 'alert', err: 'alertCircle', when: 'clock', note: 'fileText' };

function Cal({ tone = 'note', label, children }: { tone?: ManualCalloutTone; label?: string; children: React.ReactNode }) {
  return (
    <div className={cn('mn-callout', `mn-callout--${tone}`)}>
      <div className="mn-callout-ic"><Icon name={MN_CALLOUT_ICON[tone]} size={17} /></div>
      <div className="mn-callout-body">
        {label && <div className="mn-callout-label">{label}</div>}
        {children}
      </div>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="mn-steps">{React.Children.map(children, (c, i) => <li key={i}>{c}</li>)}</ol>;
}

function Panel({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mn-panel">
      {label && <span className="mn-panel-label">{label}</span>}
      <pre>{children}</pre>
    </div>
  );
}

function Concept({ items }: { items: ConceptItem[] }) {
  return (
    <div className="mn-cards">
      {items.map((it, i) => (
        <div className="mn-card" key={i}>
          <div className="mn-card-ic"><Icon name={it.icon} size={17} /></div>
          <h6>{it.title}</h6>
          <p>{it.body}</p>
        </div>
      ))}
    </div>
  );
}

function MTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="mn-table-wrap">
      <table className="mn-table">
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Flow({ steps }: { steps: React.ReactNode[] }) {
  return (
    <div className="mn-flow">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="mn-flow-step"><span className="mn-flow-i">{String(i + 1).padStart(2, '0')}</span>{s}</div>
          {i < steps.length - 1 && <div className="mn-flow-arrow"><Icon name="arrowDown" size={16} /></div>}
        </React.Fragment>
      ))}
    </div>
  );
}

function Check({ id, items }: { id: string; items: string[] }) {
  const key = 'atelie-manual-check-' + id;
  const [done, setDone] = React.useState<Set<number>>(() => new Set<number>());
  React.useEffect(() => {
    try { setDone(new Set<number>(JSON.parse(localStorage.getItem(key) || '[]'))); } catch { setDone(new Set<number>()); }
  }, [key]);
  const toggle = (i: number) => setDone((prev) => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify([...next]));
    return next;
  });
  return (
    <div className="mn-check">
      {items.map((label, i) => (
        <button type="button" key={i} className={cn('mn-check-item', done.has(i) && 'mn-check-item--on')} onClick={() => toggle(i)}>
          <span className="mn-check-box"><Icon name="check" size={13} strokeWidth={3} /></span>
          <span className="mn-check-lbl">{label}</span>
        </button>
      ))}
    </div>
  );
}

const StateBadges = () => (
  <div className="mn-badges">
    <Badge tone="neutral" dot>Físico</Badge>
    <Badge tone="warn" dot>Reservado</Badge>
    <Badge tone="ok" dot>Disponível</Badge>
    <Badge tone="cure" dot>Em cura</Badge>
    <Badge tone="bad" dot>Bloqueado</Badge>
  </div>
);

/* ---------------- sections ---------------- */
export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'boas-vindas', hero: true, group: 'Para começar', title: 'Boas-vindas',
    body: (
      <div className="mn-hero">
        <div className="mn-hero-kicker">Manual de uso</div>
        <h2>Seu ateliê, organizado com calma.</h2>
        <p className="mn-hero-lead">Este é o guia do <strong>Ateliê OS</strong> — o sistema que cuida dos bastidores da operação. Ele acompanha cada etapa, do recebimento dos materiais ao envio do pedido, para você gastar energia no que importa: fazer velas com carinho.</p>
        <div className="mn-hero-quote">O sistema não substitui o cuidado artesanal. Ele protege esse cuidado — evitando esquecimentos, erros de estoque e retrabalho, para que cada vela chegue como deveria.</div>
      </div>
    ),
  },
  {
    id: 'o-que-e', num: '01', group: 'Para começar', title: 'O que é o Ateliê OS',
    intro: 'É o sistema interno do ateliê para organizar a rotina. Pense nele como um caderno inteligente que sabe exatamente o que você tem, o que precisa fazer e o que já está pronto.',
    body: (
      <React.Fragment>
        <h4>Ele te ajuda a responder, a qualquer momento:</h4>
        <ul className="mn-bullets">
          <li>O que eu tenho em estoque e o que está acabando?</li>
          <li>Tenho material suficiente para produzir hoje?</li>
          <li>Qual receita uso para cada vela e quanto custou produzir?</li>
          <li>Quais lotes estão em cura e quais já podem ser vendidos?</li>
          <li>Quais pedidos precisam ser separados, embalados ou enviados?</li>
          <li>Quanto custa o frete e qual etiqueta pertence a cada pedido?</li>
        </ul>
        <Cal tone="tip" label="Dica">
          <p>Não é preciso decorar nada. O sistema sempre mostra os próximos passos e tudo pode ser feito com calma, no seu ritmo.</p>
        </Cal>
        <h4>O que ele <em>não</em> faz (por enquanto)</h4>
        <p>O Ateliê OS nasce como um <strong>backoffice</strong> — uma ferramenta para os bastidores. Neste primeiro momento, ele não é uma loja online pública, nem emissor de nota fiscal, nem sistema de contabilidade. Ele também não publica nas redes sozinho e não conecta automaticamente aos marketplaces. Tudo isso pode vir no futuro — aqui o foco é deixar a operação do dia a dia leve e sem erros.</p>
      </React.Fragment>
    ),
  },
  {
    id: 'conceitos', num: '02', group: 'Para começar', title: 'Conceitos essenciais',
    intro: 'São poucas ideias. Quando elas fizerem sentido, o resto do sistema fica natural.',
    body: (
      <React.Fragment>
        <Concept items={[
          { icon: 'box', title: 'Item', body: 'Tudo que você controla: matéria-prima, embalagem, produto pronto ou kit. A essência é um item; a vela também.' },
          { icon: 'tag', title: 'SKU', body: 'O apelido fácil de um item, feito para você ler. Ex.: VEL-LAV-156 para a Vela Lavanda 156ml.' },
          { icon: 'code', title: 'Código interno', body: 'O número que o leitor de código de barras enxerga. A etiqueta sempre mostra o nome junto.' },
          { icon: 'layers', title: 'Lote', body: 'Um grupo que entrou ou foi produzido junto. Ex.: as 24 velas feitas numa terça são um lote, com custo e data próprios.' },
          { icon: 'beaker', title: 'Receita', body: 'A fórmula da vela: quais materiais, em que quantidade, e quanto rende. É o guia da produção.' },
          { icon: 'listChecks', title: 'Pick list', body: 'A lista de separação. Responde uma pergunta só: “o que eu preciso pegar agora?”.' },
        ]} />
        <h4>Os estados do estoque</h4>
        <p>Uma vela pode existir fisicamente e ainda assim não estar pronta para vender. Por isso o sistema separa o estoque em estados — esta é, talvez, a ideia mais importante de todas:</p>
        <StateBadges />
        <MTable head={['Estado', 'O que significa']} rows={[
          ['Físico', 'Tudo que existe de verdade na prateleira, somando tudo.'],
          ['Reservado', 'Já está prometido para um pedido. Existe, mas não está livre.'],
          ['Disponível', 'Livre para usar ou vender agora.'],
          ['Em cura', 'Já foi produzido, mas ainda descansando. Não pode ser vendido ainda.'],
          ['Bloqueado', 'Impedido de uso até alguém revisar (defeito, dúvida de qualidade).'],
        ]} />
        <Cal tone="attn" label="Atenção">
          <p>Produto <strong>em cura</strong> nunca aparece como disponível para venda, mesmo já pronto na bancada. O descanso faz parte da qualidade — o sistema respeita isso por você.</p>
        </Cal>
        <Cal tone="note" label="Estoque por movimentos">
          <p>Você nunca digita um saldo direto. O saldo é sempre o resultado das <strong>entradas e saídas</strong>: uma compra entra, uma produção consome, um envio dá baixa. Assim o número está sempre certo e dá para ver o histórico de tudo.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'mapa', num: '03', group: 'Para começar', title: 'Mapa do sistema',
    intro: 'As áreas principais e para que servem. Você não precisa visitar todas todo dia — o “Hoje no ateliê” te leva direto ao que importa.',
    body: (
      <MTable head={['Área', 'Para que serve']} rows={[
        ['Hoje no ateliê', 'Ver o que precisa de atenção agora'],
        ['Itens / SKUs', 'Cadastrar produtos, insumos e embalagens'],
        ['Estoque', 'Ver saldos, lotes e movimentações'],
        ['Receitas', 'Montar as fórmulas de produção'],
        ['Produção', 'Planejar, separar, produzir, curar e liberar lotes'],
        ['Pedidos', 'Registrar vendas e acompanhar etapas até a entrega'],
        ['Etiquetas', 'Gerar e imprimir etiquetas internas'],
        ['Conteúdo IA', 'Gerar textos para produtos, posts e mensagens'],
        ['Configurações', 'Ajustar marca, fluxos, etiquetas e usuários'],
        ['Modo Operação', 'Tela de bancada para separar, embalar e produzir'],
      ]} />
    ),
  },
  {
    id: 'primeiros-passos', num: '04', group: 'Para começar', title: 'Primeiros passos',
    intro: 'Antes de vender e produzir, vale preparar a base. Faça na ordem abaixo — cada etapa apoia a próxima. Marque conforme for concluindo:',
    body: (
      <React.Fragment>
        <Check id="primeiros-passos" items={[
          'Dados da empresa / ateliê',
          'Unidades de medida (g, ml, unidade…)',
          'Locais de estoque (prateleiras, área de cura…)',
          'Canais de venda (Instagram, WhatsApp, feira…)',
          'Fornecedores principais',
          'Matérias-primas e embalagens',
          'Produtos finais (as velas)',
          'Receitas principais',
          'Primeira compra registrada',
          'Modelos de etiqueta e teste do Modo Operação',
          'Voz da marca para a IA (opcional)',
          'Integração de frete, se já houver conta (opcional)',
        ]} />
        <Cal tone="tip" label="Dica">
          <p>O sistema mostra um <strong>checklist guiado</strong> na primeira vez. Ele fica visível até você concluir ou dispensar, e cada item leva direto à tela certa. Não precisa adivinhar por onde começar.</p>
        </Cal>
        <h5>Locais de estoque sugeridos</h5>
        <p>Prateleira A (insumos), Prateleira B (embalagens), Armário de essências, Área de cura, Produtos prontos, Produtos bloqueados, Bancada de produção, Bancada de embalagem e Expedição.</p>
      </React.Fragment>
    ),
  },
  {
    id: 'hoje', num: '05', group: 'Para começar', title: 'Hoje no ateliê',
    intro: 'É a sua tela inicial. Em vez de gráficos, ela mostra uma lista de prioridades — o que merece atenção primeiro.',
    body: (
      <React.Fragment>
        <Panel label="Exemplo do que aparece">{`Pedidos para separar:          4
Pedidos para embalar:          2
Pedidos prontos para envio:    1
Produções aguardando material: 2
Lotes em cura:                 3
Lotes prontos para revisão:    1
Itens abaixo do mínimo:        5
Contas vencendo:               2`}</Panel>
        <h5>Como usar</h5>
        <Steps>
          <span><strong>Abra o sistema</strong> e olhe os alertas principais.</span>
          <span><strong>Clique no card mais urgente</strong> — ele te leva à tela já filtrada.</span>
          <span><strong>Resolva a pendência</strong> ali mesmo.</span>
          <span><strong>Volte ao início</strong> e siga para a próxima tarefa.</span>
        </Steps>
        <Cal tone="tip" label="Dica">
          <p>Se não houver pendências, a tela mostra uma mensagem tranquila — está tudo em dia. Esse é um bom dia.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'itens', num: '06', group: 'Cadastros', title: 'Cadastrar um item',
    intro: 'Item é tudo que você controla. Antes de produzir ou vender qualquer coisa, ela precisa existir aqui.',
    body: (
      <React.Fragment>
        <Cal tone="when" label="Quando usar">
          <p>Sempre que aparecer um material, embalagem ou produto novo no ateliê. Uma essência nova, um vidro diferente, uma vela inédita.</p>
        </Cal>
        <h5>Tipos de item</h5>
        <MTable head={['Tipo', 'Exemplos']} rows={[
          ['Matéria-prima', 'Cera de coco, Essência Lavanda, corante'],
          ['Embalagem', 'Vidro Nadir 156ml, tampa pinus, caixa kraft, cartão'],
          ['Produto acabado', 'Vela Lavanda Francesa 156ml'],
          ['Kit', 'Kit Presente 2 Velas'],
          ['Auxiliar', 'Itens usados no processo, mas não vendidos'],
        ]} />
        <h5>Passo a passo</h5>
        <Steps>
          <span><strong>Abra Itens</strong> e clique em “Novo item”.</span>
          <span><strong>Dê um nome e um SKU.</strong> Ex.: Vela Lavanda Francesa 156ml · <code>VEL-LAV-156</code>.</span>
          <span><strong>Escolha o tipo</strong> e a unidade (g, ml, unidade).</span>
          <span><strong>Defina o estoque mínimo</strong> — abaixo dele, o item vira alerta no “Hoje no ateliê”.</span>
          <span><strong>Marque se controla lote e se tem validade.</strong> Essências e ceras costumam controlar; vidros nem sempre.</span>
          <span><strong>Para produtos vendidos,</strong> informe preço, peso e dimensões (ajuda no cálculo de frete).</span>
          <span><strong>Salve.</strong> O sistema gera sozinho o código interno numérico para o leitor.</span>
        </Steps>
        <Cal tone="note" label="SKUs sugeridos">
          <p><code>VEL-LAV-156</code> Vela Lavanda · <code>VEL-CAP-156</code> Vela Capim Limão · <code>VID-NAD-156</code> Vidro Nadir · <code>TMP-PIN-052</code> Tampa pinus · <code>ESS-LAV-FR</code> Essência Lavanda.</p>
        </Cal>
        <Cal tone="attn" label="Atenção">
          <p>O SKU precisa ser único. Se quiser parar de usar um item, prefira <strong>arquivar</strong> em vez de apagar — assim o histórico antigo continua intacto e ele some das listas do dia a dia.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'compras', num: '07', group: 'Cadastros', title: 'Receber uma compra',
    intro: 'Toda vez que chega material, registre o recebimento. É assim que o estoque sobe, o custo fica salvo e os lotes nascem.',
    body: (
      <React.Fragment>
        <h5>Passo a passo</h5>
        <Steps>
          <span><strong>Abra Compras</strong> e clique em “Receber compra”.</span>
          <span><strong>Escolha o fornecedor</strong> (ou cadastre um novo na hora).</span>
          <span><strong>Informe a data</strong> do recebimento.</span>
          <span><strong>Adicione os itens,</strong> com quantidade, unidade e custo unitário.</span>
          <span><strong>Informe validade e lote do fornecedor,</strong> se houver.</span>
          <span><strong>Escolha o local de destino</strong> (ex.: Armário de essências).</span>
          <span><strong>Confirme.</strong> O sistema cria os lotes e lança as entradas no estoque.</span>
        </Steps>
        <Panel label="Exemplo">{`Fornecedor:  Casa das Essências
Item:        Essência Lavanda Francesa
Quantidade:  500 ml
Custo:       R$ 45,00
Validade:    01/06/2027
Local:       Armário de essências

→ Estoque sobe · Lote criado · Custo salvo · Etiqueta disponível`}</Panel>
        <Cal tone="tip" label="Dica">
          <p>Você pode, na mesma tela, lançar a despesa no financeiro. Assim a saída de dinheiro fica vinculada à compra, sem digitar duas vezes.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'receitas', num: '08', group: 'Cadastros', title: 'Criar uma receita',
    intro: 'A receita é a fórmula da vela. Com ela, o sistema sabe o que consumir, calcula o custo e avisa se falta material.',
    body: (
      <React.Fragment>
        <h5>Passo a passo</h5>
        <Steps>
          <span><strong>Abra Receitas</strong> e clique em “Nova receita”.</span>
          <span><strong>Escolha o produto final</strong> (ex.: Vela Lavanda Francesa 156ml).</span>
          <span><strong>Informe o rendimento</strong> — quantas unidades a receita produz.</span>
          <span><strong>Adicione os componentes</strong> com quantidade e unidade.</span>
          <span><strong>Informe perdas previstas,</strong> se costuma haver (ex.: um pouco de cera).</span>
          <span><strong>Salve e confira o custo estimado</strong> que o sistema calcula sozinho.</span>
          <span><strong>Ative a receita</strong> quando estiver correta.</span>
        </Steps>
        <Panel label="Exemplo · rende 24 unidades">{`Vela Lavanda Francesa 156ml
• Cera de coco        2.400 g
• Essência Lavanda      240 g
• Pavio algodão P        24 un
• Vidro Nadir 156ml      24 un
• Tampa pinus            24 un
• Etiqueta inferior      24 un
• Caixa kraft            24 un`}</Panel>
        <Cal tone="attn" label="Atenção · versões">
          <p>Quando você muda uma receita já usada, o sistema cria uma <strong>nova versão</strong> (Lavanda v1, v2, v3…). As produções antigas continuam ligadas à versão que realmente usaram. Assim você sempre sabe qual fórmula gerou cada lote.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'producao', num: '09', group: 'Produção', title: 'Planejar e produzir',
    intro: 'A produção transforma insumos em velas, controlando material, lote e perdas. Tudo começa com uma Ordem de Produção (OP).',
    body: (
      <React.Fragment>
        <Flow steps={['Planejar produção', 'Separar materiais', 'Produzir', 'Finalizar e gerar o lote', 'Enviar para cura']} />
        <h4>Planejar a produção</h4>
        <Steps>
          <span><strong>Abra Produção</strong> e clique em “Planejar produção”.</span>
          <span><strong>Escolha a receita</strong> e a quantidade planejada.</span>
          <span><strong>Confira os materiais necessários</strong> — o sistema mostra o que falta, se faltar.</span>
          <span><strong>Confirme a OP.</strong> Pode imprimir a OP e gerar a pick list de produção.</span>
        </Steps>
        <Cal tone="attn" label="Atenção">
          <p>Criar a OP <strong>não consome o estoque ainda</strong>. O consumo acontece quando você finaliza a produção. Antes disso, é só um plano.</p>
        </Cal>
        <h4>Separar os materiais</h4>
        <p>Pode ser feito de três jeitos, o que for mais confortável: pela tela da OP, pela <strong>pick list impressa</strong> na bancada, ou pelo <strong>Modo Operação</strong> com o leitor.</p>
        <h4>Finalizar a produção</h4>
        <p>Ao terminar, registre o que realmente saiu. É aqui que o lote nasce e o custo real fica gravado.</p>
        <Panel label="Exemplo de finalização">{`Planejado:  24 unidades
Produzido:  24 unidades
Aprovado:   22 unidades
Perda:       2 unidades
Motivo:     acabamento irregular

→ Insumos consumidos · Lote de produto criado · Custo real salvo`}</Panel>
      </React.Fragment>
    ),
  },
  {
    id: 'cura', num: '10', group: 'Produção', title: 'Cura e liberação',
    intro: 'A cura é o descanso da vela. O sistema cuida do tempo por você e só libera para venda quando você aprovar.',
    body: (
      <React.Fragment>
        <h5>Enquanto está em cura, o lote…</h5>
        <ul className="mn-bullets">
          <li>existe fisicamente, na Área de cura;</li>
          <li><strong>não</strong> aparece como disponível para venda;</li>
          <li><strong>não</strong> pode ser separado para um pedido;</li>
          <li>vira pendência no “Hoje no ateliê” quando a data de revisão chega.</li>
        </ul>
        <h5>Quando a cura termina</h5>
        <Steps>
          <span><strong>Abra o lote</strong> que aparece em “Lotes para revisar”.</span>
          <span><strong>Confira aparência, aroma e acabamento.</strong></span>
          <span><strong>Se estiver perfeito,</strong> marque como liberado — o produto entra no disponível.</span>
          <span><strong>Se tiver algo errado,</strong> bloqueie o lote e registre o motivo.</span>
        </Steps>
        <Cal tone="tip" label="Dica">
          <p>Você também pode <strong>estender a cura</strong> se sentir que a vela precisa de mais alguns dias. A qualidade manda — o sistema só registra a sua decisão.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'pedidos', num: '11', group: 'Pedidos & envio', title: 'Criar um pedido',
    intro: 'A área de Pedidos organiza tudo que foi vendido e conduz cada etapa até a entrega.',
    body: (
      <React.Fragment>
        <h5>Passo a passo (pedido manual)</h5>
        <Steps>
          <span><strong>Abra Pedidos</strong> e clique em “Novo pedido”.</span>
          <span><strong>Escolha ou cadastre o cliente.</strong></span>
          <span><strong>Escolha o canal</strong> (Instagram, WhatsApp, feira, marketplace…).</span>
          <span><strong>Adicione os produtos</strong> e, se houver, frete, desconto e taxa do canal.</span>
          <span><strong>Defina o status de pagamento.</strong></span>
          <span><strong>Confirme.</strong> O sistema reserva o estoque conforme a sua configuração.</span>
        </Steps>
        <h5>Os status de um pedido</h5>
        <p>Novo → Aguardando pagamento → Pago → A separar → Separando → Separado → Em embalagem → Embalado → Pronto para envio → Enviado → Entregue. O pedido caminha por essas etapas, e você sempre vê em que ponto ele está.</p>
        <Cal tone="tip" label="Dica">
          <p>Um pedido pode ser criado <strong>sem frete calculado</strong>. Você fecha a venda primeiro e resolve o frete depois — sem travar o atendimento da cliente.</p>
        </Cal>
        <Cal tone="attn" label="Atenção">
          <p>Cancelar um pedido que ainda <strong>não foi enviado</strong> libera o estoque reservado, automaticamente. Pedido já enviado precisa de um fluxo específico para ser cancelado.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'picklist', num: '12', group: 'Pedidos & envio', title: 'Pick list',
    intro: 'A lista de separação. Ela junta tudo que precisa ser pego — de um pedido só ou de vários ao mesmo tempo.',
    body: (
      <React.Fragment>
        <h5>Quando criar</h5>
        <p>Quando há pedidos pagos esperando para serem separados. Você pode criar a partir de um pedido, de vários selecionados, ou filtrando “pagos e não separados”.</p>
        <Panel label="Exemplo · pick list de pedidos">{`Pick List #00018 · 3 pedidos

Separar:
☐  3× Vela Lavanda Francesa
☐  2× Vela Capim Limão
☐  1× Kit Presente

Embalagens:
☐  6× Caixa kraft
☐  6× Cartão
☐  Papel kraft colmeia`}</Panel>
        <Cal tone="when" label="Quando imprimir em papel">
          <p>Quando o leitor não estiver por perto, quando preferir separar primeiro e conferir depois, ou quando o computador estiver longe da área física. A pick list em PDF vem com códigos de barras e espaço para marcar à mão.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'operacao', num: '13', group: 'Pedidos & envio', title: 'Modo Operação',
    intro: 'A tela de bancada: grande, rápida e à prova de erro. Use com o leitor ou só com o mouse — você escolhe.',
    body: (
      <React.Fragment>
        <Concept items={[
          { icon: 'scan', title: 'Com leitor', body: 'Escaneie o pedido → a ação “Iniciar separação” → cada produto → “Finalizar”. O sistema confirma cada leitura.' },
          { icon: 'panelLeft', title: 'Sem leitor', body: 'Busque o pedido pelo número ou nome → clique → use os botões +1 e −1 → marque os itens completos → “Finalizar separação”.' },
        ]} />
        <Cal tone="tip" label="Dica">
          <p>Errou a última leitura? Tem um botão de <strong>desfazer</strong>. Enquanto a etapa não é finalizada, dá para corrigir sem stress.</p>
        </Cal>
        <h5>O sistema te protege com avisos claros</h5>
        <MTable head={['Aviso', 'O que significa', 'O que fazer']} rows={[
          ['Código desconhecido', 'Não encontrou o código', 'Buscar manualmente ou conferir a etiqueta'],
          ['Item errado', 'Não pertence a este pedido', 'Separar o item correto'],
          ['Quantidade excedida', 'Já separou tudo que precisava', 'Conferir se o pedido está certo'],
          ['Lote em cura', 'Ainda não foi liberado', 'Usar outro lote ou aguardar a cura'],
          ['Lote bloqueado', 'Está impedido de uso', 'Revisar o motivo do bloqueio'],
          ['Estoque insuficiente', 'Não há quantidade disponível', 'Produzir, comprar ou ajustar o estoque'],
        ]} />
      </React.Fragment>
    ),
  },
  {
    id: 'embalagem', num: '14', group: 'Pedidos & envio', title: 'Embalar com checklist',
    intro: 'Velas são frágeis e o unboxing é parte da marca. O checklist garante que nada falte e nada chegue quebrado.',
    body: (
      <React.Fragment>
        <Check id="embalagem" items={[
          'Produto correto',
          'Aroma correto',
          'Lote correto',
          'Vidro sem defeito · tampa correta',
          'Etiqueta inferior aplicada',
          'Dust cover aplicado · cartão incluído',
          'Produto protegido · caixa fechada',
          'Etiqueta de envio aplicada',
          'Pedido marcado como pronto para envio',
        ]} />
        <Cal tone="attn" label="Atenção">
          <p>O pedido só avança para “pronto para envio” quando o checklist obrigatório está completo. É a rede de segurança da operação.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'frete', num: '15', group: 'Pedidos & envio', title: 'Frete e envios',
    intro: 'Responde rápido àquela pergunta: “quanto fica para enviar?”. A integração de frete é um apoio opcional — o sistema funciona com ou sem ela.',
    body: (
      <React.Fragment>
        <Concept items={[
          { icon: 'truck', title: 'Com integração conectada', body: 'Calcula o frete, mostra as opções, salva a cotação escolhida no pedido e guarda o rastreio.' },
          { icon: 'fileText', title: 'Sem integração', body: 'Você informa o frete manualmente, anexa a etiqueta em PDF, salva o rastreio e conclui o envio normalmente.' },
        ]} />
        <h5>Calculadora avulsa (antes de fechar o pedido)</h5>
        <Steps>
          <span><strong>Escolha o produto</strong> e a quantidade.</span>
          <span><strong>Informe o CEP</strong> da cliente e a embalagem.</span>
          <span><strong>Calcule.</strong></span>
          <span><strong>Copie a resposta</strong> pronta para mandar no WhatsApp.</span>
        </Steps>
        <Panel label="Mensagem gerada">{`Oi, Maria! Para o seu CEP, encontrei estas opções:

PAC:    R$ 24,90 — até 6 dias úteis
SEDEX:  R$ 38,70 — até 2 dias úteis

Com PAC, o total do seu pedido fica R$ 149,90.`}</Panel>
        <Cal tone="err" label="Se o frete não calcular">
          <p>Confira o CEP, e se o produto tem peso e dimensões cadastrados. Se a integração estiver fora do ar, é só <strong>preencher o frete manualmente</strong> — nada trava o seu pedido.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'etiquetas', num: '16', group: 'Pedidos & envio', title: 'Etiquetas',
    intro: 'Ajudam a identificar tudo num piscar de olhos — e sempre mostram o nome junto do código, para você não precisar decorar números.',
    body: (
      <React.Fragment>
        <MTable head={['Tipo', 'Para quê']} rows={[
          ['Item / SKU', 'Vela, vidro, essência na prateleira'],
          ['Lote', 'Lote produzido ou comprado, com data'],
          ['Localização', 'Prateleira, bancada, área de cura'],
          ['Pedido interno', 'Organizar a operação (não é a etiqueta de envio!)'],
          ['Envio', 'Vem da integração, do marketplace ou anexada em PDF'],
        ]} />
        <Panel label="Etiqueta de item">{`▮▮▮ ▮ ▮▮▮ ▮ ▮▮   (código de barras)
010300000128
VEL-LAV-156
Vela Lavanda Francesa 156ml`}</Panel>
        <p>Você pode imprimir uma etiqueta de cada vez ou várias em massa, reimprimir quando precisar, escolher o modelo e usar folha A4 ou rolo contínuo.</p>
      </React.Fragment>
    ),
  },
  {
    id: 'marketplace', num: '17', group: 'Pedidos & envio', title: 'Pedidos de marketplace',
    intro: 'Shopee, Mercado Livre, TikTok Shop. Mesmo sem conexão automática, você controla tudo por aqui.',
    body: (
      <React.Fragment>
        <h5>Registrar um pedido de marketplace</h5>
        <Steps>
          <span><strong>Crie um pedido</strong> e escolha o canal.</span>
          <span><strong>Informe o número externo</strong> do marketplace.</span>
          <span><strong>Adicione os produtos.</strong></span>
          <span><strong>Baixe a etiqueta</strong> no marketplace e <strong>anexe o PDF</strong> ao pedido.</span>
          <span><strong>Imprima pelo sistema</strong> e siga a separação e embalagem normalmente.</span>
        </Steps>
        <Cal tone="note" label="Mapeamento de SKU">
          <p>Se o marketplace usa outro código, ensine o sistema uma vez: <code>SKU Shopee: LAVANDA_156</code> → <code>VEL-LAV-156</code>. Nas próximas importações, ele reconhece sozinho.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'ia', num: '18', group: 'Apoio', title: 'Conteúdo com IA',
    intro: 'Uma ajudante para escrever — descrições, legendas, mensagens — sempre no tom da marca. Só texto: ela não cria imagens nem publica nada sozinha.',
    body: (
      <React.Fragment>
        <h5>Como gerar um texto</h5>
        <Steps>
          <span><strong>Abra o produto</strong> e clique em “Gerar conteúdo com IA”.</span>
          <span><strong>Escolha o tipo</strong> (descrição, legenda de Instagram, mensagem de WhatsApp…).</span>
          <span><strong>Diga o que quer transmitir</strong> e escolha o tom.</span>
          <span><strong>Gere as opções,</strong> leia com calma e <strong>edite</strong> à vontade.</span>
          <span><strong>Salve ou copie</strong> o texto aprovado.</span>
        </Steps>
        <Panel label="Exemplo de pedido para a IA">{`Produto:          Vela Lavanda Francesa
Quero transmitir: paz, descanso, fim de dia
Ocasião:          autocuidado
Tom:              acolhedor e poético
Gerar:            legenda de Instagram curta`}</Panel>
        <Cal tone="attn" label="Atenção">
          <p>A IA não inventa dados técnicos (tempo de queima, benefícios, composição). Ela respeita a voz da marca — <em className="mn-muted-em">acolhedora, serena, poética</em> — e evita urgência agressiva e promessas exageradas. O texto final é sempre seu: revise antes de aprovar.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'financeiro', num: '19', group: 'Apoio', title: 'Financeiro',
    intro: 'Um controle gerencial simples: entradas, saídas e uma noção de margem. Para ver para onde o dinheiro vai e de onde vem.',
    body: (
      <React.Fragment>
        <Concept items={[
          { icon: 'trendUp', title: 'Entradas', body: 'Pagamento de pedido, venda direta, recebimento manual.' },
          { icon: 'trendDown', title: 'Saídas', body: 'Matéria-prima, embalagem, frete, taxas de marketplace, marketing, assinaturas.' },
        ]} />
        <Cal tone="attn" label="Atenção">
          <p>Este financeiro é <strong>gerencial</strong>: ajuda você a se organizar, mas não substitui contador, nota fiscal nem controle fiscal oficial.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'rotinas', num: '20', group: 'Apoio', title: 'Rotinas recomendadas',
    intro: 'Pequenos rituais que deixam tudo sob controle, sem peso.',
    body: (
      <React.Fragment>
        <h4>Rotina diária</h4>
        <Check id="rotina-diaria" items={[
          'Abrir “Hoje no ateliê” e ver as pendências',
          'Conferir pedidos pagos e gerar a pick list',
          'Separar, conferir e embalar pedidos',
          'Calcular fretes e anexar etiquetas de envio',
          'Marcar pedidos enviados',
          'Conferir itens abaixo do mínimo e registrar compras/perdas',
        ]} />
        <h4>Rotina de produção</h4>
        <Check id="rotina-producao" items={[
          'Ver demanda e planejar a OP',
          'Conferir materiais e gerar a pick list de produção',
          'Separar materiais e produzir',
          'Registrar perdas e criar o lote',
          'Enviar para cura · revisar e liberar depois',
        ]} />
        <h4>Semanal &amp; mensal</h4>
        <p><strong>Semana:</strong> revisar estoque baixo, fornecedores, contas a pagar, lotes bloqueados e custos. <strong>Mês:</strong> conferir vendas e margem, atualizar custos médios, revisar preços e fazer a contagem de estoque principal.</p>
      </React.Fragment>
    ),
  },
  {
    id: 'problemas', num: '21', group: 'Apoio', title: 'Problemas comuns',
    intro: 'Quase tudo tem uma explicação simples. Aqui estão as mais frequentes.',
    body: (
      <React.Fragment>
        <Cal tone="err" label="Produto não aparece disponível">
          <p>Provavelmente está <strong>em cura</strong>, bloqueado ou reservado para um pedido. Pode também estar com estoque físico zerado, com o lote ainda não liberado, ou o item foi arquivado.</p>
        </Cal>
        <Cal tone="err" label="Não deixa finalizar a separação">
          <p>Falta um item, foi escaneado o item errado, a quantidade separada está menor que a necessária, ou o lote está bloqueado / em cura.</p>
        </Cal>
        <Cal tone="err" label="O leitor não funciona">
          <p>Use a busca manual e os botões +1 / −1, ou digite o código. Confira se o campo principal está selecionado e se o leitor envia “Enter” após a leitura.</p>
        </Cal>
        <Cal tone="err" label="Código não reconhecido">
          <p>Pode ser etiqueta antiga, código danificado, leitura incompleta ou item sem código cadastrado. Reimprima a etiqueta ou busque o item pelo nome.</p>
        </Cal>
      </React.Fragment>
    ),
  },
  {
    id: 'glossario', num: '22', group: 'Apoio', title: 'Glossário rápido',
    body: (
      <MTable head={['Termo', 'Significado simples']} rows={[
        ['Ateliê OS', 'O sistema interno do ateliê'],
        ['Item', 'Produto, insumo ou embalagem cadastrada'],
        ['SKU', 'O apelido fácil de um item'],
        ['Código interno', 'O número que o leitor enxerga'],
        ['Lote', 'Grupo comprado ou produzido junto'],
        ['Receita', 'A fórmula usada para produzir'],
        ['OP', 'Ordem de Produção'],
        ['Pick list', 'Lista de separação'],
        ['Modo Operação', 'Tela rápida de bancada (leitor ou manual)'],
        ['Disponível', 'Livre para usar ou vender'],
        ['Reservado', 'Já prometido para um pedido'],
        ['Em cura', 'Produzido, mas ainda descansando'],
        ['Bloqueado', 'Impedido de uso até revisão'],
      ]} />
    ),
  },
  {
    id: 'fluxo', num: '23', group: 'Apoio', title: 'O fluxo completo, em um respiro',
    intro: 'Da matéria-prima ao envio — o caminho inteiro de uma vela dentro do sistema.',
    body: (
      <React.Fragment>
        <Flow steps={[
          'Cadastrar itens e receitas',
          'Receber compras',
          'Planejar e separar a produção',
          'Produzir e enviar para cura',
          'Liberar o lote após a cura',
          'Criar pedido e reservar estoque',
          'Gerar pick list e separar',
          'Embalar com checklist',
          'Calcular frete e anexar etiqueta',
          'Enviar e registrar o financeiro',
        ]} />
        <div className="mn-end">
          <div className="mn-end-k">Para fechar</div>
          <h3>O Ateliê OS existe para deixar a sua rotina mais leve e segura. Ele não substitui o seu cuidado — ele cuida de você enquanto você cuida das velas.</h3>
          <p>Comece devagar, faça os cadastros com calma e deixe o sistema te lembrar do que vem depois. Em poucos dias, tudo isso vira instinto. Qualquer dúvida, este guia está sempre aqui.</p>
          <div className="mn-end-sig">— feito com carinho para o seu ateliê</div>
        </div>
      </React.Fragment>
    ),
  },
];

export const MANUAL_GROUPS: ManualGroup[] = (() => {
  const order: string[] = [];
  const map: Record<string, ManualSection[]> = {};
  MANUAL_SECTIONS.forEach(s => {
    if (!map[s.group]) { map[s.group] = []; order.push(s.group); }
    map[s.group].push(s);
  });
  return order.map(g => ({ label: g, sections: map[g] }));
})();



