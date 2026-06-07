"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Empty,
  Field,
  Icon,
  Input,
  Modal,
  Select,
  Sep,
  SortTh,
  Stat,
  Tabs,
  Textarea,
  toast,
  useSort,
} from "@/components/ui";
import { num } from "@/lib/format";
import {
  createInventoryMovement,
  fetchInventory,
  type InventoryItemBalance,
  type InventoryLocation,
  type InventoryManualMovementInput,
  type InventoryManualMovementType,
  type InventoryMovement,
  type InventoryResponse,
} from "@/lib/inventory";
import {
  ITEM_MOVEMENT_LABELS,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_TONES,
  type ItemMovementType,
} from "@/lib/items";
import { canManageInventory } from "@/lib/permissions";
import type { Go, Route, Session } from "@/lib/types";

type InventoryTab = "all" | "with_physical" | "reserved" | "cure" | "blocked" | "below_minimum";

const EMPTY_CARDS: InventoryResponse["cards"] = {
  totalItems: 0,
  belowMinimum: 0,
  physical: 0,
  reserved: 0,
  inCure: 0,
  blocked: 0,
  available: 0,
  locations: 0,
  movements: 0,
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  shelf: "Prateleira",
  bench: "Bancada",
  cure: "Cura",
  shipping: "Expedicao",
  blocked: "Bloqueado",
  packaging: "Embalagens",
};

const MANUAL_MOVEMENT_LABELS: Record<InventoryManualMovementType, string> = {
  purchase_entry: "Entrada de compra",
  transfer: "Transferencia",
  loss: "Perda",
  block: "Bloquear",
  release: "Liberar bloqueado",
};

const MANUAL_MOVEMENT_OPTIONS = [
  { value: "purchase_entry", label: MANUAL_MOVEMENT_LABELS.purchase_entry },
  { value: "transfer", label: MANUAL_MOVEMENT_LABELS.transfer },
  { value: "loss", label: MANUAL_MOVEMENT_LABELS.loss },
  { value: "block", label: MANUAL_MOVEMENT_LABELS.block },
  { value: "release", label: MANUAL_MOVEMENT_LABELS.release },
];

const MOVEMENT_ERROR_LABELS: Record<string, string> = {
  invalid_payload: "Dados invalidos.",
  invalid_movement_type: "Tipo de movimento invalido.",
  item_required: "Selecione um item.",
  item_not_found: "Item nao encontrado.",
  invalid_quantity: "Informe uma quantidade maior que zero.",
  reason_required: "Informe o motivo.",
  from_location_required: "Selecione o local de origem.",
  to_location_required: "Selecione o local de destino.",
  same_location: "Origem e destino devem ser diferentes.",
  from_location_not_found: "Local de origem nao encontrado.",
  to_location_not_found: "Local de destino nao encontrado.",
  blocked_location_required: "Destino deve ser um local de bloqueados.",
  blocked_source_required: "Origem deve ser um local de bloqueados.",
  insufficient_source_stock: "Saldo fisico insuficiente no local de origem.",
  insufficient_blocked_stock: "Saldo bloqueado insuficiente no local de origem.",
};

type MovementFormState = {
  movementType: InventoryManualMovementType;
  itemId: string;
  quantity: string;
  fromLocationId: string;
  toLocationId: string;
  reason: string;
};

function movementRequiresFrom(type: InventoryManualMovementType) {
  return type !== "purchase_entry";
}

function movementRequiresTo(type: InventoryManualMovementType) {
  return type !== "loss";
}

function movementErrorMessage(message: string) {
  return MOVEMENT_ERROR_LABELS[message] ?? message;
}

function itemLocationFallback(item: InventoryItemBalance | null, selectedLocationId: string) {
  return selectedLocationId || item?.defaultLocationId || "";
}

function firstLocation(locations: InventoryLocation[], predicate?: (location: InventoryLocation) => boolean) {
  return locations.find((location) => location.isActive && (!predicate || predicate(location)))?.id ?? "";
}

function defaultMovementForm(data: InventoryResponse | null, selectedLocationId: string): MovementFormState {
  const item = data?.items[0] ?? null;
  const activeLocations = data?.locations.filter((location) => location.isActive) ?? [];
  const defaultLocationId = itemLocationFallback(item, selectedLocationId) || firstLocation(activeLocations);

  return {
    movementType: "purchase_entry",
    itemId: item?.id ?? "",
    quantity: "",
    fromLocationId: "",
    toLocationId: defaultLocationId,
    reason: "",
  };
}

function parseMovementQuantity(value: string) {
  return Number(value.replace(",", "."));
}

