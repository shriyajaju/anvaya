import type {
  Bundle,
  Confidence,
  DiffItem,
  Element,
  Review,
  Role,
  RuleResult,
  Snapshot,
  Story,
} from './types'

export function contentSig(bundle: Bundle): string {
  const payload = {
    elements: bundle.elements.map((element) => ({
      id: element.id,
      name: element.name,
      confidence: element.confidence,
      rationale: element.rationale,
      assumptions: element.assumptions,
      visible: element.visible,
    })),
    links: bundle.links
      .map((link) => `${link.elementId}:${link.evidenceId}`)
      .sort(),
    stories: bundle.stories.map((story) => ({
      id: story.id,
      title: story.title,
      status: story.status,
      steps: story.steps.map((step) => step.title),
    })),
    evidence: bundle.evidence.map((item) => item.id).sort(),
  }
  const text = JSON.stringify(payload)
  let hash = 5381
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) + hash + text.charCodeAt(index)
  }
  return (hash >>> 0).toString(16)
}

export function linkedEvidence(bundle: Bundle, elementId: string) {
  const ids = new Set(
    bundle.links.filter((link) => link.elementId === elementId).map((link) => link.evidenceId),
  )
  return bundle.evidence.filter((item) => ids.has(item.id))
}

export function snapshotOf(bundle: Bundle): Snapshot {
  const published = bundle.stories.filter((story) => story.status === 'published')
  return {
    site: structuredClone(bundle.site),
    periods: structuredClone(bundle.periods),
    events: structuredClone(bundle.events),
    locations: structuredClone(bundle.locations),
    elements: bundle.elements.map((element) => ({
      ...structuredClone(element),
      evidence: structuredClone(linkedEvidence(bundle, element.id)),
      interpretations: structuredClone(
        bundle.interpretations.filter((item) => item.elementId === element.id),
      ),
    })),
    stories: structuredClone(published),
    evidence: structuredClone(bundle.evidence),
    settings: structuredClone(bundle.site.settings),
    counts: {
      elements: bundle.elements.filter((element) => element.type !== 'group').length,
      evidence: bundle.evidence.length,
      stories: published.length,
    },
    reviewedBy: [...bundle.reviews].reverse().find((review) => review.status === 'approved')
      ?.decidedBy,
  }
}

export function setConfidence(
  bundle: Bundle,
  elementId: string,
  level: Confidence,
): RuleResult<Bundle> {
  const element = bundle.elements.find((item) => item.id === elementId)
  if (!element) return { ok: false, error: 'Element not found.' }
  const linked = bundle.links.some((link) => link.elementId === elementId)
  if (level === 'high' && bundle.site.settings.requireSourceForHigh && !linked) {
    return {
      ok: false,
      error: 'High confidence needs at least one linked source. Link evidence first.',
    }
  }
  return {
    ok: true,
    value: {
      ...bundle,
      elements: bundle.elements.map((item) =>
        item.id === elementId ? { ...item, confidence: level } : item,
      ),
    },
  }
}

function leaves(elements: Element[]) {
  return elements.filter(
    (element) => element.type !== 'group' && !elements.some((child) => child.parentId === element.id),
  )
}

function changedTargets(bundle: Bundle): string[] {
  const current = bundle.versions.find((version) => version.id === bundle.site.currentVersionId)
  const leaf = leaves(bundle.elements)
  if (!current) return leaf.map((element) => element.id)
  const previous = new Map(current.snapshot.elements.map((element) => [element.id, element]))
  const changed = leaf.filter((element) => {
    const before = previous.get(element.id)
    if (!before) return true
    const beforeSources = before.evidence.map((item) => item.id).sort().join(',')
    const nowSources = linkedEvidence(bundle, element.id)
      .map((item) => item.id)
      .sort()
      .join(',')
    return (
      before.confidence !== element.confidence ||
      before.rationale !== element.rationale ||
      beforeSources !== nowSources
    )
  })
  const stories = bundle.stories
    .filter((story) => story.status !== 'published')
    .map((story) => story.id)
  const targets = [...changed.map((element) => element.id), ...stories]
  return targets.length ? targets : leaf.map((element) => element.id)
}

