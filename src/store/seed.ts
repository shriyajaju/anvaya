import { contentSig, snapshotOf } from './rules'
import type { Bundle, SiteSettings } from './types'

const settings = (): SiteSettings => ({
  requireSourceForHigh: true,
  warnNoEvidence: true,
  showAssumptions: true,
  showAlternatives: true,
  collectFeedback: true,
})

export const PEOPLE = {
  creator: { name: 'A. Iyer', role: 'Conservation architect', initials: 'AI', email: 'a.iyer@anvaya.demo' },
  reviewer: { name: 'R. Mehta', role: 'Archaeologist', initials: 'RM', email: 'r.mehta@anvaya.demo' },
  admin: { name: 'S. Rao', role: 'Trust director', initials: 'SR', email: 's.rao@anvaya.demo' },
} as const

export const DEMO_PASSWORD = 'anvaya'

export const PLACEHOLDER_SITE = {
  name: 'Placeholder hall',
  location: 'Demonstration site — not a mapped monument',
  type: 'Rock-cut hall',
  description:
    'Approved placeholder for a live demo. Nothing written here is a historical claim. Add one element, link a source, and publish a reconstruction that stays labelled as an interpretation.',
  year: '200',
}

export function createKanheri(): Bundle {
  const bundle: Bundle = {
    site: {
      id: 'kanheri',
      slug: 'kanheri',
      name: 'Kanheri Caves',
      location: 'Mumbai, Maharashtra',
      type: 'Rock-cut Buddhist caves',
      description:
        'A published reconstruction of Cave 3 at about 200 CE. Surviving stone is separated from inferred parts, and every inferred part carries a confidence level.',
      status: 'published',
      requireReview: true,
      reconstructionYear: '200',
      managedBy: 'Placeholder managing authority',
      licence: 'CC BY-NC 4.0',
      settings: settings(),
    },
    elements: [
      {
        id: 'cave3',
        name: 'Cave 3',
        type: 'group',
        confidence: 'high',
        rationale: 'The cave is identified in the surviving rock-cut hall.',
        assumptions: [],
        visible: true,
        x: 0,
        y: 0,
      },
      {
        id: 'northwall',
        name: 'North wall',
        type: 'architectural',
        parentId: 'cave3',
        confidence: 'high',
        rationale: 'The wall survives in place; only its upper courses are inferred.',
        assumptions: [],
        visible: true,
        geom: 'northwall',
        x: 210,
        y: 118,
      },
      {
        id: 'entrance',
        name: 'Entrance',
        type: 'architectural',
        parentId: 'cave3',
        confidence: 'high',
        rationale: 'Entrance pillars and threshold survive; profile recorded in 1880 and 2026.',
        assumptions: ['Door leaves were timber, now lost'],
        visible: true,
        geom: 'entrance',
        x: 250,
        y: 214,
      },
      {
        id: 'roof',
        name: 'Roof',
        type: 'architectural',
        parentId: 'cave3',
        confidence: 'medium',
        rationale:
          'Roof form inferred from surviving beam sockets and comparison with Cave 3 at Karla. No direct evidence of the ridge height.',
        assumptions: ['Ridge height estimated at 4.2 m', 'Timber species unknown'],
        visible: true,
        geom: 'roof',
        x: 170,
        y: 42,
      },
      {
        id: 'frieze',
        name: 'Decorative frieze',
        type: 'architectural',
        parentId: 'cave3',
        confidence: 'low',
        rationale:
          'Traces of a carved band survive above the entrance; the pattern is largely eroded.',
        assumptions: ['Pattern continued around the full width', 'Originally painted'],
        visible: true,
        geom: 'frieze',
        x: 250,
        y: 186,
      },
      {
        id: 'cistern',
        name: 'Water cistern',
        type: 'object',
        confidence: 'low',
        rationale: '',
        assumptions: ['Cistern was open to the sky'],
        visible: true,
        geom: 'cistern',
        x: 440,
        y: 430,
      },
    ],
    evidence: [
      {
        id: 'ev1',
        type: 'physical',
        title: 'Beam socket survey, Cave 3',
        citation: 'Beam socket survey, Cave 3, 2026 (placeholder reference)',
        date: '2026',
        strength: 'high',
        addedBy: 'creator',
        note: 'Sockets in the north wall show where beams sat.',
        createdAt: '2026-01-12T00:00:00.000Z',
      },
      {
        id: 'ev2',
        type: 'historical',
        title: 'Fergusson & Burgess, Cave Temples of India, 1880, pl. 12',
        citation: 'Fergusson & Burgess, Cave Temples of India, 1880, pl. 12 (placeholder reference)',
        date: '1880',
        strength: 'medium',
        addedBy: 'creator',
        note: 'Early plan and section of this cave.',
        createdAt: '2026-01-12T00:00:00.000Z',
      },
      {
        id: 'ev3',
        type: 'comparative',
        title: 'Cave 3 at Karla — roof profile',
        citation: 'Cave 3 at Karla — roof profile, 1st c. CE (placeholder reference)',
        date: '1st c. CE',
        strength: 'medium',
        addedBy: 'creator',
        note: 'A similar hall that kept its timber roof.',
        createdAt: '2026-01-12T00:00:00.000Z',
      },
      {
        id: 'ev4',
        type: 'visual',
        title: 'Site photograph, 1962 (archive)',
        citation: 'Site photograph, 1962 (archive) (placeholder reference)',
        date: '1962',
        strength: 'high',
        addedBy: 'creator',
        note: 'Shows the entrance before recent weathering.',
        createdAt: '2026-01-12T00:00:00.000Z',
      },
      {
        id: 'ev5',
        type: 'scholarly',
        title: 'Nagaraju, Buddhist Architecture of Western India, 1981',
        citation: 'Nagaraju, Buddhist Architecture of Western India, 1981 (placeholder reference)',
        date: '1981',
        strength: 'low',
        addedBy: 'reviewer',
        note: 'Discusses cistern types across the region.',
        createdAt: '2026-01-12T00:00:00.000Z',
      },
    ],
    links: [
      { elementId: 'roof', evidenceId: 'ev1' },
      { elementId: 'roof', evidenceId: 'ev2' },
      { elementId: 'roof', evidenceId: 'ev3' },
      { elementId: 'northwall', evidenceId: 'ev1' },
      { elementId: 'northwall', evidenceId: 'ev2' },
      { elementId: 'northwall', evidenceId: 'ev4' },
      { elementId: 'entrance', evidenceId: 'ev1' },
      { elementId: 'entrance', evidenceId: 'ev2' },
      { elementId: 'entrance', evidenceId: 'ev4' },
      { elementId: 'frieze', evidenceId: 'ev4' },
    ],
    questions: [
      {
        id: 'q1',
        elementId: 'roof',
        question: 'What was the roof form of Cave 3?',
        context: 'Beam sockets survive. The ridge height does not.',
        status: 'open',
        level: 'low',
        raisedBy: 'creator',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 'q2',
        elementId: 'entrance',
        question: 'Original height of the entrance?',
        context: 'Raised during review of the 1880 section.',
        status: 'open',
        level: 'medium',
        raisedBy: 'reviewer',
        createdAt: '2026-02-02T00:00:00.000Z',
      },
      {
        id: 'q3',
        elementId: 'cistern',
        question: 'Were the cisterns roofed?',
        context: 'No cover survives at this cistern.',
        status: 'open',
        level: 'medium',
        raisedBy: 'creator',
        createdAt: '2026-02-03T00:00:00.000Z',
      },
    ],
    interpretations: [
      {
        id: 'i1',
        elementId: 'roof',
        label: 'Pitched timber roof, ridge about 4.2 m',
        summary: 'Selected reading from sockets and the Karla comparison. (placeholder reference)',
        confidence: 'medium',
        selected: true,
        evidenceIds: ['ev1', 'ev3'],
      },
      {
        id: 'i2',
        elementId: 'roof',
        label: 'Flat timber roof on stone brackets',
        summary: 'An alternative that uses the sockets without a ridge. (placeholder reference)',
        confidence: 'low',
        selected: false,
        evidenceIds: ['ev1'],
      },
    ],
    comments: [
      {
        id: 'c-seed-1',
        target: 'roof',
        author: 'reviewer',
        body: "The Karla comparison is reasonable, but note Karla's hall is larger — the ridge could be lower.",
        createdAt: '2026-02-04T00:00:00.000Z',
        resolved: true,
        reply: 'Agreed; flagged the height as an assumption.',
      },
    ],
    stories: [
      {
        id: 'story-daily',
        title: 'Daily life at Kanheri',
        category: 'Place',
        summary: 'A short walk through arrival, the hall, food, water, and ritual. Placeholder text only.',
        status: 'published',
        duration: 240,
        steps: [
          {
            id: 'st1',
            title: 'Arrival',
            locationId: 'L1',
            body: 'Visitors approached the cave along the path. This sentence is a placeholder, not a historical claim.',
            audio: '',
            sourceIds: ['ev2'],
          },
          {
            id: 'st2',
            title: 'Cave life',
            locationId: 'L2',
            body: 'The hall could have been covered by a timber roof. The roof form is inferred, not recorded as fact.',
            audio: '',
            elementId: 'roof',
            sourceIds: ['ev1', 'ev3'],
          },
          {
            id: 'st3',
            title: 'Food',
            locationId: 'L3',
            body: 'A carved band may have marked the entrance. Most of the pattern is eroded.',
            audio: '',
            elementId: 'frieze',
            sourceIds: ['ev4'],
          },
          {
            id: 'st4',
            title: 'Water',
            locationId: 'L4',
            body: 'A rock-cut cistern sits near the cave. Whether it was covered is still an open question.',
            audio: '',
            elementId: 'cistern',
            sourceIds: [],
          },
          {
            id: 'st5',
            title: 'Rituals',
            locationId: 'L5',
            body: 'The north wall survives in the rock. Only its upper courses are reconstructed.',
            audio: '',
            elementId: 'northwall',
            sourceIds: ['ev1'],
          },
        ],
      },
    ],
    locations: [
      { id: 'L1', name: 'Entrance (QR)', x: 48, y: 72 },
      { id: 'L2', name: 'Cave 3', x: 46, y: 48, primary: 'roof' },
      { id: 'L3', name: 'Cave 3 interior', x: 58, y: 40, primary: 'frieze' },
      { id: 'L4', name: 'Water cistern', x: 62, y: 78, primary: 'cistern' },
      { id: 'L5', name: 'Viewpoint path', x: 30, y: 36, primary: 'northwall' },
    ],
    periods: [
      { id: 'p1', name: 'Foundation', from: '-100', to: '100' },
      { id: 'p2', name: 'Expansion', from: '100', to: '300' },
      { id: 'p3', name: 'Later phases', from: '300', to: '1000' },
      { id: 'p4', name: 'Today', from: '2000', to: '2026' },
    ],
    events: [
      {
        id: 'e1',
        periodId: 'p1',
        title: 'First caves cut',
        year: 'c. 50 BCE',
        approx: true,
        type: 'construction',
        desc: 'Earliest caves at the site. Placeholder chronology.',
      },
      {
        id: 'e2',
        periodId: 'p2',
        title: 'Great hall (Cave 3) completed',
        year: 'c. 200 CE',
        approx: true,
        type: 'construction',
        desc: 'The reconstruction year used for this visitor experience.',
        elementIds: ['roof', 'entrance'],
      },
      {
        id: 'e3',
        periodId: 'p2',
        title: 'Donative inscriptions',
        year: 'c. 220',
        approx: true,
        type: 'inscription',
        desc: 'Inscriptions noted in the documentation set. Placeholder reference.',
      },
      {
        id: 'e4',
        periodId: 'p3',
        title: 'Later additions',
        year: 'c. 600',
        approx: true,
        type: 'alteration',
        desc: 'Later phases recorded separately from the c. 200 CE reading.',
      },
      {
        id: 'e5',
        periodId: 'p4',
        title: 'Survey and documentation',
        year: 'Today',
        approx: false,
        type: 'survey',
        desc: 'Current recording of what survives.',
      },
    ],
    reviews: [],
    versions: [],
    condition: {
      state: 'fair',
      notes: 'Stone survives. Timber roof, doors, and painted surface do not.',
      surveyedAt: '2026-03-01',
      survival: { northwall: 4, entrance: 5, roof: 0, frieze: 1, cistern: 3 },
    },
    photos: [
      { id: 'ph1', title: 'Entrance elevation', caption: 'Placeholder photograph' },
      { id: 'ph2', title: 'North wall', caption: 'Placeholder photograph' },
      { id: 'ph3', title: 'Beam sockets', caption: 'Placeholder photograph' },
      { id: 'ph4', title: 'Threshold', caption: 'Placeholder photograph' },
      { id: 'ph5', title: 'Cistern rim', caption: 'Placeholder photograph' },
      { id: 'ph6', title: 'Approach path', caption: 'Placeholder photograph' },
    ],
    measurements: [
      { id: 'm1', label: 'North wall length', value: '14.2 m' },
      { id: 'm2', label: 'Entrance height', value: '3.1 m' },
      { id: 'm3', label: 'Roof ridge', value: '— Estimated' },
    ],
  }

  const sig = contentSig(bundle)
  bundle.reviews = [
    {
      id: 'r0',
      status: 'approved',
      submittedBy: 'creator',
      submittedAt: '2026-03-02T00:00:00.000Z',
      decidedBy: 'reviewer',
      decidedAt: '2026-03-04T00:00:00.000Z',
      sig,
      items: [
        ...bundle.elements.filter((element) => element.type !== 'group').map((element) => ({
          target: element.id,
          status: 'approved' as const,
        })),
        { target: 'story-daily', status: 'approved' as const },
      ],
      comments: bundle.comments,
    },
  ]
  const snapshot = snapshotOf(bundle)
  bundle.versions = [
    {
      id: 'v1',
      number: '1.0',
      note: 'First public reconstruction of Cave 3 at c. 200 CE.',
      publishedAt: '2026-03-05T00:00:00.000Z',
      publishedBy: 'admin',
      snapshot,
    },
  ]
  bundle.site.currentVersionId = 'v1'
  return bundle
}

