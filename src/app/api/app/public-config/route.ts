import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { companies } from "@/db/schema";
import { isStandaloneDeployment, ownerEmail, publicAppConfig } from "@/lib/deployment";

export const runtime = "nodejs";

export async function GET() {
  const firstCompany = await db.select({ id: companies.id }).from(companies).limit(1);
  const needsOwnerBootstrap = firstCompany.length === 0;
  const allowFirstStandaloneSignup = isStandaloneDeployment() && needsOwnerBootstrap && !ownerEmail();
  const config = publicAppConfig();
  return NextResponse.json({
    ...config,
    allowSignup: config.allowSignup || allowFirstStandaloneSignup,
    needsOwnerBootstrap,
  }, {
    headers: { "cache-control": "no-store" },
  });
}