function resolveMovementLocations(
  type: InventoryManualMovementType,
  item: InventoryItemBalance | null,
  locations: InventoryLocation[],
  selectedLocationId: string,
  current: Pick<MovementFormState, "fromLocationId" | "toLocationId">,
) {
  const activeLocations = locations.filter((location) => location.isActive);
  const defaultLocationId = itemLocationFallback(item, selectedLocationId) || firstLocation(activeLocations);
  const blockedLocationId = firstLocation(activeLocations, (location) => location.type === "blocked");
  const availableLocationId = firstLocation(activeLocations, (location) => location.type !== "blocked");
  const isAvailableLocation = (locationId: string) => activeLocations.some((location) => location.id === locationId && location.type !== "blocked");
  const nextFromLocationId = current.fromLocationId || defaultLocationId;
  const firstDifferentLocationId = activeLocations.find((location) => location.id !== nextFromLocationId)?.id ?? "";

  switch (type) {
    case "purchase_entry":
      return {
        fromLocationId: "",
        toLocationId: current.toLocationId || defaultLocationId,
      };
    case "loss":
      return {
        fromLocationId: current.fromLocationId || defaultLocationId,
        toLocationId: "",
      };
    case "transfer":
      return {
        fromLocationId: nextFromLocationId,
        toLocationId: current.toLocationId && current.toLocationId !== nextFromLocationId
          ? current.toLocationId
          : firstDifferentLocationId,
      };
    case "block":
      return {
        fromLocationId: isAvailableLocation(current.fromLocationId) ? current.fromLocationId : availableLocationId || defaultLocationId,
        toLocationId: blockedLocationId,
      };
    case "release":
      return {
        fromLocationId: blockedLocationId,
        toLocationId: current.toLocationId && current.toLocationId !== blockedLocationId && isAvailableLocation(current.toLocationId)
          ? current.toLocationId
          : availableLocationId || defaultLocationId,
      };
  }
}

function defaultOperationalLocationId(
  item: InventoryItemBalance | null,
  locations: InventoryLocation[],
  selectedLocationId: string,
) {
  return itemLocationFallback(item, selectedLocationId) || firstLocation(locations.filter((location) => location.isActive));
}

