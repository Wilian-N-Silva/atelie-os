import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* Better Auth core tables. Keep schema keys singular: user/session/account/verification. */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIdx: index("session_user_id_idx").on(table.userId),
  }),
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("account_user_id_idx").on(table.userId),
  }),
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  }),
);

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "operator"]);
export const memberStatusEnum = pgEnum("member_status", ["active", "invited", "disabled"]);
export const companyStatusEnum = pgEnum("company_status", ["active", "disabled"]);
export const itemTypeEnum = pgEnum("item_type", ["raw_material", "packaging", "finished_good", "kit", "auxiliary"]);
export const itemStatusEnum = pgEnum("item_status", ["active", "archived", "blocked"]);
export const movementTypeEnum = pgEnum("stock_movement_type", [
  "purchase_entry",
  "adjustment_positive",
  "adjustment_negative",
  "loss",
  "reservation",
  "reservation_release",
  "production_consumption",
  "production_output",
  "order_shipment",
  "return",
  "block",
  "release",
  "transfer",
]);
export const workflowEntityEnum = pgEnum("workflow_entity", ["order", "production", "inventory", "quality"]);
export const auditActionEnum = pgEnum("audit_action", [
  "auth.sign_up",
  "company.create",
  "member.invite",
  "branding.update",
  "workflow.update",
  "item.create",
  "item.update",
  "order.create",
  "order.update",
  "recipe.create",
  "recipe.update",
  "production.create",
  "production.update",
  "stock.adjust",
  "seed.run",
]);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: companyStatusEnum("status").notNull().default("active"),
    segment: text("segment"),
    teamSize: text("team_size"),
    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("companies_slug_idx").on(table.slug),
  }),
);

export const companyMembers = pgTable(
  "company_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("operator"),
    status: memberStatusEnum("status").notNull().default("active"),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => ({
    companyUserIdx: uniqueIndex("company_members_company_user_idx").on(table.companyId, table.userId),
    userIdx: index("company_members_user_idx").on(table.userId),
  }),
);

export const pendingInvites = pgTable(
  "pending_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull().default("operator"),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, { onDelete: "set null" }),
    status: memberStatusEnum("status").notNull().default("invited"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    companyEmailIdx: uniqueIndex("pending_invites_company_email_idx").on(table.companyId, table.email),
  }),
);

export const companySettings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  locale: text("locale").notNull().default("pt-BR"),
  currency: text("currency").notNull().default("BRL"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});

export const companyBrandSettings = pgTable("company_brand_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url"),
  activeThemeId: uuid("active_theme_id"),
  themeTokens: jsonb("theme_tokens").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});

export const brandThemes = pgTable(
  "brand_themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokens: jsonb("tokens").$type<Record<string, unknown>>().notNull(),
    isPreset: boolean("is_preset").notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    companyNameIdx: uniqueIndex("brand_themes_company_name_idx").on(table.companyId, table.name),
  }),
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("unit"),
    ...timestamps,
  },
  (table) => ({
    companyCodeIdx: uniqueIndex("units_company_code_idx").on(table.companyId, table.code),
  }),
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    ...timestamps,
  },
  (table) => ({
    companyKindNameIdx: uniqueIndex("categories_company_kind_name_idx").on(table.companyId, table.kind, table.name),
  }),
);

export const inventoryLocations = pgTable(
  "inventory_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    companyCodeIdx: uniqueIndex("inventory_locations_company_code_idx").on(table.companyId, table.code),
  }),
);

