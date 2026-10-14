import { relations } from "drizzle-orm/relations";
import { usersInAuth, profiles, sites, versions, organisations, periods, events, assets, elements, locations, evidence, questions, interpretations, comments, stories, storySteps, condition, measurements, reviews, reviewItems, analyticsEvents, feedback, elementEvidence, orgMembers, orgInvites } from "./schema";

export const profilesRelations = relations(profiles, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [profiles.id],
		references: [usersInAuth.id]
	}),
	sites: many(sites),
	assets: many(assets),
	evidences: many(evidence),
	questions: many(questions),
	comments: many(comments),
	reviews_decidedBy: many(reviews, {
		relationName: "reviews_decidedBy_profiles_id"
	}),
	reviews_submittedBy: many(reviews, {
		relationName: "reviews_submittedBy_profiles_id"
	}),
	versions: many(versions),
	orgMembers: many(orgMembers),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	profiles: many(profiles),
}));

export const sitesRelations = relations(sites, ({one, many}) => ({
	profile: one(profiles, {
		fields: [sites.createdBy],
		references: [profiles.id]
	}),
	version: one(versions, {
		fields: [sites.currentVersionId],
		references: [versions.id],
		relationName: "sites_currentVersionId_versions_id"
	}),
	organisation: one(organisations, {
		fields: [sites.orgId],
		references: [organisations.id]
	}),
	periods: many(periods),
	events: many(events),
	assets: many(assets),
	elements: many(elements),
	locations: many(locations),
	evidences: many(evidence),
	questions: many(questions),
	interpretations: many(interpretations),
	comments: many(comments),
	stories: many(stories),
	conditions: many(condition),
	measurements: many(measurements),
	reviews: many(reviews),
	analyticsEvents: many(analyticsEvents),
	feedbacks: many(feedback),
	versions: many(versions, {
		relationName: "versions_siteId_sites_id"
	}),
}));

export const versionsRelations = relations(versions, ({one, many}) => ({
	sites: many(sites, {
		relationName: "sites_currentVersionId_versions_id"
	}),
	analyticsEvents: many(analyticsEvents),
	feedbacks: many(feedback),
	profile: one(profiles, {
		fields: [versions.publishedBy],
		references: [profiles.id]
	}),
	site: one(sites, {
		fields: [versions.siteId],
		references: [sites.id],
		relationName: "versions_siteId_sites_id"
	}),
}));

export const organisationsRelations = relations(organisations, ({many}) => ({
	sites: many(sites),
	orgMembers: many(orgMembers),
	orgInvites: many(orgInvites),
}));

export const periodsRelations = relations(periods, ({one, many}) => ({
	site: one(sites, {
		fields: [periods.siteId],
		references: [sites.id]
	}),
	events: many(events),
}));

export const eventsRelations = relations(events, ({one}) => ({
	period: one(periods, {
		fields: [events.periodId],
		references: [periods.id]
	}),
	site: one(sites, {
		fields: [events.siteId],
		references: [sites.id]
	}),
}));

export const assetsRelations = relations(assets, ({one, many}) => ({
	site: one(sites, {
		fields: [assets.siteId],
		references: [sites.id]
	}),
	profile: one(profiles, {
		fields: [assets.uploadedBy],
		references: [profiles.id]
	}),
	elements: many(elements),
	evidences: many(evidence),
	storySteps: many(storySteps),
}));

export const elementsRelations = relations(elements, ({one, many}) => ({
	asset: one(assets, {
		fields: [elements.modelAssetId],
		references: [assets.id]
	}),
	element: one(elements, {
		fields: [elements.parentId],
		references: [elements.id],
		relationName: "elements_parentId_elements_id"
	}),
	elements: many(elements, {
		relationName: "elements_parentId_elements_id"
	}),
	site: one(sites, {
		fields: [elements.siteId],
		references: [sites.id]
	}),
	locations: many(locations),
	questions: many(questions),
	interpretations: many(interpretations),
	storySteps: many(storySteps),
	measurements: many(measurements),
	analyticsEvents: many(analyticsEvents),
	elementEvidences: many(elementEvidence),
}));

export const locationsRelations = relations(locations, ({one, many}) => ({
	element: one(elements, {
		fields: [locations.primaryElementId],
		references: [elements.id]
	}),
	site: one(sites, {
		fields: [locations.siteId],
		references: [sites.id]
	}),
	storySteps: many(storySteps),
	analyticsEvents: many(analyticsEvents),
}));

export const evidenceRelations = relations(evidence, ({one, many}) => ({
	profile: one(profiles, {
		fields: [evidence.addedBy],
		references: [profiles.id]
	}),
	asset: one(assets, {
		fields: [evidence.assetId],
		references: [assets.id]
	}),
	site: one(sites, {
		fields: [evidence.siteId],
		references: [sites.id]
	}),
	elementEvidences: many(elementEvidence),
}));