function InventoryMovementModal({
  open,
  data,
  selectedLocationId,
  initialItemId,
  initialMovementType,
  initialReason,
  onClose,
  onCreated,
}: {
  open: boolean;
  data: InventoryResponse | null;
  selectedLocationId: string;
  initialItemId?: string | null;
  initialMovementType?: InventoryManualMovementType;
  initialReason?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = React.useState<MovementFormState>(() => defaultMovementForm(data, selectedLocationId));
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const items = React.useMemo(() => data?.items ?? [], [data?.items]);
  const activeLocations = React.useMemo(
    () => (data?.locations ?? []).filter((location) => location.isActive),
    [data?.locations],
  );
  const selectedItem = items.find((item) => item.id === form.itemId) ?? null;
  const blockedLocations = activeLocations.filter((location) => location.type === "blocked");
  const availableLocations = activeLocations.filter((location) => location.type !== "blocked");
  const fromLocationOptions = form.movementType === "release"
    ? blockedLocations
    : form.movementType === "block"
      ? availableLocations
      : activeLocations;
  const toLocationOptions = form.movementType === "block"
    ? blockedLocations
    : form.movementType === "release"
      ? availableLocations
      : activeLocations;

  React.useEffect(() => {
    if (!open) return;
    const base = defaultMovementForm(data, selectedLocationId);
    const initialItem = initialItemId ? items.find((item) => item.id === initialItemId) ?? null : null;
    const movementType = initialMovementType ?? base.movementType;
    const selectedInitialItem = initialItem ?? items.find((item) => item.id === base.itemId) ?? null;
    setForm({
      ...base,
      movementType,
      itemId: selectedInitialItem?.id ?? base.itemId,
      ...resolveMovementLocations(movementType, selectedInitialItem, activeLocations, selectedLocationId, {
        fromLocationId: "",
        toLocationId: "",
      }),
      reason: initialReason ?? "",
    });
    setError(null);
    setBusy(false);
  }, [open, data, selectedLocationId, initialItemId, initialMovementType, initialReason, items, activeLocations]);

  const setField = <K extends keyof MovementFormState>(key: K, value: MovementFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const changeMovementType = (movementType: InventoryManualMovementType) => {
    setForm((current) => ({
      ...current,
      movementType,
      ...resolveMovementLocations(movementType, selectedItem, activeLocations, selectedLocationId, current),
    }));
    setError(null);
  };

  const changeItem = (itemId: string) => {
    const nextItem = items.find((item) => item.id === itemId) ?? null;
    setForm((current) => ({
      ...current,
      itemId,
      ...resolveMovementLocations(current.movementType, nextItem, activeLocations, selectedLocationId, {
        fromLocationId: "",
        toLocationId: "",
      }),
    }));
    setError(null);
  };

  const submit = async () => {
    const quantity = parseMovementQuantity(form.quantity);
    const reason = form.reason.trim();

    if (!form.itemId) {
      setError(MOVEMENT_ERROR_LABELS.item_required);
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError(MOVEMENT_ERROR_LABELS.invalid_quantity);
      return;
    }
    if (movementRequiresFrom(form.movementType) && !form.fromLocationId) {
      setError(MOVEMENT_ERROR_LABELS.from_location_required);
      return;
    }
    if (movementRequiresTo(form.movementType) && !form.toLocationId) {
      setError(MOVEMENT_ERROR_LABELS.to_location_required);
      return;
    }
    if (form.fromLocationId && form.toLocationId && form.fromLocationId === form.toLocationId) {
      setError(MOVEMENT_ERROR_LABELS.same_location);
      return;
    }
    if (form.movementType === "block" && !blockedLocations.some((location) => location.id === form.toLocationId)) {
      setError(MOVEMENT_ERROR_LABELS.blocked_location_required);
      return;
    }
    if (form.movementType === "release" && !blockedLocations.some((location) => location.id === form.fromLocationId)) {
      setError(MOVEMENT_ERROR_LABELS.blocked_source_required);
      return;
    }
    if (!reason) {
      setError(MOVEMENT_ERROR_LABELS.reason_required);
      return;
    }

    const input: InventoryManualMovementInput = {
      movementType: form.movementType,
      itemId: form.itemId,
      quantity,
      fromLocationId: movementRequiresFrom(form.movementType) ? form.fromLocationId : null,
      toLocationId: movementRequiresTo(form.movementType) ? form.toLocationId : null,
      reason,
    };

    setBusy(true);
    setError(null);

    try {
      await createInventoryMovement(input);
      toast("Movimentacao registrada.", "ok");
      onClose();
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel registrar o movimento.";
      setError(movementErrorMessage(message));
      setBusy(false);
    }
  };

  const quantity = parseMovementQuantity(form.quantity);
  const signedQuantity = Number.isFinite(quantity) ? quantity : 0;
  const movementDelta = form.movementType === "purchase_entry"
    ? signedQuantity
    : form.movementType === "loss"
      ? -signedQuantity
      : 0;
  const nextPhysical = selectedItem ? selectedItem.physical + movementDelta : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar movimento"
      subtitle="Entrada, transferencia, perda, bloqueio ou liberacao de estoque"
      icon="estoque"
      width={680}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="default" icon="check" onClick={submit} disabled={busy || !data}>
            {busy ? "Registrando..." : "Registrar movimento"}
          </Button>
        </>
      )}
    >
      {selectedItem && (
        <div className="grid cols-3" style={{ marginBottom: 16 }}>
          <Stat label="Fisico atual" value={`${num(selectedItem.physical)} ${selectedItem.unit}`} />
          <Stat label="Bloqueado" value={`${num(selectedItem.blocked)} ${selectedItem.unit}`} tone={selectedItem.blocked > 0 ? "info" : undefined} />
          <Stat
            label={movementDelta === 0 ? "Disponivel" : "Novo fisico"}
            value={`${num(movementDelta === 0 ? selectedItem.available : Math.max(0, nextPhysical))} ${selectedItem.unit}`}
            tone={nextPhysical < 0 ? "bad" : stockTone(selectedItem)}
          />
        </div>
      )}

      <div className="grid cols-2">
        <Field label="Tipo de movimento" required>
          <Select
            value={form.movementType}
            onChange={(value) => changeMovementType(value as InventoryManualMovementType)}
            options={MANUAL_MOVEMENT_OPTIONS}
          />
        </Field>

        <Field label="Item" required>
          <Select
            value={form.itemId}
            onChange={changeItem}
            placeholder="Selecione um item"
            options={items.map((item) => ({
              value: item.id,
              label: `${itemTitle(item)} - ${item.sku}`,
            }))}
          />
        </Field>

        {movementRequiresFrom(form.movementType) && (
          <Field label="Origem" required>
            <Select
              value={form.fromLocationId}
              onChange={(value) => setField("fromLocationId", value)}
              placeholder="Selecione o local"
              options={fromLocationOptions.map((location) => ({
                value: location.id,
                label: locationLabel(location),
              }))}
            />
          </Field>
        )}

        {movementRequiresTo(form.movementType) && (
          <Field label="Destino" required>
            <Select
              value={form.toLocationId}
              onChange={(value) => setField("toLocationId", value)}
              placeholder="Selecione o local"
              options={toLocationOptions.map((location) => ({
                value: location.id,
                label: locationLabel(location),
              }))}
            />
          </Field>
        )}

        <Field label={`Quantidade${selectedItem ? ` (${selectedItem.unit})` : ""}`} required>
          <Input
            inputMode="decimal"
            value={form.quantity}
            onChange={(event) => setField("quantity", event.target.value)}
            placeholder="0"
          />
        </Field>
      </div>

      <Field label="Motivo" required hint="O motivo fica registrado na movimentacao e na auditoria.">
        <Textarea
          value={form.reason}
          onChange={(event) => setField("reason", event.target.value)}
          placeholder="Ex.: transferencia para bancada de envase"
        />
      </Field>

      {error && <div className="ff-error" style={{ marginTop: -6 }}>{error}</div>}
    </Modal>
  );
}

