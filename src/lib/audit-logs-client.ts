"use client";

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogFilters = {
  action?: string;
  entityType?: string;
  actorUserId?: string;
};

export async function loadAuditLogs(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.actorUserId) params.set("actorUserId", filters.actorUserId);

  const res = await fetch(`/api/app/audit-logs${params.size ? `?${params}` : ""}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("audit_logs_request_failed");

  const payload = await res.json() as { logs?: AuditLogEntry[] };
  return payload.logs ?? [];
}