export const questionsRelations = relations(questions, ({one}) => ({
	element: one(elements, {
		fields: [questions.elementId],
		references: [elements.id]
	}),
	profile: one(profiles, {
		fields: [questions.raisedBy],
		references: [profiles.id]
	}),
	site: one(sites, {
		fields: [questions.siteId],
		references: [sites.id]
	}),
}));

export const interpretationsRelations = relations(interpretations, ({one}) => ({
	element: one(elements, {
		fields: [interpretations.elementId],
		references: [elements.id]
	}),
	site: one(sites, {
		fields: [interpretations.siteId],
		references: [sites.id]
	}),
}));

export const commentsRelations = relations(comments, ({one, many}) => ({
	profile: one(profiles, {
		fields: [comments.author],
		references: [profiles.id]
	}),
	comment: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: "comments_parentId_comments_id"
	}),
	comments: many(comments, {
		relationName: "comments_parentId_comments_id"
	}),
	site: one(sites, {
		fields: [comments.siteId],
		references: [sites.id]
	}),
}));

export const storiesRelations = relations(stories, ({one, many}) => ({
	site: one(sites, {
		fields: [stories.siteId],
		references: [sites.id]
	}),
	storySteps: many(storySteps),
}));

export const storyStepsRelations = relations(storySteps, ({one}) => ({
	asset: one(assets, {
		fields: [storySteps.audioAssetId],
		references: [assets.id]
	}),
	element: one(elements, {
		fields: [storySteps.elementId],
		references: [elements.id]
	}),
	location: one(locations, {
		fields: [storySteps.locationId],
		references: [locations.id]
	}),
	story: one(stories, {
		fields: [storySteps.storyId],
		references: [stories.id]
	}),
}));

export const conditionRelations = relations(condition, ({one}) => ({
	site: one(sites, {
		fields: [condition.siteId],
		references: [sites.id]
	}),
}));

export const measurementsRelations = relations(measurements, ({one}) => ({
	element: one(elements, {
		fields: [measurements.elementId],
		references: [elements.id]
	}),
	site: one(sites, {
		fields: [measurements.siteId],
		references: [sites.id]
	}),
}));

export const reviewsRelations = relations(reviews, ({one, many}) => ({
	profile_decidedBy: one(profiles, {
		fields: [reviews.decidedBy],
		references: [profiles.id],
		relationName: "reviews_decidedBy_profiles_id"
	}),
	site: one(sites, {
		fields: [reviews.siteId],
		references: [sites.id]
	}),
	profile_submittedBy: one(profiles, {
		fields: [reviews.submittedBy],
		references: [profiles.id],
		relationName: "reviews_submittedBy_profiles_id"
	}),
	reviewItems: many(reviewItems),
}));

export const reviewItemsRelations = relations(reviewItems, ({one}) => ({
	review: one(reviews, {
		fields: [reviewItems.reviewId],
		references: [reviews.id]
	}),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({one}) => ({
	element: one(elements, {
		fields: [analyticsEvents.elementId],
		references: [elements.id]
	}),
	location: one(locations, {
		fields: [analyticsEvents.locationId],
		references: [locations.id]
	}),
	site: one(sites, {
		fields: [analyticsEvents.siteId],
		references: [sites.id]
	}),
	version: one(versions, {
		fields: [analyticsEvents.versionId],
		references: [versions.id]
	}),
}));

export const feedbackRelations = relations(feedback, ({one}) => ({
	site: one(sites, {
		fields: [feedback.siteId],
		references: [sites.id]
	}),
	version: one(versions, {
		fields: [feedback.versionId],
		references: [versions.id]
	}),
}));

export const elementEvidenceRelations = relations(elementEvidence, ({one}) => ({
	element: one(elements, {
		fields: [elementEvidence.elementId],
		references: [elements.id]
	}),
	evidence: one(evidence, {
		fields: [elementEvidence.evidenceId],
		references: [evidence.id]
	}),
}));

export const orgInvitesRelations = relations(orgInvites, ({one}) => ({
	organisation: one(organisations, {
		fields: [orgInvites.orgId],
		references: [organisations.id]
	}),
	profile: one(profiles, {
		fields: [orgInvites.invitedBy],
		references: [profiles.id]
	}),
}));

export const orgMembersRelations = relations(orgMembers, ({one}) => ({
	organisation: one(organisations, {
		fields: [orgMembers.orgId],
		references: [organisations.id]
	}),
	profile: one(profiles, {
		fields: [orgMembers.userId],
		references: [profiles.id]
	}),
}));