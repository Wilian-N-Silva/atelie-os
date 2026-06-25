b# Public Order Tracking API

Read-only, unauthenticated, CORS-enabled API for an external site (the separate
company website) to show a customer where their order is. It exposes only a
sanitized view: payment status, fulfillment stage + timeline, and carrier
tracking. No PII, costs, tokens, or internal labels are returned.

The data is source-agnostic: whether an order was created manually, via Melhor
Envio, or (later) imported from a marketplace, this endpoint reflects the
order's current `status`, `paymentStatus`, and `tracking`.

## Endpoint

```
GET {BASE_URL}/api/public/track
```

- `{BASE_URL}` is the ERP app origin (e.g. `https://app.suaempresa.com`). In local dev it is `http://localhost:3000`.
- CORS: `Access-Control-Allow-Origin: *`, methods `GET, OPTIONS`. Safe to call from the browser of another domain.
- `Cache-Control: no-store`.
- No API key. Authorization is the unguessable token (or the order number + email/CEP pair).

## Lookup modes

Pick one:

1. **Shareable link (recommended for customers).** Use the order's opaque tracking token:
   ```
   GET /api/public/track?token=<track_token>
   ```
   The token comes from the order (`order.trackToken`). Build customer links on the site as `https://seusite.com/rastreio/<track_token>` and have the page call this endpoint with that token.

2. **Manual lookup.** Company slug plus order number and the email OR postal code used on the order (the email/CEP is the authorization factor):
   ```
   GET /api/public/track?company=<company_slug>&order=<number>&email=<email>
   GET /api/public/track?company=<company_slug>&order=<number>&cep=<8 digits>
   ```

## Response `200`

```json
{
  "order": { "number": "#9999", "placedAt": "2026-06-03T09:00:00.000Z" },
  "payment": { "status": "pago", "label": "Pagamento confirmado" },
  "status": { "stage": "em_transito", "label": "Em trânsito" },
  "timeline": [
    { "stage": "recebido",     "label": "Pedido recebido", "at": "2026-06-03T09:00:00.000Z", "done": true },
    { "stage": "em_preparacao","label": "Em preparação",    "at": null,                        "done": true },
    { "stage": "embalado",     "label": "Embalado",         "at": null,                        "done": true },
    { "stage": "enviado",      "label": "Enviado",          "at": "2026-06-04T14:00:00.000Z", "done": true },
    { "stage": "em_transito",  "label": "Em trânsito",      "at": "2026-06-05T10:00:00.000Z", "done": true },
    { "stage": "entregue",     "label": "Entregue",         "at": null,                        "done": false }
  ],
  "shipping": {
    "carrier": "Correios",
    "service": "PAC",
    "code": "OY123456789BR",
    "url": "https://www.linkcorreios.com.br/?id=OY123456789BR",
    "estimatedDays": 6
  }
}
```

Fields:

- `payment.status`: `pago` | `aguardando`. `payment.label` is display-ready pt-BR.
- `status.stage`: current fulfillment stage (see enum below). `status.label` is display-ready.
- `timeline[]`: the fixed ordered stages; `done` marks reached stages, `at` is an ISO timestamp when known (else `null`).
- `shipping`: `null` until there is a carrier/quote; otherwise carrier name, service, tracking `code`, `url`, and `estimatedDays`.

### Stage enum

`recebido` -> `em_preparacao` -> `embalado` -> `enviado` -> `em_transito` -> `entregue`, plus `cancelado` (terminal). Render your own copy/icons from `stage`; do not parse `label`.

## Errors

- `429 { "error": "rate_limited" }` - too many lookup attempts from the same client IP; retry after the `Retry-After` header.

- `400 { "error": "missing_params" }` — no `token` and no valid `order` + `email`/`cep` pair.
- `404 { "error": "not_found" }` — generic on purpose (it does not reveal whether an order exists).

## Integration examples

Vanilla fetch:

```js
const BASE = "https://app.suaempresa.com";

async function track({ token, company, order, email, cep }) {
  const qs = new URLSearchParams(
    token ? { token } : cep ? { company, order, cep } : { company, order, email },
  );
  const res = await fetch(`${BASE}/api/public/track?${qs}`);
  if (res.status === 404) return null;       // not found
  if (!res.ok) throw new Error("tracking_unavailable");
  return res.json();
}
```

React (site consuming a `/rastreio/[token]` route):

```jsx
const data = await track({ token });
// render data.status.label, data.timeline, data.shipping ...
```

## Notes / limits

- Treat the `track_token` as a capability: anyone with the link can see that order's tracking. It is unguessable and carries no PII.
- Public lookups are rate-limited per client IP. Token lookup is globally unique; manual `order` + `email`/`cep` lookup is scoped by the public company slug.
- An internal preview renderer lives at `{BASE_URL}/rastreio` (reference only; the real customer page is on the separate site).