function InventoryCountModal({
  open,
  data,
  selectedLocationId,
  initialItemId,
  onClose,
  onCreated,
}: {
  open: boolean;
  data: InventoryResponse | null;
  selectedLocationId: string;
  initialItemId?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [itemId, setItemId] = React.useState("");
  const [counted, setCounted] = React.useState("");
  const [reason, setReason] = React.useState("Contagem fisica");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const items = React.useMemo(() => data?.items ?? [], [data?.items]);
  const activeLocations = React.useMemo(
    () => (data?.locations ?? []).filter((location) => location.isActive),
    [data?.locations],
  );
  const selectedItem = items.find((item) => item.id === itemId) ?? null;
  const countValue = parseMovementQuantity(counted);
  const diff = selectedItem && Number.isFinite(countValue) ? +(countValue - selectedItem.physical).toFixed(3) : 0;

  React.useEffect(() => {
    if (!open) return;
    const initialItem = initialItemId ? items.find((item) => item.id === initialItemId) ?? null : items[0] ?? null;
    setItemId(initialItem?.id ?? "");
    setCounted(initialItem ? String(initialItem.physical) : "");
    setReason("Contagem fisica");
    setError(null);
    setBusy(false);
  }, [open, initialItemId, items]);

  const changeItem = (nextItemId: string) => {
    const nextItem = items.find((item) => item.id === nextItemId) ?? null;
    setItemId(nextItemId);
    setCounted(nextItem ? String(nextItem.physical) : "");
    setError(null);
  };

  const submit = async () => {
    const trimmedReason = reason.trim();
    if (!selectedItem) {
      setError(MOVEMENT_ERROR_LABELS.item_required);
      return;
    }
    if (!Number.isFinite(countValue) || countValue < 0) {
      setError("Informe a contagem fisica com valor zero ou maior.");
      return;
    }
    if (!trimmedReason) {
      setError(MOVEMENT_ERROR_LABELS.reason_required);
      return;
    }
    if (diff === 0) {
      toast("Contagem registrada sem diferenca de saldo.", "info");
      onClose();
      return;
    }

    const locationId = defaultOperationalLocationId(selectedItem, activeLocations, selectedLocationId);
    if (!locationId) {
      setError("Selecione um local ou defina um local padrao para o item.");
      return;
    }

    const movementType: InventoryManualMovementType = diff > 0 ? "purchase_entry" : "loss";
    const input: InventoryManualMovementInput = {
      movementType,
      itemId: selectedItem.id,
      quantity: Math.abs(diff),
      fromLocationId: movementType === "loss" ? locationId : null,
      toLocationId: movementType === "purchase_entry" ? locationId : null,
      reason: `Contagem fisica: ${trimmedReason}`,
    };

    setBusy(true);
    setError(null);

    try {
      await createInventoryMovement(input);
      toast(`Contagem registrada (${diff > 0 ? "+" : ""}${num(diff)} ${selectedItem.unit}).`, diff < 0 ? "bad" : "ok");
      onClose();
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel registrar a contagem.";
      setError(movementErrorMessage(message));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Contagem de estoque"
      subtitle="Conferencia fisica que gera ajuste pela diferenca"
      icon="refresh"
      width={620}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="default" icon="check" onClick={submit} disabled={busy || !data}>
            {busy ? "Registrando..." : "Registrar contagem"}
          </Button>
        </>
      )}
    >
      <Field label="Item" required>
        <Select
          value={itemId}
          onChange={changeItem}
          placeholder="Selecione um item"
          options={items.map((item) => ({ value: item.id, label: `${itemTitle(item)} - ${item.sku}` }))}
        />
      </Field>

      {selectedItem && (
        <div className="grid cols-3" style={{ marginBottom: 16 }}>
          <Stat label="Fisico no sistema" value={`${num(selectedItem.physical)} ${selectedItem.unit}`} />
          <Stat label="Disponivel" value={`${num(selectedItem.available)} ${selectedItem.unit}`} tone={stockTone(selectedItem)} />
          <Stat label="Diferenca" value={`${diff > 0 ? "+" : ""}${num(diff)} ${selectedItem.unit}`} tone={diff < 0 ? "bad" : diff > 0 ? "ok" : "neutral"} />
        </div>
      )}

      <div className="ff-grid">
        <Field label={`Contagem fisica${selectedItem ? ` (${selectedItem.unit})` : ""}`} required>
          <Input inputMode="decimal" value={counted} onChange={(event) => { setCounted(event.target.value); setError(null); }} />
        </Field>
        <Field label="Local de referencia">
          <Input value={selectedItem ? (selectedLocationId ? selectedItem.defaultLocation ?? "Local filtrado" : selectedItem.defaultLocation ?? "Sem local padrao") : ""} readOnly />
        </Field>
      </div>

      <Field label="Motivo" required>
        <Textarea value={reason} onChange={(event) => { setReason(event.target.value); setError(null); }} />
      </Field>

      {error && <div className="ff-error" style={{ marginTop: -6 }}>{error}</div>}
    </Modal>
  );
}