export function blankBundle(input: {
  name: string
  location: string
  type: string
  description: string
  year: string
}): Bundle {
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || `site-${Date.now().toString(36)}`
  const id = `${slug}-${Date.now().toString(36)}`
  return {
    site: {
      id,
      slug: id,
      name: input.name.trim(),
      location: input.location.trim(),
      type: input.type.trim() || 'Heritage site',
      description: input.description.trim(),
      status: 'draft',
      requireReview: true,
      reconstructionYear: input.year.trim() || '—',
      managedBy: 'Placeholder managing authority',
      licence: 'CC BY-NC 4.0',
      settings: settings(),
    },
    elements: [],
    evidence: [],
    links: [],
    questions: [],
    interpretations: [],
    comments: [],
    stories: [],
    locations: [{ id: 'L1', name: 'Entrance (QR)', x: 50, y: 70 }],
    periods: [{ id: 'p-today', name: 'Today', from: '2000', to: '2026' }],
    events: [],
    reviews: [],
    versions: [],
    condition: { state: 'fair', notes: '', surveyedAt: '', survival: {} },
    photos: [],
    measurements: [],
  }
}

export function resetState() {
  const kanheri = createKanheri()
  return {
    bundles: { [kanheri.site.id]: kanheri },
    activeId: kanheri.site.id,
  }
}