export function submitReview(bundle: Bundle, role: Role): RuleResult<Bundle> {
  if (role !== 'creator' && role !== 'admin') {
    return { ok: false, error: 'Only a creator can submit a review.' }
  }
  const targets = changedTargets(bundle)
  const review: Review = {
    id: `r-${Date.now().toString(36)}`,
    status: 'open',
    submittedBy: role,
    submittedAt: new Date().toISOString(),
    items: targets.map((target) => ({ target, status: 'waiting' })),
    comments: [],
  }
  return {
    ok: true,
    value: {
      ...bundle,
      site: { ...bundle.site, status: 'in_review' },
      reviews: [...bundle.reviews, review],
      stories: bundle.stories.map((story) =>
        story.status === 'draft' ? { ...story, status: 'in_review' } : story,
      ),
    },
  }
}

function latestOpen(bundle: Bundle) {
  return [...bundle.reviews].reverse().find((review) => review.status !== 'withdrawn')
}

export function requestChanges(
  bundle: Bundle,
  role: Role,
  target: string,
  body: string,
): RuleResult<Bundle> {
  if (!body.trim()) return { ok: false, error: 'A comment is required.' }
  const review = latestOpen(bundle)
  if (!review || (review.status !== 'open' && review.status !== 'changes_requested')) {
    return { ok: false, error: 'There is no open review.' }
  }
  if (role === 'creator' || role === review.submittedBy) {
    return { ok: false, error: 'You cannot review your own submission.' }
  }
  const comment = {
    id: `c-${Date.now().toString(36)}`,
    target,
    author: role,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    resolved: false,
  }
  return {
    ok: true,
    value: {
      ...bundle,
      reviews: bundle.reviews.map((item) =>
        item.id === review.id
          ? {
              ...item,
              status: 'changes_requested' as const,
              items: item.items.map((entry) =>
                entry.target === target ? { ...entry, status: 'changes' as const } : entry,
              ),
              comments: [...item.comments, comment],
            }
          : item,
      ),
    },
  }
}

export function replyToComment(
  bundle: Bundle,
  commentId: string,
  reply: string,
): RuleResult<Bundle> {
  if (!reply.trim()) return { ok: false, error: 'Write a reply first.' }
  return {
    ok: true,
    value: {
      ...bundle,
      reviews: bundle.reviews.map((review) => ({
        ...review,
        comments: review.comments.map((comment) =>
          comment.id === commentId ? { ...comment, reply: reply.trim() } : comment,
        ),
      })),
    },
  }
}

export function resolveComment(bundle: Bundle, commentId: string): Bundle {
  return {
    ...bundle,
    reviews: bundle.reviews.map((review) => ({
      ...review,
      comments: review.comments.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: true } : comment,
      ),
    })),
  }
}

export function resubmit(bundle: Bundle, role: Role): RuleResult<Bundle> {
  const review = latestOpen(bundle)
  if (!review || review.status !== 'changes_requested') {
    return { ok: false, error: 'Nothing is waiting to be resubmitted.' }
  }
  if (review.comments.some((comment) => !comment.resolved)) {
    return { ok: false, error: 'Resolve every comment before resubmitting.' }
  }
  return {
    ok: true,
    value: {
      ...bundle,
      site: { ...bundle.site, status: 'in_review' },
      reviews: bundle.reviews.map((item) =>
        item.id === review.id
          ? {
              ...item,
              status: 'open' as const,
              submittedBy: role,
              submittedAt: new Date().toISOString(),
              sig: undefined,
              items: item.items.map((entry) => ({ ...entry, status: 'waiting' as const })),
            }
          : item,
      ),
    },
  }
}

export function approve(bundle: Bundle, role: Role): RuleResult<Bundle> {
  const review = latestOpen(bundle)
  if (!review || (review.status !== 'open' && review.status !== 'changes_requested')) {
    return { ok: false, error: 'There is no review to approve.' }
  }
  if (role === 'creator' || role === review.submittedBy) {
    return { ok: false, error: 'A creator cannot approve their own review.' }
  }
  return {
    ok: true,
    value: {
      ...bundle,
      reviews: bundle.reviews.map((item) =>
        item.id === review.id
          ? {
              ...item,
              status: 'approved' as const,
              decidedBy: role,
              decidedAt: new Date().toISOString(),
              sig: contentSig(bundle),
              items: item.items.map((entry) => ({ ...entry, status: 'approved' as const })),
            }
          : item,
      ),
    },
  }
}