function InventoryAdjustmentModal({
  open,
  data,
  selectedLocationId,
  initialItemId,
  onClose,
  onCreated,
}: {
  open: boolean;
  data: InventoryResponse | null;
  selectedLocationId: string;
  initialItemId?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [itemId, setItemId] = React.useState("");
  const [direction, setDirection] = React.useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const items = React.useMemo(() => data?.items ?? [], [data?.items]);
  const activeLocations = React.useMemo(
    () => (data?.locations ?? []).filter((location) => location.isActive),
    [data?.locations],
  );
  const selectedItem = items.find((item) => item.id === itemId) ?? null;
  const parsedQuantity = parseMovementQuantity(quantity);
  const nextPhysical = selectedItem && Number.isFinite(parsedQuantity)
    ? selectedItem.physical + (direction === "increase" ? parsedQuantity : -parsedQuantity)
    : selectedItem?.physical ?? 0;

  React.useEffect(() => {
    if (!open) return;
    const initialItem = initialItemId ? items.find((item) => item.id === initialItemId) ?? null : items[0] ?? null;
    setItemId(initialItem?.id ?? "");
    setDirection("increase");
    setQuantity("");
    setReason("");
    setError(null);
    setBusy(false);
  }, [open, initialItemId, items]);

  const submit = async () => {
    const trimmedReason = reason.trim();
    if (!selectedItem) {
      setError(MOVEMENT_ERROR_LABELS.item_required);
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError(MOVEMENT_ERROR_LABELS.invalid_quantity);
      return;
    }
    if (!trimmedReason) {
      setError(MOVEMENT_ERROR_LABELS.reason_required);
      return;
    }

    const locationId = defaultOperationalLocationId(selectedItem, activeLocations, selectedLocationId);
    if (!locationId) {
      setError("Selecione um local ou defina um local padrao para o item.");
      return;
    }

    const movementType: InventoryManualMovementType = direction === "increase" ? "purchase_entry" : "loss";
    const input: InventoryManualMovementInput = {
      movementType,
      itemId: selectedItem.id,
      quantity: parsedQuantity,
      fromLocationId: movementType === "loss" ? locationId : null,
      toLocationId: movementType === "purchase_entry" ? locationId : null,
      reason: `Ajuste manual: ${trimmedReason}`,
    };

    setBusy(true);
    setError(null);

    try {
      await createInventoryMovement(input);
      toast("Ajuste de estoque registrado.", "ok");
      onClose();
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel registrar o ajuste.";
      setError(movementErrorMessage(message));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar estoque"
      subtitle="Entrada ou saida manual com motivo"
      icon="sliders"
      width={620}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="default" icon="check" onClick={submit} disabled={busy || !data}>
            {busy ? "Registrando..." : "Registrar ajuste"}
          </Button>
        </>
      )}
    >
      <Field label="Item" required>
        <Select
          value={itemId}
          onChange={(value) => { setItemId(value); setError(null); }}
          placeholder="Selecione um item"
          options={items.map((item) => ({ value: item.id, label: `${itemTitle(item)} - ${item.sku}` }))}
        />
      </Field>

      {selectedItem && (
        <div className="grid cols-3" style={{ marginBottom: 16 }}>
          <Stat label="Fisico atual" value={`${num(selectedItem.physical)} ${selectedItem.unit}`} />
          <Stat label="Disponivel" value={`${num(selectedItem.available)} ${selectedItem.unit}`} tone={stockTone(selectedItem)} />
          <Stat label="Novo fisico" value={`${num(Math.max(0, nextPhysical))} ${selectedItem.unit}`} tone={nextPhysical < 0 ? "bad" : undefined} />
        </div>
      )}

      <div className="ff-grid">
        <Field label="Operacao" required>
          <Select
            value={direction}
            onChange={(value) => { setDirection(value as "increase" | "decrease"); setError(null); }}
            options={[
              { value: "increase", label: "Entrada manual" },
              { value: "decrease", label: "Saida manual" },
            ]}
          />
        </Field>
        <Field label={`Quantidade${selectedItem ? ` (${selectedItem.unit})` : ""}`} required>
          <Input inputMode="decimal" value={quantity} onChange={(event) => { setQuantity(event.target.value); setError(null); }} placeholder="0" />
        </Field>
      </div>

      <Field label="Motivo" required>
        <Textarea value={reason} onChange={(event) => { setReason(event.target.value); setError(null); }} placeholder="Ex.: quebra, perda, sobra de producao, uso interno" />
      </Field>

      {error && <div className="ff-error" style={{ marginTop: -6 }}>{error}</div>}
    </Modal>
  );
}

function InventoryItemActionsModal({
  item,
  canCreateMovement,
  onClose,
  onCount,
  onAdjust,
  onMove,
  onLabels,
  onOpenItem,
}: {
  item: InventoryItemBalance;
  canCreateMovement: boolean;
  onClose: () => void;
  onCount: () => void;
  onAdjust: () => void;
  onMove: () => void;
  onLabels: () => void;
  onOpenItem: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={itemTitle(item)}
      subtitle={`${item.sku} - ${item.code}`}
      icon="estoque"
      width={660}
      footer={<><Button variant="outline" onClick={onClose}>Fechar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="ghost" iconRight="arrowRight" onClick={onOpenItem}>Cadastro do item</Button></>}
    >
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Stat label="Fisico" value={`${num(item.physical)} ${item.unit}`} />
        <Stat label="Disponivel" value={`${num(item.available)} ${item.unit}`} tone={stockTone(item)} />
        <Stat label="Reservado" value={`${num(item.reserved)} ${item.unit}`} tone={item.reserved > 0 ? "info" : undefined} />
        <Stat label="Minimo" value={`${num(item.min)} ${item.unit}`} />
      </div>

      <div className="grid cols-2" style={{ gap: 10 }}>
        <Button variant="outline" icon="refresh" onClick={onCount} disabled={!canCreateMovement}>Contagem</Button>
        <Button variant="outline" icon="sliders" onClick={onAdjust} disabled={!canCreateMovement}>Ajuste de estoque</Button>
        <Button variant="outline" icon="layers" onClick={onMove} disabled={!canCreateMovement}>Movimentacao</Button>
        <Button variant="default" icon="printer" onClick={onLabels}>Imprimir etiquetas</Button>
      </div>
    </Modal>
  );
}

