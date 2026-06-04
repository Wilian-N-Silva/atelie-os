# Next Steps

## Today's Progress - June 4, 2026

- Last active-app commit: `85b95c5 Rework labels and kanban settings`.
- Previous commits completed today:
  - `c9e66a7 Refine recipe component editor`
  - `ab2ad81 Improve recipe and inventory workflows`
  - `1526c86 Use date input for production planning`
  - `0b76722 Improve production planning dialog`
  - `1ff0ef8 Expand operation workflow for production`
  - `1c92991 Expand order creation dialog details`
  - `396924e Refine order picking workflow`

## Completed Product Areas

- Pedidos:
  - Manual payment confirmation for orders still marked as awaiting payment.
  - Full-page new order flow with channel, multiple items, editable unit price, freight, discount, tracking, label type, notes, and stock warning without blocking creation.
  - Order dialog and pick list now support a more realistic operation workflow.

- Operacao:
  - Order workflow supports payment, separation, conference, and packaging handoff.
  - Production workflow can be started from scanned OP/pick-list codes and used for material separation.

- Producao:
  - Planning dialog includes available materials, planned date input, responsible person, material shortage alerts, and production pick list.
  - Production Kanban now reads configured workflow steps instead of a hardcoded-only layout.

- Receitas:
  - Recipe component/version editor was aligned more closely to the design.
  - New version flow shows existing recipe components and supports editing quantities or adding new items.

- Estoque / Itens:
  - Inventory dialogs cover counting, stock adjustment, movement, and label printing entry points.
  - SKU/internal code generation follows the documented pattern in the active app.

- Etiquetas:
  - Label screen was reworked into a real label queue and sheet print document rather than printing the visible UI.
  - Skip-used-label positions now affect sheet placement.
  - Removing queue items clears stale print feedback.
  - New sheet model creation works through a tenant-scoped shared store, not `localStorage`.
  - Project barcode type setting added with preview.
  - Add-label dialog supports per-label barcode type.
  - Settings sheet cards now open a detail dialog with sheet preview, barcode examples, and edit controls.

- Configuracoes / Kanban:
  - Workflow settings now match the design intent: Production/Pedidos tabs, presets, step reorder, colors, flags, automations, save feedback, and archive action.
  - Order drawer stepper reads the configured order workflow.
  - Production Kanban reads the configured production workflow and keeps fallback columns for demo records.

## Verified

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run test`

## Next Steps

1. Manual QA labels:
   - Create a new sheet model.
   - Open an existing sheet model and edit dimensions.
   - Change the default barcode type and confirm the preview updates.
   - Add labels with different barcode types.
   - Skip used sheet positions and confirm printed placement.
   - Remove a label from the queue and confirm stale print feedback disappears.
   - Use browser print/PDF and confirm only label pages are rendered.

2. Physical barcode validation:
   - Test Code 128, Code 39, EAN-13, and QR with the real printer and scanner.
   - If scanning is unreliable, replace the visual barcode renderer with a standards-compliant encoder for print output.

3. Manual QA workflows:
   - Load each production preset and confirm columns update in Producao.
   - Rename steps and confirm records remain mapped by technical key.
   - Toggle flags and automations.
   - Move and archive steps.
   - Confirm Pedido drawer stepper reflects the configured order flow.

4. Backend persistence:
   - Replace in-memory tenant stores for label sheets, barcode settings, and workflows with tenant-backed API/DB persistence.
   - Keep `localStorage` out of these tenant configuration paths.
   - Add owner/admin permission checks for editing workflow and label settings.

5. Regression QA:
   - New order creation with overstock warning and custom item price.
   - Payment confirmation from an awaiting-payment order.
   - Order pick list barcode handoff into Modo Operacao.
   - Production pick list barcode handoff into Modo Operacao.
   - Recipe version creation and inventory dialogs.

## Worktree Notes

- Active app `src/` changes from this slice were committed.
- The `design/` folder still has many pre-existing user/prototype modifications. Keep them separate from active-app commits unless explicitly syncing the prototype.
- `docs/next-steps-tomorrow.md` is the handoff note for the next session.
