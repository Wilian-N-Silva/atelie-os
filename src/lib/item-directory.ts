"use client";

import * as React from "react";
import { fetchItems, type CatalogItem, type ItemType } from "@/lib/items";
import type { ItemSummary, ItemKind } from "@/lib/domain";

const TYPE_MAP: Record<ItemType, ItemKind> = {
  finished_good: "pa",
  kit: "kit",
  raw_material: "mp",
  packaging: "emb",
  auxiliary: "mp",
};

export function catalogToItemSummary(item: CatalogItem): ItemSummary {
  return {
    id: item.id,
    code: item.code,
    sku: item.sku,
    name: item.name,
    variant: item.variant ?? "",
    type: TYPE_MAP[item.type],
    unit: item.unit,
    available: item.available,
    min: item.min,
    costAvg: item.averageCost ?? item.estimatedCost ?? 0,
    price: item.currentPrice ?? 0,
    weightG: item.weightG,
    packedWeightG: item.packedWeightG,
    dimensions: item.dimensions,
    packedDimensions: item.packedDimensions,
    collection: item.metadata.collection ?? undefined,
    aroma: item.metadata.aroma ?? undefined,
    kitMode: item.metadata.kitMode === "virtual" ? "virtual" : item.metadata.kitMode === "assembled" ? "assembled" : null,
    kitComponents: item.kitComponents ?? [],
  };
}

export type ItemDirectory = {
  items: ItemSummary[];
  find: (sku: string) => ItemSummary | undefined;
  products: ItemSummary[];
  materials: ItemSummary[];
  loading: boolean;
};

export function useItemDirectory(): ItemDirectory {
  const [items, setItems] = React.useState<ItemSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    fetchItems()
      .then((response) => {
        if (alive) setItems(response.items.map(catalogToItemSummary));
      })
      .catch(() => null)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  return React.useMemo(() => {
    const bySku = new Map(items.map((item) => [item.sku, item]));
    return {
      items,
      find: (sku: string) => bySku.get(sku),
      products: items.filter((item) => item.type === "pa" || item.type === "kit"),
      materials: items.filter((item) => item.type === "mp" || item.type === "emb"),
      loading,
    };
  }, [items, loading]);
}
