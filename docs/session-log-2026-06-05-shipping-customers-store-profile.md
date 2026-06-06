# Session Log - 2026-06-05 - Shipping, Customers, Store Profile

This log captures the work done in the ngrok/sandbox session so the project can be resumed without replaying the full chat.

## Environment Used

- Public test URL: `https://ablutionary-unvesiculated-marylynn.ngrok-free.dev`
- Webhook URL registered in Melhor Envio sandbox:
  `https://ablutionary-unvesiculated-marylynn.ngrok-free.dev/api/app/shipping/webhook/melhor-envio`
- OAuth callback in use:
  `https://ablutionary-unvesiculated-marylynn.ngrok-free.dev/api/app/shipping/oauth/callback`
- Next dev resources require `allowedDevOrigins` for the ngrok host.

## Melhor Envio Work Completed

- Fixed auth/base URL behavior so OAuth callback and app redirects use the ngrok public URL instead of `localhost`.
- Added `allowedDevOrigins` for the ngrok domain in `next.config.mjs`.
- Improved Better Auth trusted origins for local/ngrok development.
- OAuth callback now enables Melhor Envio in shipping settings after a successful connection.
- Quote endpoint now calls the real Melhor Envio calculate API with:
  - OAuth access token from encrypted per-tenant credentials;
  - refresh-token retry;
  - provider status/error logging without exposing secrets;
  - both `products` and `volumes` payloads.
- Webhook endpoint added at `/api/app/shipping/webhook/melhor-envio`:
  - validates `X-ME-Signature` with HMAC-SHA256;
  - accepts sandbox validation payloads;
  - records signed events as audit log `shipping.update`.
- Selected quote persistence implemented:
  - order metadata stores provider, service id/name, carrier, price, deadline, selected timestamp;
  - server recalculates order total from order lines + freight - discount.
- Cart/label foundation implemented:
  - `POST /api/app/shipping/labels` inserts selected quote into Melhor Envio cart using `POST /api/v2/me/cart`;
  - stores `metadata.shippingLabel` with external id/protocol/status/service/price/tracking data;
  - drawer has the data-entry flow for sender, recipient, package, insurance, AR, own hand, declaration/NF-e.
- Label actions implemented:
  - `PATCH /api/app/shipping/labels` supports `checkout`, `generate`, `preview`, and `print`;
  - order drawer exposes `Comprar`, `Gerar`, `Previa`, `Imprimir`;
  - updates `checkoutAt`, `generatedAt`, `previewUrl`, `printUrl` when the provider succeeds.

## Melhor Envio Current Blocker

- Quote through ngrok worked.
- Cart insertion reaches Melhor Envio but provider returns:
  - `403`
  - `This action is unauthorized.`
- Verified OAuth start redirect includes:
  `shipping-calculate shipping-checkout shipping-generate shipping-preview shipping-print shipping-tracking`
- After reconnect, local credential still has empty `scope` in DB, and `/me/cart` remains unauthorized.
- Follow-up check found Melhor Envio `/me/cart` also requires `cart-read` and `cart-write`.
- Updated `.env`, `.env.example`, default OAuth scope fallback, and integration docs to request:
  `shipping-calculate shipping-checkout shipping-generate shipping-preview shipping-print shipping-tracking cart-read cart-write`
- Next action is in Melhor Envio sandbox panel/account:
  confirm the app/account has `cart-read` and `cart-write`, restart the dev server, disconnect/reconnect OAuth, then retest `/me/cart`.

## Functional Checks Already Done

- Quote test through ngrok returned real services, including Jadlog `.Com`.
- Applying quote to order `#1037` persisted:
  - freight `15.96`
  - total `158.96`
  - quote `Jadlog .Com`
- Webhook test payload succeeded after endpoint accepted signed validation payloads.

## Customer And Store Profile Work Started

Implemented:

- New `customers` table.
- New `orders.customer_id`.
- New audit action `customer.upsert`.
- Migration added:
  `drizzle/0006_customer_store_profile.sql`
- Local DB migration was applied successfully with `npm.cmd run db:migrate`.
- New API:
  - `GET /api/app/customers`
  - `POST /api/app/customers`
- New client helper:
  - `src/lib/customers-client.ts`
- New ViaCEP proxy:
  - `GET /api/app/postal-code?cep=00000000`
  - client helper `src/lib/postal-code-client.ts`
- Order creation now:
  - searches existing customers using the same autocomplete pattern used in incidents;
  - creates/updates customer records from the order form;
  - stores customer origin as `order_<channel>`, including future marketplace channels;
  - links the order to `customer_id`;
  - stores a customer snapshot on the order metadata.
- Marketplace direction:
  - future Shopee/Mercado Livre imports should also save customers;
  - preserve source/channel for analytics;
  - later dedupe by document, email, phone, or external marketplace buyer id.
- Order drawer now flags incomplete customer data before shipping/label generation.

## Store / Sender / Fiscal Profile Work Started

Implemented in `Configurações > Envio`:

- store name;
- sender name;
- sender phone/email;
- sender CPF/CNPJ;
- state registration;
- sender address, number, complement, district, UF;
- fiscal regime placeholder.

These values are saved under `company_settings.settings.shipping` and are reused to prefill sender fields in the shipping label drawer.

Later refinements completed:

- Split shipping settings into separate sections:
  - Melhor Envio connection;
  - store/fiscal data;
  - shipping origin addresses;
  - quote test.
