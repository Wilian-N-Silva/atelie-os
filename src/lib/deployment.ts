export type DeploymentMode = "saas" | "standalone";

export function deploymentMode(): DeploymentMode {
  const value = (process.env.ATELIE_DEPLOYMENT_MODE || "").trim().toLowerCase();
  if (value === "standalone" || process.env.ATELIE_STANDALONE === "true") return "standalone";
  return "saas";
}

export function isStandaloneDeployment() {
  return deploymentMode() === "standalone";
}

export function standaloneCompanySlug() {
  return (process.env.ATELIE_STANDALONE_COMPANY_SLUG || process.env.ATELIE_TENANT_SLUG || "").trim().toLowerCase() || null;
}

export function publicAppConfig() {
  return {
    deploymentMode: deploymentMode(),
    allowSignup: !isStandaloneDeployment(),
    brandName: process.env.ATELIE_CLIENT_NAME || process.env.NEXT_PUBLIC_CLIENT_NAME || "Atelie OS",
    loginHeadline: process.env.ATELIE_LOGIN_HEADLINE || "Acesse seu backoffice",
    loginSubheading: process.env.ATELIE_LOGIN_SUBHEADING || "Entre para gerenciar operacao, estoque, pedidos e producao.",
  };
}