function itemTitle(item: { name: string; variant: string | null }) {
  return `${item.name}${item.variant ? ` ${item.variant}` : ""}`;
}

function searchableText(item: InventoryItemBalance) {
  return [
    item.name,
    item.variant,
    item.sku,
    item.code,
    item.category,
    item.defaultLocation,
    item.type,
  ].filter(Boolean).join(" ").toLowerCase();
}

function locationLabel(location: InventoryLocation) {
  return `${location.name} - ${LOCATION_TYPE_LABELS[location.type] ?? location.type}`;
}

function stockTone(item: InventoryItemBalance) {
  if (item.stockStatus === "below_minimum") return "bad";
  if (item.stockStatus === "no_minimum") return "neutral";
  return "ok";
}

function stockLabel(item: InventoryItemBalance) {
  if (item.stockStatus === "below_minimum") return "Abaixo do minimo";
  if (item.stockStatus === "no_minimum") return "Sem minimo";
  return "Em dia";
}

function stockFillPct(item: InventoryItemBalance) {
  if (item.min <= 0) return item.available > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (item.available / item.min) * 100));
}

function movementTone(type: ItemMovementType) {
  if (["purchase_entry", "adjustment_positive", "production_output", "return", "release"].includes(type)) return "ok";
  if (["adjustment_negative", "loss", "production_consumption", "order_shipment", "block"].includes(type)) return "bad";
  if (["reservation", "reservation_release"].includes(type)) return "info";
  return "neutral";
}

function movementIcon(type: ItemMovementType) {
  if (type === "transfer") return "arrowRight";
  return movementTone(type) === "bad" ? "arrowDown" : "arrowUp";
}

function movementSign(type: ItemMovementType) {
  if (["purchase_entry", "adjustment_positive", "production_output", "return"].includes(type)) return "+";
  if (["adjustment_negative", "loss", "production_consumption", "order_shipment"].includes(type)) return "-";
  return "";
}

function formatMovementDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function movementLocationText(movement: InventoryMovement) {
  if (movement.fromLocation && movement.toLocation) {
    return `${movement.fromLocation.name} -> ${movement.toLocation.name}`;
  }
  if (movement.fromLocation) return `Origem: ${movement.fromLocation.name}`;
  if (movement.toLocation) return `Destino: ${movement.toLocation.name}`;
  return "Sem local informado";
}

function matchesTab(item: InventoryItemBalance, tab: InventoryTab) {
  switch (tab) {
    case "with_physical":
      return item.physical > 0;
    case "reserved":
      return item.reserved > 0;
    case "cure":
      return item.inCure > 0;
    case "blocked":
      return item.blocked > 0;
    case "below_minimum":
      return item.stockStatus === "below_minimum";
    case "all":
    default:
      return true;
  }
}

