/**
 * Kit composition helpers (pure).
 *
 * A kit can work in two modes:
 * - "assembled": built via a production OP; it has its own stock. Order lines
 *   move the kit's own stock (default behavior).
 * - "virtual": a bundle with no stock of its own; selling it moves the
 *   component products' stock. Order lines are decomposed into components.
 */

export type KitMode = "assembled" | "virtual";

export type KitComponent = { itemId: string; sku: string; perKit: number };

export type StockTarget = { itemId: string; quantity: number; sku: string; sourceKey: string };

export function isKitMode(value: unknown): value is KitMode {
  return value === "assembled" || value === "virtual";
}

/**
 * Expand order lines into stock movement targets. Virtual-kit lines become one
 * target per component (qty x perKit); everything else passes through. The
 * sourceKey keeps movement idempotency stable and avoids collisions when a
 * component also appears as its own line.
 */
export function expandStockTargets(
  lines: { itemId: string; quantity: number; sku: string }[],
  virtualKitComponents: Map<string, KitComponent[]>,
): StockTarget[] {
  const targets: StockTarget[] = [];
  for (const line of lines) {
    const components = virtualKitComponents.get(line.itemId);
    if (components && components.length) {
      for (const component of components) {
        const quantity = Math.round(line.quantity * component.perKit * 1000) / 1000;
        if (quantity > 0) {
          targets.push({
            itemId: component.itemId,
            quantity,
            sku: component.sku,
            sourceKey: `kit_${line.itemId}_${component.itemId}`,
          });
        }
      }
    } else {
      targets.push({ itemId: line.itemId, quantity: line.quantity, sku: line.sku, sourceKey: line.itemId });
    }
  }
  return targets;
}

/** Virtual-kit available units = how many full kits the component stock supports. */
export function kitAvailableFromComponents(
  components: KitComponent[],
  availableByItemId: Map<string, number>,
): number {
  if (!components.length) return 0;
  let min = Infinity;
  for (const component of components) {
    if (component.perKit <= 0) continue;
    const available = availableByItemId.get(component.itemId) ?? 0;
    min = Math.min(min, Math.floor(available / component.perKit));
  }
  return Number.isFinite(min) ? Math.max(0, min) : 0;
}
