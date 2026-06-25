import type { SessionUser } from "@/lib/types";

export type AppRole = SessionUser["role"];

export const CATALOG_WRITE_ROLES: readonly AppRole[] = ["owner", "admin"];
export const INVENTORY_WRITE_ROLES: readonly AppRole[] = ["owner", "admin"];
export const SETTINGS_WRITE_ROLES: readonly AppRole[] = ["owner", "admin"];
export const ORDER_WRITE_ROLES: readonly AppRole[] = ["owner", "admin", "operator"];
export const PRODUCTION_WRITE_ROLES: readonly AppRole[] = ["owner", "admin", "operator"];
export const INCIDENT_WRITE_ROLES: readonly AppRole[] = ["owner", "admin", "operator"];
export const IMPORT_WRITE_ROLES: readonly AppRole[] = ["owner", "admin"];
export const RECIPE_WRITE_ROLES: readonly AppRole[] = ["owner", "admin"];

export function canManageCatalog(role: AppRole) {
  return CATALOG_WRITE_ROLES.includes(role);
}

export function canManageInventory(role: AppRole) {
  return INVENTORY_WRITE_ROLES.includes(role);
}

export function canManageSettings(role: AppRole) {
  return SETTINGS_WRITE_ROLES.includes(role);
}
