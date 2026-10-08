export type Confidence = 'high' | 'medium' | 'low'
export type EvidenceType =
  | 'physical'
  | 'archaeological'
  | 'historical'
  | 'comparative'
  | 'visual'
  | 'scholarly'
export type Role = 'creator' | 'reviewer' | 'admin'
export type SiteStatus = 'draft' | 'in_review' | 'published'
export type ElementType = 'group' | 'structure' | 'architectural' | 'object'
export type Geom = 'northwall' | 'entrance' | 'roof' | 'frieze' | 'cistern' | 'block'
export type StoryStatus = 'draft' | 'in_review' | 'published'

export interface SiteSettings {
  requireSourceForHigh: boolean
  warnNoEvidence: boolean
  showAssumptions: boolean
  showAlternatives: boolean
  collectFeedback: boolean
}

export interface Site {
  id: string
  slug: string
  name: string
  location: string
  type: string
  description: string
  status: SiteStatus
  requireReview: boolean
  reconstructionYear: string
  currentVersionId?: string
  managedBy: string
  licence: string
  settings: SiteSettings
}

export interface Element {
  id: string
  name: string
  type: ElementType
  parentId?: string
  confidence: Confidence
  rationale: string
  assumptions: string[]
  visible: boolean
  geom?: Geom
  x: number
  y: number
}

export interface Evidence {
  id: string
  type: EvidenceType
  title: string
  citation: string
  date: string
  strength: Confidence
  addedBy: Role
  note: string
  createdAt: string
}

export interface Link {
  elementId: string
  evidenceId: string
}

export interface Question {
  id: string
  elementId: string
  question: string
  context: string
  status: 'open' | 'resolved'
  level: Confidence
  raisedBy: Role
  createdAt: string
}

export interface Interpretation {
  id: string
  elementId: string
  label: string
  summary: string
  confidence: Confidence
  selected: boolean
  evidenceIds: string[]
}

export interface Comment {
  id: string
  target: string
  author: Role
  body: string
  createdAt: string
  resolved?: boolean
  reply?: string
}

export interface StoryStep {
  id: string
  title: string
  locationId: string
  body: string
  audio: string
  elementId?: string
  sourceIds: string[]
}

export interface Story {
  id: string
  title: string
  category: string
  summary: string
  status: StoryStatus
  duration: number
  steps: StoryStep[]
}

export interface Location {
  id: string
  name: string
  x: number
  y: number
  primary?: string
}

export interface Period {
  id: string
  name: string
  from: string
  to: string
}

export interface TimelineEvent {
  id: string
  periodId: string
  title: string
  year: string
  approx: boolean
  type: string
  desc: string
  elementIds?: string[]
}

export interface ReviewItem {
  target: string
  status: 'waiting' | 'approved' | 'changes'
}

export interface Review {
  id: string
  status: 'open' | 'changes_requested' | 'approved' | 'withdrawn'
  submittedBy: Role
  submittedAt: string
  decidedBy?: Role
  decidedAt?: string
  sig?: string
  items: ReviewItem[]
  comments: Comment[]
}

export interface SnapshotElement extends Element {
  evidence: Evidence[]
  interpretations: Interpretation[]
}

export interface Snapshot {
  site: Site
  periods: Period[]
  events: TimelineEvent[]
  locations: Location[]
  elements: SnapshotElement[]
  stories: Story[]
  evidence: Evidence[]
  settings: SiteSettings
  counts: { elements: number; evidence: number; stories: number }
  reviewedBy?: Role
}

export interface Version {
  id: string
  number: string
  note: string
  publishedAt: string
  publishedBy: Role
  snapshot: Snapshot
}

export interface Condition {
  state: 'good' | 'fair' | 'poor'
  notes: string
  surveyedAt: string
  survival: Record<string, number>
}

export interface Photo {
  id: string
  title: string
  caption: string
}

export interface Measurement {
  id: string
  label: string
  value: string
}

export interface Bundle {
  site: Site
  elements: Element[]
  evidence: Evidence[]
  links: Link[]
  questions: Question[]
  interpretations: Interpretation[]
  comments: Comment[]
  stories: Story[]
  locations: Location[]
  periods: Period[]
  events: TimelineEvent[]
  reviews: Review[]
  versions: Version[]
  condition: Condition
  photos: Photo[]
  measurements: Measurement[]
}

export interface AnalyticsEvent {
  id: string
  type: string
  payload: Record<string, string>
  sid: string
  at: string
  siteId: string
}

export interface Feedback {
  id: string
  siteId: string
  understand?: number
  trust?: number
  comment: string
  at: string
  where: string
}

export interface DiffItem {
  kind: 'added' | 'removed' | 'confidence' | 'source' | 'story'
  label: string
  detail: string
}

export type RuleResult<T> = { ok: true; value: T } | { ok: false; error: string }
