/* Shared app-level types (routing + session). */
import type { BrandTheme } from "@/lib/theme";

export interface Route {
  screen: string;
  open?: string;
  filter?: string;
  tab?: string;
  mode?: string;
  order?: string;
  production?: string;
}

export type Go = (screen: string, params?: Partial<Route>) => void;

export interface SessionUser {
  name: string;
  email: string;
  role: "owner" | "admin" | "operator";
}

export interface Session {
  user: SessionUser;
  companyName: string | null;
  companyBranding?: {
    logoUrl: string | null;
    themeTokens: BrandTheme | null;
  } | null;
  onboarded: boolean;
}