export const salesChannels = pgTable(
  "sales_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    technicalKey: text("technical_key").notNull(),
    name: text("name").notNull(),
    isExternal: boolean("is_external").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    companyKeyIdx: uniqueIndex("sales_channels_company_key_idx").on(table.companyId, table.technicalKey),
  }),
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    number: text("number").notNull(),
    channelKey: text("channel_key").notNull(),
    customerName: text("customer_name").notNull(),
    city: text("city").notNull(),
    status: text("status").notNull(),
    paymentStatus: text("payment_status").notNull(),
    labelKind: text("label_kind").notNull().default("internal"),
    freight: numeric("freight", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    tracking: text("tracking"),
    note: text("note"),
    source: text("source").notNull().default("manual"),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => ({
    companyCodeIdx: uniqueIndex("orders_company_code_idx").on(table.companyId, table.code),
    companyStatusIdx: index("orders_company_status_idx").on(table.companyId, table.status),
    companyCreatedIdx: index("orders_company_created_idx").on(table.companyId, table.createdAt),
  }),
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    internalCode: text("internal_code").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    variant: text("variant"),
    type: itemTypeEnum("type").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    baseUnitId: uuid("base_unit_id").references(() => units.id, { onDelete: "set null" }),
    defaultLocationId: uuid("default_location_id").references(() => inventoryLocations.id, { onDelete: "set null" }),
    minStock: numeric("min_stock", { precision: 12, scale: 3 }).notNull().default("0"),
    tracksLot: boolean("tracks_lot").notNull().default(false),
    hasExpiration: boolean("has_expiration").notNull().default(false),
    estimatedCost: numeric("estimated_cost", { precision: 12, scale: 4 }),
    averageCost: numeric("average_cost", { precision: 12, scale: 4 }),
    suggestedPrice: numeric("suggested_price", { precision: 12, scale: 2 }),
    currentPrice: numeric("current_price", { precision: 12, scale: 2 }),
    weightG: integer("weight_g"),
    packedWeightG: integer("packed_weight_g"),
    dimensions: text("dimensions"),
    packedDimensions: text("packed_dimensions"),
    fragile: boolean("fragile").notNull().default(false),
    sellable: boolean("sellable").notNull().default(false),
    status: itemStatusEnum("status").notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => ({
    companySkuIdx: uniqueIndex("items_company_sku_idx").on(table.companyId, table.sku),
    companyCodeIdx: uniqueIndex("items_company_internal_code_idx").on(table.companyId, table.internalCode),
    companyTypeIdx: index("items_company_type_idx").on(table.companyId, table.type),
  }),
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => items.id, { onDelete: "set null" }),
    sku: text("sku").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
    itemIdx: index("order_items_item_idx").on(table.itemId),
  }),
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    movementType: movementTypeEnum("movement_type").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    fromLocationId: uuid("from_location_id").references(() => inventoryLocations.id, { onDelete: "set null" }),
    toLocationId: uuid("to_location_id").references(() => inventoryLocations.id, { onDelete: "set null" }),
    reason: text("reason"),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => ({
    companyItemIdx: index("stock_movements_company_item_idx").on(table.companyId, table.itemId),
    companyOccurredIdx: index("stock_movements_company_occurred_idx").on(table.companyId, table.occurredAt),
  }),
);

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    productItemId: uuid("product_item_id").references(() => items.id, { onDelete: "set null" }),
    productSku: text("product_sku").notNull(),
    productName: text("product_name").notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => ({
    companyProductIdx: index("recipes_company_product_idx").on(table.companyId, table.productSku),
  }),
);

export const recipeVersions = pgTable(
  "recipe_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    status: text("status").notNull().default("rascunho"),
    yieldQty: numeric("yield_qty", { precision: 12, scale: 3 }).notNull().default("1"),
    yieldUnit: text("yield_unit").notNull().default("unidade"),
    cureDays: integer("cure_days").notNull().default(0),
    tests: jsonb("tests").$type<Array<Record<string, unknown>>>().notNull().default([]),
    ...timestamps,
  },
  (table) => ({
    recipeVersionIdx: uniqueIndex("recipe_versions_recipe_version_idx").on(table.recipeId, table.version),
  }),
);

