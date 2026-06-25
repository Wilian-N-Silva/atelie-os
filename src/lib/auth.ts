import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { account, companies, session, user, verification } from "@/db/schema";
import { sendMagicLinkEmail, sendPasswordResetEmail } from "@/lib/email-server";
import { isOwnerEmail, isStandaloneDeployment, ownerEmail } from "@/lib/deployment";

const authSecret = process.env.BETTER_AUTH_SECRET;

if (!authSecret && process.env.NODE_ENV === "production") {
  throw new Error("BETTER_AUTH_SECRET is required in production.");
}

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const trustedOrigins = Array.from(new Set([
  baseURL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.BETTER_AUTH_URL,
  process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null,
  process.env.NODE_ENV !== "production" ? "https://ablutionary-unvesiculated-marylynn.ngrok-free.dev" : null,
].filter((value): value is string => Boolean(value))));

export const auth = betterAuth({
  baseURL,
  secret: authSecret ?? "development-only-change-me-at-least-32-chars",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    sendResetPassword: async ({ user: resetUser, url }) => {
      await sendPasswordResetEmail({ to: resetUser.email, url });
    },
  },
  trustedOrigins,
  plugins: [
    magicLink({
      disableSignUp: false,
      sendMagicLink: async ({ email, url }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, normalizedEmail)).limit(1);
        if (!existingUser) {
          const [existingCompany] = await db.select({ id: companies.id }).from(companies).limit(1);
          const configuredOwner = ownerEmail();
          const canBootstrapOwner = isStandaloneDeployment()
            && !existingCompany
            && (configuredOwner ? isOwnerEmail(normalizedEmail) : true);
          if (!canBootstrapOwner) {
            throw new Error("magic_link_signup_disabled");
          }
        }
        await sendMagicLinkEmail({ to: email, url });
      },
    }),
    nextCookies(),
  ],
});
