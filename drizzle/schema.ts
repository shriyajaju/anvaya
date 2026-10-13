import { sql } from "drizzle-orm"
import { pgTable, pgSchema, foreignKey, pgPolicy, uuid, text, timestamp, unique, type AnyPgColumn, index, integer, boolean, jsonb, bigint, date, doublePrecision, numeric, bigserial, check, smallint, primaryKey, pgEnum } from "drizzle-orm/pg-core"

const auth = pgSchema("auth");

export const usersInAuth = auth.table("users", {
	id: uuid().primaryKey().notNull(),
});

export const assetKind = pgEnum("asset_kind", ['photo', 'model', 'usdz', 'document', 'audio', 'drawing'])
export const commentTarget = pgEnum("comment_target", ['element', 'story', 'review_item'])
export const conditionState = pgEnum("condition_state", ['good', 'fair', 'poor'])
export const confidenceLevel = pgEnum("confidence_level", ['high', 'medium', 'low'])
export const elementKind = pgEnum("element_kind", ['group', 'structure', 'architectural', 'object'])
export const evidenceKind = pgEnum("evidence_kind", ['physical', 'archaeological', 'historical', 'comparative', 'visual', 'scholarly'])
export const orgRole = pgEnum("org_role", ['owner', 'admin', 'creator', 'reviewer', 'viewer'])
export const questionStatus = pgEnum("question_status", ['open', 'resolved'])
export const reviewItemStatus = pgEnum("review_item_status", ['waiting', 'approved', 'changes'])
export const reviewItemTarget = pgEnum("review_item_target", ['element', 'story'])
export const reviewStatus = pgEnum("review_status", ['open', 'changes_requested', 'approved', 'withdrawn'])
export const siteStatus = pgEnum("site_status", ['draft', 'in_review', 'published', 'archived'])
export const storyStatus = pgEnum("story_status", ['draft', 'in_review', 'approved', 'published'])
export const storyTrigger = pgEnum("story_trigger", ['arrival', 'tap', 'scan'])