export const recipeComponents = pgTable(
  "recipe_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeVersionId: uuid("recipe_version_id")
      .notNull()
      .references(() => recipeVersions.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => items.id, { onDelete: "set null" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
    unit: text("unit").notNull().default("un"),
    loss: numeric("loss", { precision: 6, scale: 2 }).notNull().default("0"),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => ({
    versionIdx: index("recipe_components_version_idx").on(table.recipeVersionId),
  }),
);

export const productionOrders = pgTable(
  "production_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    number: text("number").notNull(),
    productItemId: uuid("product_item_id").references(() => items.id, { onDelete: "set null" }),
    productSku: text("product_sku").notNull(),
    productName: text("product_name").notNull(),
    recipeVersionId: uuid("recipe_version_id").references(() => recipeVersions.id, { onDelete: "set null" }),
    recipeName: text("recipe_name").notNull(),
    recipeVersion: text("recipe_version").notNull(),
    planned: numeric("planned", { precision: 12, scale: 3 }).notNull().default("0"),
    status: text("status").notNull(),
    plannedDateLabel: text("planned_date_label").notNull().default("a definir"),
    responsible: text("responsible").notNull().default(""),
    progress: integer("progress"),
    lot: text("lot"),
    cureUntil: text("cure_until"),
    cureDayLeft: integer("cure_day_left"),
    source: text("source").notNull().default("manual"),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => ({
    companyCodeIdx: uniqueIndex("production_orders_company_code_idx").on(table.companyId, table.code),
    companyStatusIdx: index("production_orders_company_status_idx").on(table.companyId, table.status),
  }),
);

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    entity: workflowEntityEnum("entity").notNull(),
    name: text("name").notNull(),
    technicalKey: text("technical_key").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    companyEntityKeyIdx: uniqueIndex("workflows_company_entity_key_idx").on(
      table.companyId,
      table.entity,
      table.technicalKey,
    ),
  }),
);

export const workflowSteps = pgTable(
  "workflow_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    technicalKey: text("technical_key").notNull(),
    label: text("label").notNull(),
    automationType: text("automation_type"),
    colorToken: text("color_token").notNull().default("info"),
    position: integer("position").notNull(),
    isInitial: boolean("is_initial").notNull().default(false),
    isFinal: boolean("is_final").notNull().default(false),
    isProtected: boolean("is_protected").notNull().default(false),
    checklist: jsonb("checklist").$type<Array<Record<string, unknown>>>().notNull().default([]),
    ...timestamps,
  },
  (table) => ({
    workflowKeyIdx: uniqueIndex("workflow_steps_workflow_key_idx").on(table.workflowId, table.technicalKey),
    workflowPositionIdx: uniqueIndex("workflow_steps_workflow_position_idx").on(table.workflowId, table.position),
  }),
);

export const codeSequences = pgTable(
  "code_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    prefix: text("prefix").notNull(),
    nextValue: integer("next_value").notNull().default(1),
    ...timestamps,
  },
  (table) => ({
    companyPrefixIdx: uniqueIndex("code_sequences_company_prefix_idx").on(table.companyId, table.prefix),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: auditActionEnum("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCreatedIdx: index("audit_logs_company_created_idx").on(table.companyId, table.createdAt),
  }),
);

export const helpArticles = pgTable(
  "help_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    module: text("module").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isSystem: boolean("is_system").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    companySlugIdx: uniqueIndex("help_articles_company_slug_idx").on(table.companyId, table.slug),
  }),
);

export const helpChecklists = pgTable("help_checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  technicalKey: text("technical_key").notNull(),
  title: text("title").notNull(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  ...timestamps,
});

export const helpChecklistItems = pgTable(
  "help_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checklistId: uuid("checklist_id")
      .notNull()
      .references(() => helpChecklists.id, { onDelete: "cascade" }),
    technicalKey: text("technical_key").notNull(),
    label: text("label").notNull(),
    targetRoute: text("target_route"),
    isOptional: boolean("is_optional").notNull().default(false),
    position: integer("position").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    checklistKeyIdx: uniqueIndex("help_checklist_items_checklist_key_idx").on(table.checklistId, table.technicalKey),
  }),
);

export type MemberRole = (typeof memberRoleEnum.enumValues)[number];
