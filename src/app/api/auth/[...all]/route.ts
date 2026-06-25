import { auth } from "@/lib/auth";
import { isStandaloneDeployment } from "@/lib/deployment";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;

export async function POST(request: Request) {
  if (isStandaloneDeployment() && new URL(request.url).pathname.endsWith("/sign-up/email")) {
    return Response.json({ error: "signup_disabled" }, { status: 403 });
  }
  return handlers.POST(request);
}