export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	initials: text(),
	title: text(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [usersInAuth.id],
			name: "profiles_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("profiles_update_self", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(id = ( SELECT auth.uid() AS uid))`, withCheck: sql`(id = ( SELECT auth.uid() AS uid))`  }),
	pgPolicy("profiles_insert_self", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("profiles_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const organisations = pgTable("organisations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
}, (table) => [
	unique("organisations_slug_key").on(table.slug),
	pgPolicy("organisations_update", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(private.org_role(id) = ANY (ARRAY['admin'::org_role, 'owner'::org_role]))`, withCheck: sql`(private.org_role(id) = ANY (ARRAY['admin'::org_role, 'owner'::org_role]))`  }),
	pgPolicy("organisations_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("organisations_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const sites = pgTable("sites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orgId: uuid("org_id").notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	location: text(),
	siteType: text("site_type"),
	description: text(),
	status: siteStatus().default('draft').notNull(),
	reconstructionYear: integer("reconstruction_year"),
	requireReview: boolean("require_review").default(true).notNull(),
	settings: jsonb().default({"warnNoEvidence":true,"collectFeedback":true,"showAssumptions":true,"showAlternatives":true,"requireSourceForHigh":true}).notNull(),
	managedBy: text("managed_by"),
	licence: text(),
	currentVersionId: uuid("current_version_id").references((): AnyPgColumn => versions.id, { onDelete: "set null" }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sites_org_id_idx").using("btree", table.orgId.asc().nullsLast().op("uuid_ops")),
	index("sites_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "sites_created_by_fkey"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organisations.id],
			name: "sites_org_id_fkey"
		}).onDelete("cascade"),
	unique("sites_slug_key").on(table.slug),
	pgPolicy("sites_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(id) = ANY (ARRAY['admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("sites_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("sites_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("sites_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const periods = pgTable("periods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	name: text().notNull(),
	yearFrom: integer("year_from"),
	yearTo: integer("year_to"),
	sort: integer().default(0).notNull(),
}, (table) => [
	index("periods_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "periods_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("periods_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("periods_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("periods_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("periods_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const events = pgTable("events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	periodId: uuid("period_id"),
	title: text().notNull(),
	year: integer(),
	approx: boolean().default(false).notNull(),
	kind: text(),
	description: text(),
	elementIds: uuid("element_ids").array().default([""]).notNull(),
}, (table) => [
	index("events_period_id_idx").using("btree", table.periodId.asc().nullsLast().op("uuid_ops")),
	index("events_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.periodId],
			foreignColumns: [periods.id],
			name: "events_period_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "events_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("events_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("events_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("events_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("events_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const assets = pgTable("assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	kind: assetKind().notNull(),
	storagePath: text("storage_path").notNull(),
	filename: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bytes: bigint({ mode: "number" }),
	mime: text(),
	width: integer(),
	height: integer(),
	caption: text(),
	takenOn: date("taken_on"),
	uploadedBy: uuid("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("assets_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "assets_site_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [profiles.id],
			name: "assets_uploaded_by_fkey"
		}),
	pgPolicy("assets_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("assets_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("assets_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("assets_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const elements = pgTable("elements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	parentId: uuid("parent_id"),
	name: text().notNull(),
	kind: elementKind().notNull(),
	confidence: confidenceLevel().default('low').notNull(),
	rationale: text(),
	assumptions: text().array().default([""]).notNull(),
	visible: boolean().default(true).notNull(),
	modelAssetId: uuid("model_asset_id"),
	transform: jsonb(),
	planX: doublePrecision("plan_x"),
	planY: doublePrecision("plan_y"),
	sort: integer().default(0).notNull(),
}, (table) => [
	index("elements_model_asset_id_idx").using("btree", table.modelAssetId.asc().nullsLast().op("uuid_ops")),
	index("elements_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("elements_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.modelAssetId],
			foreignColumns: [assets.id],
			name: "elements_model_asset_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "elements_parent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "elements_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("elements_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("elements_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("elements_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("elements_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const locations = pgTable("locations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	name: text().notNull(),
	planX: doublePrecision("plan_x"),
	planY: doublePrecision("plan_y"),
	primaryElementId: uuid("primary_element_id"),
	qrCode: text("qr_code"),
}, (table) => [
	index("locations_primary_element_id_idx").using("btree", table.primaryElementId.asc().nullsLast().op("uuid_ops")),
	index("locations_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.primaryElementId],
			foreignColumns: [elements.id],
			name: "locations_primary_element_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "locations_site_id_fkey"
		}).onDelete("cascade"),
	unique("locations_qr_code_key").on(table.qrCode),
	pgPolicy("locations_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("locations_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("locations_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("locations_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const evidence = pgTable("evidence", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	kind: evidenceKind().notNull(),
	title: text().notNull(),
	citation: text(),
	dateLabel: text("date_label"),
	strength: confidenceLevel().notNull(),
	note: text(),
	assetId: uuid("asset_id"),
	url: text(),
	addedBy: uuid("added_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("evidence_asset_id_idx").using("btree", table.assetId.asc().nullsLast().op("uuid_ops")),
	index("evidence_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [profiles.id],
			name: "evidence_added_by_fkey"
		}),
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [assets.id],
			name: "evidence_asset_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "evidence_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("evidence_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("evidence_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("evidence_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("evidence_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const questions = pgTable("questions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	elementId: uuid("element_id"),
	question: text().notNull(),
	context: text(),
	status: questionStatus().default('open').notNull(),
	level: confidenceLevel().notNull(),
	raisedBy: uuid("raised_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("questions_element_id_idx").using("btree", table.elementId.asc().nullsLast().op("uuid_ops")),
	index("questions_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.elementId],
			foreignColumns: [elements.id],
			name: "questions_element_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.raisedBy],
			foreignColumns: [profiles.id],
			name: "questions_raised_by_fkey"
		}),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "questions_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("questions_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("questions_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("questions_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("questions_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const interpretations = pgTable("interpretations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	elementId: uuid("element_id").notNull(),
	label: text().notNull(),
	summary: text(),
	confidence: confidenceLevel().notNull(),
	selected: boolean().default(false).notNull(),
	evidenceIds: uuid("evidence_ids").array().default([""]).notNull(),
}, (table) => [
	index("interpretations_element_id_idx").using("btree", table.elementId.asc().nullsLast().op("uuid_ops")),
	index("interpretations_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.elementId],
			foreignColumns: [elements.id],
			name: "interpretations_element_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "interpretations_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("interpretations_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("interpretations_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("interpretations_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("interpretations_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const comments = pgTable("comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	targetType: commentTarget("target_type").notNull(),
	targetId: uuid("target_id").notNull(),
	author: uuid().notNull(),
	body: text().notNull(),
	parentId: uuid("parent_id"),
	resolved: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("comments_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("comments_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	index("comments_target_idx").using("btree", table.targetType.asc().nullsLast().op("enum_ops"), table.targetId.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.author],
			foreignColumns: [profiles.id],
			name: "comments_author_fkey"
		}),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "comments_parent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "comments_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("comments_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'reviewer'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("comments_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("comments_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("comments_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const stories = pgTable("stories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	title: text().notNull(),
	category: text(),
	summary: text(),
	status: storyStatus().default('draft').notNull(),
	durationS: integer("duration_s"),
	sort: integer().default(0).notNull(),
}, (table) => [
	index("stories_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "stories_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("stories_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("stories_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("stories_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("stories_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const storySteps = pgTable("story_steps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storyId: uuid("story_id").notNull(),
	title: text().notNull(),
	locationId: uuid("location_id"),
	body: text(),
	audioAssetId: uuid("audio_asset_id"),
	audioDurationS: integer("audio_duration_s"),
	elementId: uuid("element_id"),
	sourceIds: uuid("source_ids").array().default([""]).notNull(),
	trigger: storyTrigger().notNull(),
	sort: integer().default(0).notNull(),
}, (table) => [
	index("story_steps_audio_asset_id_idx").using("btree", table.audioAssetId.asc().nullsLast().op("uuid_ops")),
	index("story_steps_element_id_idx").using("btree", table.elementId.asc().nullsLast().op("uuid_ops")),
	index("story_steps_location_id_idx").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
	index("story_steps_story_id_idx").using("btree", table.storyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.audioAssetId],
			foreignColumns: [assets.id],
			name: "story_steps_audio_asset_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.elementId],
			foreignColumns: [elements.id],
			name: "story_steps_element_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "story_steps_location_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.id],
			name: "story_steps_story_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("story_steps_write", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_steps.story_id) AND (private.site_role(s.site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role])))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM stories s
  WHERE ((s.id = story_steps.story_id) AND (private.site_role(s.site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role])))))`  }),
	pgPolicy("story_steps_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const condition = pgTable("condition", {
	siteId: uuid("site_id").primaryKey().notNull(),
	state: conditionState().notNull(),
	notes: text(),
	surveyedAt: date("surveyed_at"),
	survival: jsonb().default({}).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "condition_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("condition_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("condition_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("condition_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("condition_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const measurements = pgTable("measurements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	elementId: uuid("element_id"),
	dimension: text().notNull(),
	value: numeric(),
	unit: text(),
	method: text(),
}, (table) => [
	index("measurements_element_id_idx").using("btree", table.elementId.asc().nullsLast().op("uuid_ops")),
	index("measurements_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.elementId],
			foreignColumns: [elements.id],
			name: "measurements_element_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "measurements_site_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("measurements_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("measurements_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("measurements_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("measurements_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	status: reviewStatus().default('open').notNull(),
	submittedBy: uuid("submitted_by").notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	decidedBy: uuid("decided_by"),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }),
	contentSig: text("content_sig"),
}, (table) => [
	index("reviews_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	index("reviews_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.decidedBy],
			foreignColumns: [profiles.id],
			name: "reviews_decided_by_fkey"
		}),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "reviews_site_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.submittedBy],
			foreignColumns: [profiles.id],
			name: "reviews_submitted_by_fkey"
		}),
	pgPolicy("reviews_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.site_role(site_id) = ANY (ARRAY['admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("reviews_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("reviews_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("reviews_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const reviewItems = pgTable("review_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reviewId: uuid("review_id").notNull(),
	targetType: reviewItemTarget("target_type").notNull(),
	targetId: uuid("target_id").notNull(),
	status: reviewItemStatus().default('waiting').notNull(),
}, (table) => [
	index("review_items_review_id_idx").using("btree", table.reviewId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.reviewId],
			foreignColumns: [reviews.id],
			name: "review_items_review_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("review_items_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM reviews r
  WHERE ((r.id = review_items.review_id) AND (private.site_role(r.site_id) = ANY (ARRAY['admin'::org_role, 'owner'::org_role])))))` }),
	pgPolicy("review_items_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("review_items_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("review_items_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const analyticsEvents = pgTable("analytics_events", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	versionId: uuid("version_id"),
	type: text().notNull(),
	elementId: uuid("element_id"),
	locationId: uuid("location_id"),
	sessionId: text("session_id").notNull(),
	payload: jsonb().default({}).notNull(),
	at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("analytics_events_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	index("analytics_events_version_id_idx").using("btree", table.versionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.elementId],
			foreignColumns: [elements.id],
			name: "analytics_events_element_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "analytics_events_location_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "analytics_events_site_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.versionId],
			foreignColumns: [versions.id],
			name: "analytics_events_version_id_fkey"
		}).onDelete("set null"),
	pgPolicy("analytics_public_insert", { as: "permissive", for: "insert", to: ["anon", "authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM sites s
  WHERE ((s.id = analytics_events.site_id) AND (s.status = 'published'::site_status))))`  }),
	pgPolicy("analytics_public_read", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	pgPolicy("analytics_member_read", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const feedback = pgTable("feedback", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull(),
	versionId: uuid("version_id"),
	understand: smallint(),
	trust: smallint(),
	comment: text(),
	page: text(),
	sessionId: text("session_id").notNull(),
	at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("feedback_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	index("feedback_version_id_idx").using("btree", table.versionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "feedback_site_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.versionId],
			foreignColumns: [versions.id],
			name: "feedback_version_id_fkey"
		}).onDelete("set null"),
	pgPolicy("feedback_public_insert", { as: "permissive", for: "insert", to: ["anon", "authenticated"], withCheck: sql`(EXISTS ( SELECT 1
   FROM sites s
  WHERE ((s.id = feedback.site_id) AND (s.status = 'published'::site_status))))`  }),
	pgPolicy("feedback_public_read", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	pgPolicy("feedback_member_read", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("feedback_trust_range", sql`(trust IS NULL) OR ((trust >= 1) AND (trust <= 5))`),
	check("feedback_understand_range", sql`(understand IS NULL) OR ((understand >= 1) AND (understand <= 5))`),
]);

export const versions = pgTable("versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	siteId: uuid("site_id").notNull().references((): AnyPgColumn => sites.id, { onDelete: "cascade" }),
	number: text().notNull(),
	note: text(),
	publishedBy: uuid("published_by"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	snapshot: jsonb().notNull(),
	checksum: text().notNull(),
}, (table) => [
	index("versions_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.publishedBy],
			foreignColumns: [profiles.id],
			name: "versions_published_by_fkey"
		}),
	unique("versions_site_id_number_key").on(table.siteId, table.number),
	pgPolicy("versions_public_read", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((published_at IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sites s
  WHERE ((s.id = versions.site_id) AND (s.status = 'published'::site_status)))))` }),
	pgPolicy("versions_member_read", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const elementEvidence = pgTable("element_evidence", {
	elementId: uuid("element_id").notNull(),
	evidenceId: uuid("evidence_id").notNull(),
}, (table) => [
	index("element_evidence_evidence_id_idx").using("btree", table.evidenceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.elementId],
			foreignColumns: [elements.id],
			name: "element_evidence_element_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.evidenceId],
			foreignColumns: [evidence.id],
			name: "element_evidence_evidence_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.elementId, table.evidenceId], name: "element_evidence_pkey"}),
	pgPolicy("element_evidence_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM elements e
  WHERE ((e.id = element_evidence.element_id) AND (private.site_role(e.site_id) = ANY (ARRAY['creator'::org_role, 'admin'::org_role, 'owner'::org_role])))))` }),
	pgPolicy("element_evidence_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("element_evidence_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const orgMembers = pgTable("org_members", {
	orgId: uuid("org_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: orgRole().notNull(),
}, (table) => [
	index("org_members_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organisations.id],
			name: "org_members_org_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "org_members_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.orgId, table.userId], name: "org_members_pkey"}),
	pgPolicy("org_members_delete", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(private.org_role(org_id) = ANY (ARRAY['admin'::org_role, 'owner'::org_role]))` }),
	pgPolicy("org_members_update", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("org_members_bootstrap_owner", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("org_members_insert_admin", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("org_members_select", { as: "permissive", for: "select", to: ["authenticated"] }),
]);
