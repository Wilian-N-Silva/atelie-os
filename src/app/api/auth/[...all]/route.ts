import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { companies, pendingInvites } from "@/db/schema";
import { isStandaloneDeployment, ownerEmail } from "@/lib/deployment";
import { hashInviteToken } from "@/lib/invite-tokens";
import { toNextJsHandler } from "better-auth/next-js";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;

async function hasValidInviteToken(request: Request) {
  const body = await request.clone().json().catch(() => null) as { inviteToken?: unknown } | null;
  if (typeof body?.inviteToken !== "string" || !body.inviteToken) return false;
  const invite = await db.query.pendingInvites.findFirst({
    where: eq(pendingInvites.tokenHash, hashInviteToken(body.inviteToken)),
    columns: { status: true, expiresAt: true },
  });
  return Boolean(invite && invite.status === "invited" && (!invite.expiresAt || invite.expiresAt > new Date()));
}

async function canUseStandaloneSignup() {
  if (!isStandaloneDeployment()) return true;
  if (ownerEmail()) return false;
  const firstCompany = await db.select({ id: companies.id }).from(companies).limit(1);
  return firstCompany.length === 0;
}

export async function POST(request: Request) {
  if (isStandaloneDeployment() && new URL(request.url).pathname.endsWith("/sign-up/email")) {
    if (!(await canUseStandaloneSignup()) && !(await hasValidInviteToken(request))) {
      return Response.json({ error: "signup_disabled" }, { status: 403 });
    }
  }
  return handlers.POST(request);
}
