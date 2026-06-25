import { stockMovements } from "@/db/schema";

export type StockBalance = {
  physical: number;
  reserved: number;
  inCure: number;
  blocked: number;
  available: number;
};

type StockMovementType = (typeof stockMovements.$inferSelect)["movementType"];

export type StockMovementBalanceInput = {
  type: StockMovementType;
  quantity: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromLocationType: string | null;
  toLocationType: string | null;
};

export function emptyStockBalance(): StockBalance {
  return {
    physical: 0,
    reserved: 0,
    inCure: 0,
    blocked: 0,
    available: 0,
  };
}

export function roundStock(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function normalizeBalance(balance: StockBalance): StockBalance {
  return {
    physical: roundStock(balance.physical),
    reserved: roundStock(balance.reserved),
    inCure: roundStock(balance.inCure),
    blocked: roundStock(balance.blocked),
    available: roundStock(balance.physical - balance.reserved - balance.inCure - balance.blocked),
  };
}

export function applyStockMovement(balance: StockBalance, movement: {
  type: StockMovementType;
  quantity: string;
  fromLocationType?: string | null;
  toLocationType: string | null;
}) {
  const quantity = Number(movement.quantity);

  switch (movement.type) {
    case "purchase_entry":
    case "adjustment_positive":
    case "return":
      balance.physical += quantity;
      break;
    case "production_output":
      if (movement.toLocationType === "cure") {
        balance.physical += quantity;
        balance.inCure += quantity;
      } else {
        balance.physical += quantity;
      }
      break;
    case "adjustment_negative":
    case "loss":
    case "production_consumption":
    case "order_shipment":
      balance.physical -= quantity;
      break;
    case "reservation":
      balance.reserved += quantity;
      break;
    case "reservation_release":
      balance.reserved -= quantity;
      break;
    case "block":
      balance.blocked += quantity;
      break;
    case "release":
      balance.blocked -= quantity;
      break;
    case "transfer":
      if (movement.fromLocationType === "cure" && movement.toLocationType !== "cure") {
        balance.inCure -= quantity;
      } else if (movement.fromLocationType !== "cure" && movement.toLocationType === "cure") {
        balance.inCure += quantity;
      }
      break;
  }
}

export function applyLocationStockMovement(balance: StockBalance, movement: StockMovementBalanceInput, locationId: string) {
  const quantity = Number(movement.quantity);
  const fromSelected = movement.fromLocationId === locationId;
  const toSelected = movement.toLocationId === locationId;

  switch (movement.type) {
    case "purchase_entry":
    case "adjustment_positive":
    case "return":
      if (toSelected) balance.physical += quantity;
      break;
    case "production_output":
      if (!toSelected) break;
      if (movement.toLocationType === "cure") {
        balance.physical += quantity;
        balance.inCure += quantity;
      } else {
        balance.physical += quantity;
      }
      break;
    case "adjustment_negative":
    case "loss":
    case "production_consumption":
    case "order_shipment":
      if (fromSelected) balance.physical -= quantity;
      break;
    case "reservation":
      if (toSelected) balance.reserved += quantity;
      break;
    case "reservation_release":
      if (fromSelected || toSelected) balance.reserved -= quantity;
      break;
    case "block":
      if (fromSelected) balance.physical -= quantity;
      if (toSelected) {
        balance.physical += quantity;
        balance.blocked += quantity;
      }
      break;
    case "release":
      if (fromSelected) {
        balance.physical -= quantity;
        balance.blocked -= quantity;
      }
      if (toSelected) balance.physical += quantity;
      break;
    case "transfer":
      if (fromSelected) {
        balance.physical -= quantity;
        if (movement.fromLocationType === "cure") {
          balance.inCure -= quantity;
        }
      }
      if (toSelected) {
        balance.physical += quantity;
        if (movement.toLocationType === "cure") {
          balance.inCure += quantity;
        }
      }
      break;
  }
}