export function canPublish(bundle: Bundle, role: Role): { ok: boolean; hard: string[]; soft: string[] } {
  const hard: string[] = []
  const soft: string[] = []
  const review = [...bundle.reviews].reverse().find((item) => item.status !== 'withdrawn')
  if (role !== 'admin') hard.push('Only an admin can publish.')
  if (!review || review.status !== 'approved') hard.push('The latest review must be approved.')
  if (review?.status === 'approved' && review.sig !== contentSig(bundle)) {
    hard.push('The reconstruction changed after approval. Submit it for review again.')
  }
  const missing = leaves(bundle.elements).filter(
    (element) => !bundle.links.some((link) => link.elementId === element.id),
  )
  if (bundle.site.settings.warnNoEvidence && missing.length) {
    soft.push(`${missing.map((element) => element.name).join(', ')} still has no linked source.`)
  }
  return { ok: hard.length === 0, hard, soft }
}

export function publish(bundle: Bundle, role: Role, number: string, note: string): RuleResult<Bundle> {
  const gate = canPublish(bundle, role)
  if (!gate.ok) return { ok: false, error: gate.hard[0] ?? 'This version cannot be published.' }
  const nextStories: Story[] = bundle.stories.map((story) =>
    story.status === 'in_review' || story.status === 'draft'
      ? { ...story, status: 'published' }
      : story,
  )
  const prepared: Bundle = { ...bundle, stories: nextStories }
  const version = {
    id: `v-${Date.now().toString(36)}`,
    number: number.trim() || '1.0',
    note: note.trim(),
    publishedAt: new Date().toISOString(),
    publishedBy: role,
    snapshot: snapshotOf(prepared),
  }
  return {
    ok: true,
    value: {
      ...prepared,
      versions: [...prepared.versions, version],
      site: { ...prepared.site, status: 'published', currentVersionId: version.id },
    },
  }
}

export function diffSnapshots(before: Snapshot, after: Snapshot): DiffItem[] {
  const items: DiffItem[] = []
  const previous = new Map(before.elements.map((element) => [element.id, element]))
  const next = new Map(after.elements.map((element) => [element.id, element]))
  for (const element of after.elements) {
    const prior = previous.get(element.id)
    if (!prior) {
      items.push({ kind: 'added', label: 'Element added', detail: element.name })
      continue
    }
    if (prior.confidence !== element.confidence) {
      items.push({
        kind: 'confidence',
        label: 'Confidence changed',
        detail: `${element.name} ${labelConfidence(prior.confidence)} → ${labelConfidence(element.confidence)}`,
      })
    }
    const priorSources = new Set(prior.evidence.map((item) => item.id))
    const added = element.evidence.filter((item) => !priorSources.has(item.id))
    if (added.length) {
      items.push({
        kind: 'source',
        label: 'Source added',
        detail: `${element.name}: ${added.map((item) => item.title).join(', ')}`,
      })
    }
  }
  for (const element of before.elements) {
    if (!next.has(element.id)) {
      items.push({ kind: 'removed', label: 'Element removed', detail: element.name })
    }
  }
  const priorStories = new Set(before.stories.map((story) => story.id))
  for (const story of after.stories) {
    if (!priorStories.has(story.id)) {
      items.push({ kind: 'story', label: 'Story published', detail: story.title })
    }
  }
  return items
}

export function labelConfidence(level: Confidence) {
  if (level === 'high') return 'High'
  if (level === 'medium') return 'Medium'
  return 'Low'
}

export function visitorConfidence(level: Confidence) {
  if (level === 'high') return 'Well supported'
  if (level === 'medium') return 'Likely'
  return 'Uncertain'
}

export interface AttentionItem {
  level: 'low' | 'medium' | 'review'
  title: string
  detail: string
  elementId?: string
}

export function attention(bundle: Bundle): AttentionItem[] {
  const items: AttentionItem[] = []
  for (const element of leaves(bundle.elements)) {
    const linked = bundle.links.some((link) => link.elementId === element.id)
    if (!linked) {
      items.push({
        level: 'low',
        title: element.name,
        detail: 'No linked evidence',
        elementId: element.id,
      })
    }
    if (!element.rationale.trim()) {
      items.push({
        level: 'medium',
        title: element.name,
        detail: 'No rationale',
        elementId: element.id,
      })
    }
  }
  for (const review of bundle.reviews) {
    for (const comment of review.comments) {
      if (!comment.resolved && comment.author !== 'creator') {
        items.push({
          level: 'review',
          title: 'Unresolved reviewer comment',
          detail: comment.body,
          elementId: comment.target,
        })
      }
    }
  }
  return items
}