export function InventoryScreen({ go, route, session }: { go: Go; route: Route; session: Session }) {
  const [data, setData] = React.useState<InventoryResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<InventoryTab>("all");
  const [locationId, setLocationId] = React.useState(route.filter ?? "");
  const [actionItemId, setActionItemId] = React.useState<string | null>(null);
  const [countItemId, setCountItemId] = React.useState<string | null>(null);
  const [adjustItemId, setAdjustItemId] = React.useState<string | null>(null);
  const [movementModal, setMovementModal] = React.useState<{
    open: boolean;
    itemId: string | null;
    movementType?: InventoryManualMovementType;
  }>({ open: false, itemId: null });

  const load = React.useCallback(async (nextLocationId: string) => {
    setLoading(true);
    try {
      const payload = await fetchInventory(nextLocationId || null);
      setData(payload);
      setError(null);
      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o estoque.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(locationId);
  }, [load, locationId]);

  React.useEffect(() => {
    if (!data || !locationId) return;
    if (data.selectedLocationId !== locationId) setLocationId(data.selectedLocationId ?? "");
  }, [data, locationId]);

  const cards = data?.cards ?? EMPTY_CARDS;
  const locations = data?.locations ?? [];
  const selectedLocation = locations.find((location) => location.id === locationId) ?? null;
  const canCreateMovement = canManageInventory(session.user.role);
  const actionItem = data?.items.find((item) => item.id === actionItemId) ?? null;

  const tabs = React.useMemo(() => {
    const items = data?.items ?? [];
    return [
      { value: "all", label: "Todos", count: items.length },
      { value: "with_physical", label: "Fisico", count: items.filter((item) => item.physical > 0).length },
      { value: "reserved", label: "Reservado", count: items.filter((item) => item.reserved > 0).length },
      { value: "cure", label: "Cura", count: items.filter((item) => item.inCure > 0).length },
      { value: "blocked", label: "Bloqueado", count: items.filter((item) => item.blocked > 0).length },
      { value: "below_minimum", label: "Abaixo minimo", count: items.filter((item) => item.stockStatus === "below_minimum").length },
    ];
  }, [data?.items]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items ?? []).filter((item) => matchesTab(item, tab) && (!q || searchableText(item).includes(q)));
  }, [data?.items, query, tab]);

  const sortAccessors = React.useMemo(() => ({
    name: (item: InventoryItemBalance) => item.name,
    location: (item: InventoryItemBalance) => item.defaultLocation ?? "",
    physical: (item: InventoryItemBalance) => item.physical,
    reserved: (item: InventoryItemBalance) => item.reserved,
    available: (item: InventoryItemBalance) => item.available,
    min: (item: InventoryItemBalance) => item.min,
  }), []);

  const sort = useSort(filtered, sortAccessors, "name", "asc");

  const changeLocation = (value: string) => {
    setLocationId(value);
    go("estoque", value ? { filter: value } : {});
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Estoque</h1>
          <p className="page-lede">
            Saldos derivados de movimentos, com visao por local e historico recente.
          </p>
        </div>
        <div className="row-wrap">
          {canCreateMovement && (
            <Button
              variant="default"
              icon="plus"
              onClick={() => setMovementModal({ open: true, itemId: null })}
              disabled={loading || !data || data.items.length === 0 || data.locations.every((location) => !location.isActive)}
            >
              Novo movimento
            </Button>
          )}
          <Button variant="outline" icon="listChecks" onClick={() => go("contagem")}>Contagem completa</Button>
          <Button variant="outline" icon="itens" onClick={() => go("itens")}>Itens / SKUs</Button>
          <Button variant="outline" icon="refresh" onClick={() => void load(locationId)} disabled={loading}>Atualizar</Button>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <Card><CardContent><Stat label="Itens na visao" value={cards.totalItems} sub={selectedLocation ? selectedLocation.name : `${cards.locations} locais ativos`} /></CardContent></Card>
        <Card><CardContent><Stat label="Disponivel agregado" value={num(cards.available)} sub="Fisico - reservas - cura - bloqueios" tone={cards.available < 0 ? "bad" : "ok"} /></CardContent></Card>
        <Card><CardContent><Stat label="Reservado" value={num(cards.reserved)} sub={`${num(cards.inCure)} em cura`} tone={cards.reserved > 0 ? "info" : undefined} /></CardContent></Card>
        <Card><CardContent><Stat label="Abaixo do minimo" value={cards.belowMinimum} sub={`${num(cards.physical)} fisico agregado`} tone={cards.belowMinimum > 0 ? "bad" : "ok"} /></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Saldos por item</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>
              {filtered.length} itens {selectedLocation ? `em ${selectedLocation.name}` : "na empresa"}
            </div>
          </div>
          <div className="row-wrap" style={{ flex: 1, justifyContent: "flex-end" }}>
            <Select
              value={locationId}
              onChange={changeLocation}
              placeholder="Todos os locais"
              options={locations.filter((location) => location.isActive).map((location) => ({
                value: location.id,
                label: locationLabel(location),
              }))}
              style={{ width: 260, maxWidth: "100%" }}
            />
            <Input
              icon="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar item, SKU, codigo ou categoria"
              style={{ width: 320, maxWidth: "100%" }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <Tabs tabs={tabs} value={tab} onChange={(value) => setTab(value as InventoryTab)} />
          </div>

          <Sep />

          {error && <Empty icon="alertCircle" title="Estoque indisponivel" hint={error} />}

          {!error && loading && <Empty icon="estoque" title="Carregando estoque" hint="Calculando saldos a partir dos movimentos." />}

          {!error && !loading && sort.sorted.length === 0 && (
            <Empty icon="search" title="Nenhum item encontrado" hint="Ajuste a busca, o local ou o filtro selecionado." />
          )}

          {!error && !loading && sort.sorted.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="om-table">
                <thead>
                  <tr>
                    <SortTh label="Item" k="name" sort={sort} />
                    <SortTh label="Local padrao" k="location" sort={sort} />
                    <SortTh label="Fisico" k="physical" sort={sort} align="right" />
                    <SortTh label="Reservado" k="reserved" sort={sort} align="right" />
                    <th className="om-td-right">Cura / bloqueio</th>
                    <SortTh label="Disponivel" k="available" sort={sort} align="right" />
                    <SortTh label="Minimo" k="min" sort={sort} align="right" />
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sort.sorted.map((item) => (
                    <tr key={item.id} className="om-row-click" onClick={() => setActionItemId(item.id)}>
                      <td style={{ minWidth: 260 }}>
                        <div className="item-cell">
                          <div className={`swatch swatch--${item.type === "raw_material" ? "mp" : item.type === "packaging" ? "emb" : item.type === "kit" ? "kit" : ""}`}>
                            <Icon name={item.type === "raw_material" ? "droplet" : item.type === "packaging" ? "box" : item.type === "kit" ? "layers" : "itens"} size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-title">{itemTitle(item)}</div>
                            <div className="cell-sub">{item.category ?? "Sem categoria"} - <span className="sku">{item.sku}</span></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ minWidth: 180 }}>
                        <div>{item.defaultLocation ?? "Sem local padrao"}</div>
                        <div className="code-pill" style={{ marginTop: 4, display: "inline-flex" }}>{item.code}</div>
                      </td>
                      <td className="om-td-right">{num(item.physical)} {item.unit}</td>
                      <td className="om-td-right">{num(item.reserved)} {item.unit}</td>
                      <td className="om-td-right">{num(item.inCure)} / {num(item.blocked)} {item.unit}</td>
                      <td className="om-td-right" style={{ minWidth: 132 }}>
                        <div style={{ fontWeight: 650 }} className={`om-text--${stockTone(item)}`}>{num(item.available)} {item.unit}</div>
                        <div className="qbar" style={{ marginTop: 6, marginLeft: "auto" }}>
                          <div className="qbar-fill" style={{ width: `${stockFillPct(item)}%`, background: `hsl(var(--${stockTone(item)}))` }} />
                        </div>
                      </td>
                      <td className="om-td-right">{num(item.min)} {item.unit}</td>
                      <td>
                        <div className="row-wrap" style={{ gap: 6 }}>
                          <Badge tone={stockTone(item)}>{stockLabel(item)}</Badge>
                          <Badge tone={ITEM_TYPE_TONES[item.type]}>{ITEM_TYPE_LABELS[item.type]}</Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card style={{ marginTop: "var(--gap)" }}>
        <CardHeader>
          <div>
            <CardTitle>Movimentacoes recentes</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>
              {cards.movements} movimentos {selectedLocation ? `em ${selectedLocation.name}` : "mais recentes"}
            </div>
          </div>
          <Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => go("itens")}>Ajustar nos itens</Button>
        </CardHeader>
        <CardContent style={{ paddingTop: 4 }}>
          {error && <div className="section-hint">{error}</div>}
          {!error && loading && <div className="section-hint">Carregando movimentacoes...</div>}
          {!error && !loading && (data?.movements ?? []).length === 0 && (
            <Empty icon="estoque" title="Sem movimentacoes" hint="Nenhum movimento encontrado para o filtro atual." />
          )}
          {!error && !loading && (data?.movements ?? []).map((movement) => (
            <div className="lrow om-row-click" key={movement.id} onClick={() => go("itens", { open: movement.itemCode })}>
              <div className={`chip chip--${movementTone(movement.movementType)}`}>
                <Icon name={movementIcon(movement.movementType)} size={16} />
              </div>
              <div className="lrow-main">
                <div className="lrow-title">
                  {ITEM_MOVEMENT_LABELS[movement.movementType]} - {itemTitle({ name: movement.itemName, variant: movement.itemVariant })}
                </div>
                <div className="lrow-sub">
                  {formatMovementDate(movement.occurredAt)} - {movementLocationText(movement)}
                  {movement.reason ? ` - ${movement.reason}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 650 }} className={`om-text--${movementTone(movement.movementType)}`}>
                  {movementSign(movement.movementType)}{num(movement.quantity)} {movement.unit}
                </div>
                <div className="lrow-sub">{movement.actorName ?? movement.sourceType ?? movement.itemSku}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {actionItem && (
        <InventoryItemActionsModal
          item={actionItem}
          canCreateMovement={canCreateMovement}
          onClose={() => setActionItemId(null)}
          onCount={() => {
            setCountItemId(actionItem.id);
            setActionItemId(null);
          }}
          onAdjust={() => {
            setAdjustItemId(actionItem.id);
            setActionItemId(null);
          }}
          onMove={() => {
            setMovementModal({ open: true, itemId: actionItem.id, movementType: "transfer" });
            setActionItemId(null);
          }}
          onLabels={() => {
            setActionItemId(null);
            toast(`${itemTitle(actionItem)} selecionado para impressao de etiquetas.`, "info");
            go("etiquetas");
          }}
          onOpenItem={() => go("itens", { open: actionItem.code })}
        />
      )}

      {canCreateMovement && (
        <InventoryCountModal
          open={Boolean(countItemId)}
          data={data}
          selectedLocationId={locationId}
          initialItemId={countItemId}
          onClose={() => setCountItemId(null)}
          onCreated={() => void load(locationId)}
        />
      )}

      {canCreateMovement && (
        <InventoryAdjustmentModal
          open={Boolean(adjustItemId)}
          data={data}
          selectedLocationId={locationId}
          initialItemId={adjustItemId}
          onClose={() => setAdjustItemId(null)}
          onCreated={() => void load(locationId)}
        />
      )}

      {canCreateMovement && (
        <InventoryMovementModal
          open={movementModal.open}
          data={data}
          selectedLocationId={locationId}
          initialItemId={movementModal.itemId}
          initialMovementType={movementModal.movementType}
          onClose={() => setMovementModal({ open: false, itemId: null })}
          onCreated={() => void load(locationId)}
        />
      )}
    </div>
  );
}
