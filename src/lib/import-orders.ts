/**
 * Parse a marketplace order export (CSV) into normalized orders. One row per
 * order line; rows are grouped by the external order id. Provider-agnostic:
 * Mercado Livre / Nuvemshop / Shopee exports are mapped via column aliases.
 */

export type ImportLine = { sku: string; qty: number; price: number };
export type ParsedImportOrder = {
  externalOrderId: string;
  buyerName: string;
  buyerEmail: string;
  tracking: string;
  labelPdfUrl: string;
  lines: ImportLine[];
  total: number;
};

const COLUMN_ALIASES: Record<string, string[]> = {
  order: ["pedido", "order", "order_id", "orderid", "numero", "numero_pedido", "n_pedido", "codigo_pedido"],
  buyer: ["cliente", "comprador", "buyer", "nome", "nome_cliente", "buyer_name"],
  email: ["email", "e_mail", "buyer_email"],
  tracking: ["rastreio", "tracking", "tracking_code", "codigo_rastreio"],
  label: ["etiqueta", "label", "label_pdf", "pdf_etiqueta", "url_etiqueta", "print_url"],
  sku: ["sku", "codigo", "cod", "sku_externo", "item_sku"],
  qty: ["quantidade", "qtd", "quantity", "qty", "unidades"],
  price: ["preco", "preco_unitario", "price", "unit_price", "valor", "valor_unitario"],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i += 1; } else { quoted = false; }
      } else { current += char; }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(current); current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function toNumber(value: string): number {
  let text = (value ?? "").replace(/[^\d.,-]/g, "");
  if (text.includes(".") && text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  else if (text.includes(",")) text = text.replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseOrdersCsv(text: string): ParsedImportOrder[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = splitRow(lines[0], delimiter).map(normalizeHeader);

  const indexOf = (key: string) => {
    for (const alias of COLUMN_ALIASES[key]) {
      const idx = header.indexOf(alias);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const cols = {
    order: indexOf("order"),
    buyer: indexOf("buyer"),
    email: indexOf("email"),
    tracking: indexOf("tracking"),
    label: indexOf("label"),
    sku: indexOf("sku"),
    qty: indexOf("qty"),
    price: indexOf("price"),
  };
  if (cols.order < 0 || cols.sku < 0) return [];

  const byOrder = new Map<string, ParsedImportOrder>();
  for (let i = 1; i < lines.length; i += 1) {
    const row = splitRow(lines[i], delimiter);
    const externalOrderId = (row[cols.order] ?? "").trim();
    const sku = (row[cols.sku] ?? "").trim();
    if (!externalOrderId || !sku) continue;
    const qty = cols.qty >= 0 ? toNumber(row[cols.qty] ?? "") : 1;
    const price = cols.price >= 0 ? toNumber(row[cols.price] ?? "") : 0;
    const quantity = qty > 0 ? qty : 1;

    let order = byOrder.get(externalOrderId);
    if (!order) {
      order = {
        externalOrderId,
        buyerName: cols.buyer >= 0 ? (row[cols.buyer] ?? "").trim() : "",
        buyerEmail: cols.email >= 0 ? (row[cols.email] ?? "").trim() : "",
        tracking: cols.tracking >= 0 ? (row[cols.tracking] ?? "").trim() : "",
        labelPdfUrl: cols.label >= 0 ? (row[cols.label] ?? "").trim() : "",
        lines: [],
        total: 0,
      };
      byOrder.set(externalOrderId, order);
    }
    order.lines.push({ sku, qty: quantity, price });
    order.total += quantity * price;
  }

  return [...byOrder.values()].map((order) => ({ ...order, total: Math.round(order.total * 100) / 100 }));
}