- Replaced inline sender/origin form with real address cards.
- Clicking an address card opens a larger dialog for editing the sender/origin address.
- Address dialogs start with CEP and trigger ViaCEP lookup automatically when 8 digits are entered; the manual search button remains available.
- Multiple shipping origin addresses are saved in `company_settings.settings.shipping.shippingAddresses`.
- A default shipping origin address is saved as `defaultShippingAddressId`.
- Sender document type is explicit (`cpf` or `cnpj`) so CPF and CNPJ are no longer written into both Melhor Envio fields.
- Sender data is validated before enabling/using Melhor Envio:
  - name;
  - phone;
  - email;
  - valid CPF/CNPJ;
  - CEP;
  - address, number, district, city and UF.
- Backend also rejects invalid sender/recipient document/address data before calling Melhor Envio, returning a local actionable message instead of surfacing only provider `400`.

## Order Shipping UX Refinements

Implemented after the first shipping/customer pass:

- Order detail is no longer a narrow modal-style dialog. It was converted into a full page-like view using the same `order-create-layout` structure as the new order screen:
  - page header with back button;
  - left menu;
  - main content area;
  - sticky right summary/actions column.
- The shipping/label area in order detail is now a step-based flow:
  1. quote freight;
  2. confirm recipient;
  3. select saved sender card;
  4. insert into Melhor Envio cart / label actions.
- Sender fields were removed from the order detail form. The order only selects one of the saved sender cards from settings.
- Selected sender card has visible selected state and badge.
- Freight quote options are rendered as selectable cards.
- Applied quote card has visible applied state and badge.
- Recipient CEP auto-fills address via ViaCEP after 8 digits and still has a manual search button.
- Recipient phone, email and CPF/CNPJ fields were moved into a dedicated grid to avoid width overflow/truncation.
- `AR` and `Mão própria` now have click popovers explaining:
  - AR = Aviso de Recebimento, proof of delivery signed by receiver;
  - Mão própria = restrict delivery to the named recipient when the carrier supports it.
- New order screen now also has a freight quote block under `Valores`:
  - uses the customer CEP;
  - uses package defaults derived from selected items;
  - displays Melhor Envio rate cards;
  - applying a rate fills the freight amount;
  - manual freight remains available as fallback.
- When a quote is applied while creating a manual order, the quote metadata is included in the order payload so the detail page starts with that selected shipping quote.

## Product Logistics Work Started

Implemented:

- `ItemSummary` now carries:
  - `weightG`;
  - `packedWeightG`;
  - `dimensions`;
  - `packedDimensions`.
- Order quote drawer computes default package weight/dimensions from order items:
  - uses packed values first;
  - falls back to product values;
  - keeps conservative minimum defaults.
- Sellable item validation now rejects missing logistics:
  - `sellable_weight_required`;
  - `sellable_dimensions_required`.

Remaining:

- Browser QA the item modal with `Vendavel` active.
- Consider a bulk report/filter for sellable SKUs missing logistics.

## Files Added In This Session

- `src/app/api/app/customers/route.ts`
- `src/app/api/app/postal-code/route.ts`
- `src/app/api/app/shipping/labels/route.ts`
- `src/app/api/app/shipping/webhook/melhor-envio/route.ts`
- `src/lib/customers-client.ts`
- `src/lib/postal-code-client.ts`
- `src/lib/shipping-client.ts`
- `src/lib/melhor-envio-webhook.ts`
- `src/lib/melhor-envio-webhook.test.ts`
- `src/lib/shipping-integrations-server.test.ts`
- `drizzle/0006_customer_store_profile.sql`

## Verification

Latest completed checks before this log:

- `npm.cmd run db:migrate` passed and applied `0006_customer_store_profile`.
- `npm.cmd run lint` passed.
- `npm.cmd run test` passed: 33 tests, 0 failed.
- `npm.cmd run build` passed.
- Item modal now shows friendly errors for missing sellable weight/dimensions and marks logistics fields as required when `Vendavel` is active.
- Functional ngrok customer/order test passed:
  - ViaCEP lookup returned HTTP 200 for `04102000`;
  - order creation returned an order with `customerId`;
  - `customerIncomplete` was `false` for complete document/address data;
  - `/api/app/customers` returned the newly created customer with city `Sao Paulo`.
- After the latest shipping UI refactor, the following were run again successfully:
  - `npm.cmd run lint`;
  - `npm.cmd run build`;
  - `npm.cmd run test` with 33 passing tests.

Run next before handing off or committing:

- browser QA of Settings > Envio address card/dialog editing;
- browser QA of new order freight quote/apply flow;
- browser QA of order detail page flow after replacing the modal-style dialog.

## Next Recommended Steps

1. Finish customer/order QA:
   - create direct-channel order with new customer;
   - fill CEP through ViaCEP;
   - confirm `customers` row and `orders.customer_id`;
   - confirm order drawer shows incomplete-data warning only when appropriate.
2. Improve item logistics UX:
   - show friendly validation messages for missing sellable weight/dimensions;
   - mark packed weight/dimensions as required when `Vendavel` is active.
3. Resolve Melhor Envio provider 403 for `/me/cart`.
4. After `/me/cart` succeeds, validate checkout/generate/preview/print end to end.
5. Add future marketplace import contract:
  - external buyer id;
  - marketplace channel;
  - customer dedupe strategy;
  - privacy/data-retention note.
6. UX follow-up:
   - visually compare order creation and order detail page in browser;
   - decide whether the order detail should support editing all sections or remain mostly operational/view-only;
   - consider extracting shared shipping quote/label UI to reduce duplication between create/detail flows.
