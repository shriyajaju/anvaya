import { ChevronRight, Eye, Plus, Search } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaveElevation } from '../components/CaveElevation'
import { Button, Card, ConfidenceChip, Field, Modal, Notice, SectionLabel, Segmented, StatusChip } from '../components/ui'
import { attention, canPublish, diffSnapshots, linkedEvidence } from '../store/rules'
import { PLACEHOLDER_SITE } from '../store/seed'
import { useAnvaya } from '../store'
import type { Confidence, EvidenceType, Geom } from '../store/types'
import { PreviewPanel, SiteFrame } from './Shell'

const sampleSites = [
  { name: 'Vasai Fort', place: 'Vasai, Maharashtra', status: 'Draft', tone: 'text-text-3' },
  { name: 'Elephanta Caves', place: 'Gharapuri, Maharashtra', status: 'In review', tone: 'text-review' },
  { name: 'Sopara Stupa', place: 'Nalasopara, Maharashtra', status: 'Archived', tone: 'text-text-3' },
]

export function Dashboard() {
  const bundles = useAnvaya((state) => state.bundles)
  const setActive = useAnvaya((state) => state.setActive)
  const session = useAnvaya((state) => state.session)
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const items = Object.values(bundles).flatMap((bundle) =>
    attention(bundle).map((item) => ({ ...item, site: bundle.site.name, id: bundle.site.id })),
  )
  const dot = { low: 'bg-conf-low', medium: 'bg-conf-medium', review: 'bg-review' }
  const primary = Object.values(bundles).find((bundle) => bundle.site.id === 'kanheri') ?? Object.values(bundles)[0]
  return (
    <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,600px)_minmax(320px,1fr)]">
      <div className="grid gap-8">
        <div>
          <h1 className="text-[40px] font-light leading-[48px]">
            {greeting}, {session?.name ?? 'there'}
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-text-2">
            {Object.values(bundles).length} site in progress · {items.length} item{items.length === 1 ? '' : 's'} need{items.length === 1 ? 's' : ''} your attention
          </p>
        </div>
        <section>
          <SectionLabel>Start</SectionLabel>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <button type="button" onClick={() => navigate('/studio/create')} className="relative h-[120px] overflow-hidden rounded-card bg-surface px-5 py-4 text-left shadow-card">
              <span className="absolute -right-2 -top-8 h-24 w-24 rounded-full bg-[#6a45d6] blur-[24px]" />
              <span className="absolute -right-4 top-2 h-16 w-16 rounded-full bg-[#f45fbf] blur-[18px]" />
              <span className="relative grid h-10 w-10 place-items-center rounded-[10px] bg-surface-2"><HomeIcon /></span>
              <span className="relative mt-3 block text-[18px] font-medium leading-[26px]">Create a new site</span>
            </button>
            <button type="button" onClick={() => navigate('/studio/site/evidence')} className="h-[120px] rounded-card bg-surface px-5 py-4 text-left shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-surface-2 text-text-2">↑</span>
              <span className="mt-3 block text-[18px] font-medium leading-[26px]">Upload evidence</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (primary) setActive(primary.site.id)
                navigate('/studio/site/reconstruct')
              }}
              className="h-[120px] rounded-card bg-surface px-5 py-4 text-left shadow-card"
            >
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-surface-2 text-text-2">▣</span>
              <span className="mt-3 block text-[18px] font-medium leading-[26px]">Continue working</span>
            </button>
          </div>
        </section>
        {primary ? (
          <section>
            <SectionLabel>Continue working</SectionLabel>
            <button
              type="button"
              onClick={() => {
                setActive(primary.site.id)
                navigate('/studio/site/reconstruct')
              }}
              className="mt-3 flex w-full items-center gap-3 rounded-card bg-surface px-5 py-4 text-left shadow-card"
            >
              <span className="h-14 w-14 shrink-0 rounded-btn bg-surface-2" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{primary.site.name}</span>
                <span className="block text-[13px] text-text-2">{primary.site.location} · edited 2 h ago</span>
              </span>
              <span className="w-40">
                <span className="inline-flex rounded-full bg-surface-2 px-2.5 py-0.5 text-[13px] text-text-2">Reconstruct</span>
                <span className="mt-1 block text-[13px] text-text-2">67%</span>
                <span className="mt-1 block h-1 w-[120px] rounded-full bg-surface-2"><span className="block h-1 w-[67%] rounded-full bg-primary" /></span>
              </span>
              <ChevronRight size={18} className="text-text-3" />
            </button>
          </section>
        ) : null}
        <section>
          <SectionLabel>Needs your attention</SectionLabel>
          <div className="mt-3 rounded-card bg-surface p-6 shadow-card">
            {items.slice(0, 3).map((item) => (
              <button
                key={`${item.site}-${item.title}-${item.detail}`}
                type="button"
                className="flex w-full gap-3 border-b border-line py-3 text-left last:border-0"
                onClick={() => {
                  setActive(item.id)
                  navigate('/studio/site/reconstruct')
                }}
              >
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${dot[item.level]}`} />
                <span>
                  <span className="block text-[15px]">{item.title}</span>
                  <span className="block text-[13px] text-text-2">{item.site} · {item.detail}</span>
                </span>
              </button>
            ))}
            <button type="button" className="mt-3 text-[13px] text-accent" onClick={() => navigate('/studio/review-queue')}>
              View review queue
            </button>
          </div>
        </section>
      </div>
      <PreviewPanel caption="Version 1.0 · preview" />
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 9.5 10 3l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.5Z" fill="none" stroke="#778188" strokeWidth="1.5" />
    </svg>
  )
}

export function Sites() {
  const bundles = useAnvaya((state) => state.bundles)
  const setActive = useAnvaya((state) => state.setActive)
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const filters = ['All', 'Draft', 'In review', 'Published', 'Archived']
  const live = Object.values(bundles).filter((bundle) => bundle.site.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[40px] font-light leading-[48px]">My sites</h1>
        <div className="flex items-center gap-3">
          <label className="flex h-10 items-center gap-2 rounded-btn border border-line bg-surface px-3 text-[14px] text-text-3">
            <Search size={16} />
            <input className="w-36 bg-transparent text-text-1 outline-none" placeholder="Search sites" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button type="button" onClick={() => navigate('/studio/create')} className="flex h-10 items-center gap-2 rounded-btn bg-primary px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-on-primary">
            <Plus size={14} /> New site
          </button>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        {filters.map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-3 py-1.5 text-[13px] ${filter === item ? 'bg-primary text-on-primary' : 'bg-surface-2 text-text-2'}`}>
            {item} {item === 'All' ? live.length + sampleSites.length : 1}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <button type="button" onClick={() => navigate('/studio/create')} className="flex min-h-[240px] flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface text-text-2">
          <Plus size={18} />
          <span className="mt-2 text-[14px]">Create a new site</span>
        </button>
        {sampleSites.map((site) => (
          <article key={site.name} className="overflow-hidden rounded-card bg-surface shadow-card">
            <div className="relative h-28 bg-[#e7ebef]">
              <span className={`absolute left-4 top-4 text-[11px] font-medium uppercase tracking-[0.08em] ${site.tone}`}>• {site.status}</span>
            </div>
            <div className="p-4">
              <p className="text-[18px] font-medium">{site.name}</p>
              <p className="text-[13px] text-text-2">{site.place}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[10px] text-text-2">AI</span>
                <span className="h-1.5 w-24 rounded-full bg-gradient-to-r from-conf-high via-conf-medium to-conf-low" />
              </div>
            </div>
          </article>
        ))}
        {live.map((bundle) => (
          <button
            key={bundle.site.id}
            type="button"
            className="overflow-hidden rounded-card bg-surface text-left shadow-card"
            onClick={() => {
              setActive(bundle.site.id)
              navigate('/studio/site/overview')
            }}
          >
            <div className="relative h-28 bg-[#e7ebef]">
              <span className="absolute left-4 top-4 text-[11px] font-medium uppercase tracking-[0.08em] text-conf-high">• {bundle.site.status.replace('_', ' ')}</span>
              {bundle.versions[0] ? <span className="absolute right-4 top-4 text-[13px] text-text-2">{bundle.versions[0].number}</span> : null}
            </div>
            <div className="p-4">
              <p className="text-[18px] font-medium">{bundle.site.name}</p>
              <p className="text-[13px] text-text-2">{bundle.site.location}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[10px] text-text-2">AI</span>
                <span className="h-1.5 w-24 rounded-full bg-gradient-to-r from-conf-high via-conf-medium to-conf-low" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function CreateSite() {
  const createSite = useAnvaya((state) => state.createSite)
  const navigate = useNavigate()
  const [form, setForm] = useState(PLACEHOLDER_SITE)
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  return (
    <div className="mx-auto max-w-[720px]">
      <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">New site · 1 of 1</p>
      <h1 className="mt-3 text-[32px] font-normal leading-10">Start from the approved placeholder</h1>
      <p className="mt-2 text-[15px] text-text-2">
        These fields are filled with demo copy. They are not a historical record.
      </p>
      <div className="mt-8 grid gap-3">
        <Field label="Name" value={form.name} onChange={(value) => set('name', value)} />
        <Field label="Location" value={form.location} onChange={(value) => set('location', value)} />
        <Field label="Type" value={form.type} onChange={(value) => set('type', value)} />
        <Field label="Reconstruction year" value={form.year} onChange={(value) => set('year', value)} />
        <Field label="Description" textarea value={form.description} onChange={(value) => set('description', value)} />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate('/studio/sites')}>
          Back
        </Button>
        <Button
          onClick={() => {
            createSite(form)
            navigate('/studio/site/overview')
          }}
        >
          Create draft
        </Button>
      </div>
    </div>
  )
}

export function Overview() {
  const bundle = useAnvaya((state) => state.bundle())
  const navigate = useNavigate()
  const openQuestions = bundle.questions.filter((item) => item.status === 'open').length
  const missing = bundle.elements.filter((element) => element.type !== 'group' && !bundle.links.some((link) => link.elementId === element.id)).length
  const steps = [
    ['overview', 'Overview', 'Complete'],
    ['document', 'Document', `${bundle.photos.length} photos · condition recorded`],
    ['evidence', 'Evidence', openQuestions ? `${openQuestions} open questions` : `${bundle.evidence.length} sources`],
    ['timeline', 'Timeline', `${bundle.events.length} events`],
    ['reconstruct', 'Reconstruct', missing ? `${missing} element without evidence` : 'Evidence linked'],
    ['stories', 'Stories', `${bundle.stories.length} story`],
    ['review', 'Review', bundle.reviews.some((review) => review.status === 'approved') ? 'Approved' : bundle.site.status],
    ['publish', 'Publish', bundle.versions[0] ? `Version ${bundle.versions[0].number} live` : 'Not published'],
    ['archive', 'Archive', `${bundle.versions.length} version`],
  ]
  const high = bundle.elements.filter((element) => element.confidence === 'high').length
  const medium = bundle.elements.filter((element) => element.confidence === 'medium').length
  const low = bundle.elements.filter((element) => element.confidence === 'low').length
  return (
    <SiteFrame>
      <div className="flex items-center gap-3">
        <h1 className="text-[40px] font-light leading-[48px]">{bundle.site.name}</h1>
        <StatusChip status={bundle.site.status} />
      </div>
      <p className="mt-2 text-[15px] text-text-2">
        {bundle.site.type}, {bundle.site.location} · Version {bundle.versions.at(-1)?.number ?? 'draft'}
      </p>
      <div className="mt-6 grid grid-cols-4 gap-3">
        {[
          ['Elements', bundle.elements.filter((element) => element.type !== 'group').length, 'text-text-1'],
          ['Sources', bundle.evidence.length, 'text-text-1'],
          ['Stories', bundle.stories.length, 'text-text-1'],
          ['Open questions', openQuestions, 'text-conf-medium'],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-card bg-surface p-4 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">{label}</p>
            <p className={`mt-2 text-[32px] font-light ${tone}`}>{value}</p>
          </div>
        ))}
      </div>
      <SectionLabel>Workflow</SectionLabel>
      <div className="mt-3 rounded-card bg-surface px-2 shadow-card">
        {steps.map(([id, label, meta]) => (
          <button key={id} type="button" onClick={() => navigate(`/studio/site/${id}`)} className="flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left last:border-0">
            <span className="text-text-3">○</span>
            <span className="flex-1 text-[15px]">{label}</span>
            <span className={`text-[13px] ${String(meta).includes('without') || String(meta).includes('open') ? 'text-conf-medium' : 'text-text-2'}`}>{meta}</span>
            <ChevronRight size={16} className="text-text-3" />
          </button>
        ))}
      </div>
      <div className="mt-6">
        <SectionLabel>Confidence across the site</SectionLabel>
        <div className="mt-3 rounded-card bg-surface p-4 shadow-card">
          <div className="flex h-2 overflow-hidden rounded-full">
            <span className="bg-conf-high" style={{ width: `${(high / Math.max(high + medium + low, 1)) * 100}%` }} />
            <span className="bg-conf-medium" style={{ width: `${(medium / Math.max(high + medium + low, 1)) * 100}%` }} />
            <span className="bg-conf-low" style={{ width: `${(low / Math.max(high + medium + low, 1)) * 100}%` }} />
          </div>
          <p className="mt-3 text-[13px] text-text-2">{high} High · {medium} Medium · {low} Low</p>
          <p className="text-[13px] text-text-3">Uncertainty is highest where a source is still missing.</p>
        </div>
      </div>
    </SiteFrame>
  )
}

export function DocumentPage() {
  const bundle = useAnvaya((state) => state.bundle())
  const updateCondition = useAnvaya((state) => state.updateCondition)
  return (
    <SiteFrame>
      <SectionLabel>Document</SectionLabel>
      <h1 className="mt-2 text-[32px] font-normal">Condition</h1>
      <div className="mt-6 grid gap-3">
        <Field label="Survey notes" textarea value={bundle.condition.notes} onChange={(notes) => updateCondition({ notes })} />
        <Field
          label="Surveyed"
          value={bundle.condition.surveyedAt}
          onChange={(surveyedAt) => updateCondition({ surveyedAt })}
        />
      </div>
      <Card label="Photographs">
        {bundle.photos.length === 0 ? (
          <p className="text-text-2">No photographs yet. Uploads stay as placeholders in this demo.</p>
        ) : (
          bundle.photos.map((photo) => (
            <p key={photo.id} className="py-2">
              {photo.title}
              <span className="block text-[13px] text-text-2">{photo.caption}</span>
            </p>
          ))
        )}
      </Card>
    </SiteFrame>
  )
}

export function TimelinePage() {
  const bundle = useAnvaya((state) => state.bundle())
  return (
    <SiteFrame>
      <SectionLabel>Timeline</SectionLabel>
      <h1 className="mt-2 text-[32px] font-normal">Periods</h1>
      <div className="mt-6 grid gap-3">
        {bundle.periods.map((period) => (
          <Card key={period.id}>
            <p className="font-medium">{period.name}</p>
            <p className="text-[13px] text-text-2">
              {period.from} – {period.to}
            </p>
            <div className="mt-3 grid gap-2">
              {bundle.events
                .filter((event) => event.periodId === period.id)
                .map((event) => (
                  <p key={event.id} className="text-[15px]">
                    {event.year} · {event.title}
                  </p>
                ))}
            </div>
          </Card>
        ))}
        {bundle.events.length === 0 ? <p className="text-text-2">No events yet.</p> : null}
      </div>
    </SiteFrame>
  )
}

export function EvidencePage() {
  const bundle = useAnvaya((state) => state.bundle())
  const addEvidence = useAnvaya((state) => state.addEvidence)
  const [tab, setTab] = useState<'sources' | 'questions' | 'readings' | 'confidence'>('sources')
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({
    type: 'physical' as EvidenceType,
    title: '',
    citation: '',
    date: '2026',
    strength: 'medium' as Confidence,
    note: 'Placeholder reference.',
    elementIds: [] as string[],
  })
  return (
    <SiteFrame>
      <div className="flex items-center justify-between">
        <div>
          <SectionLabel>Evidence</SectionLabel>
          <h1 className="mt-2 text-[32px] font-normal">Sources</h1>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setStep(0)
            setOpen(true)
          }}
        >
          Add evidence
        </Button>
      </div>
      <div className="mt-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: 'sources', label: 'Sources' },
            { id: 'questions', label: 'Questions' },
            { id: 'readings', label: 'Readings' },
            { id: 'confidence', label: 'Confidence' },
          ]}
        />
      </div>
      <div className="mt-4 grid gap-3">
        {tab === 'sources'
          ? bundle.evidence.map((item) => (
              <Card key={item.id}>
                <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">{item.type}</p>
                <p className="mt-1">{item.title}</p>
                <p className="text-[13px] text-text-2">{item.citation}</p>
              </Card>
            ))
          : null}
        {tab === 'questions'
          ? bundle.questions.map((item) => (
              <Card key={item.id}>
                <p>{item.question}</p>
                <p className="text-[13px] text-text-2">{item.status}</p>
              </Card>
            ))
          : null}
        {tab === 'readings'
          ? bundle.interpretations.map((item) => (
              <Card key={item.id}>
                <p>{item.label}</p>
                <p className="text-[13px] text-text-2">{item.summary}</p>
              </Card>
            ))
          : null}
        {tab === 'confidence'
          ? bundle.elements
              .filter((element) => element.type !== 'group')
              .map((element) => (
                <div key={element.id} className="flex items-center justify-between rounded-card bg-surface px-4 py-3 shadow-card">
                  <span>{element.name}</span>
                  <ConfidenceChip level={element.confidence} />
                </div>
              ))
          : null}
        {tab === 'sources' && bundle.evidence.length === 0 ? <p className="text-text-2">No sources yet.</p> : null}
      </div>
      <Modal
        open={open}
        title="Add evidence"
        step={`Step ${step + 1} of 3`}
        progress={((step + 1) / 3) * 100}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => (step === 0 ? setOpen(false) : setStep((value) => value - 1))}>
              Back
            </Button>
            <Button
              disabled={step === 1 && draft.title.trim().length === 0}
              onClick={() => {
                if (step < 2) {
                  setStep((value) => value + 1)
                  return
                }
                addEvidence(draft)
                setOpen(false)
                setDraft((current) => ({ ...current, title: '', elementIds: [] }))
              }}
            >
              {step === 2 ? 'Save' : 'Continue'}
            </Button>
          </>
        }
      >
        {step === 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {(['physical', 'archaeological', 'historical', 'comparative', 'visual', 'scholarly'] as EvidenceType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, type }))}
                  className={`rounded-card border px-3 py-4 text-left capitalize ${draft.type === type ? 'border-primary' : 'border-line'}`}
                >
                  {type}
                </button>
              ),
            )}
          </div>
        ) : null}
        {step === 1 ? (
          <div className="grid gap-3">
            <Field label="Title" value={draft.title} onChange={(title) => setDraft((current) => ({ ...current, title }))} />
            <Field
              label="Citation"
              value={draft.citation}
              onChange={(citation) => setDraft((current) => ({ ...current, citation }))}
              helper="Mark unpublished notes as a placeholder reference."
            />
            <Field label="Date" value={draft.date} onChange={(date) => setDraft((current) => ({ ...current, date }))} />
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid gap-2">
            {bundle.elements
              .filter((element) => element.type !== 'group')
              .map((element) => {
                const on = draft.elementIds.includes(element.id)
                return (
                  <button
                    key={element.id}
                    type="button"
                    className={`rounded-card border px-3 py-3 text-left ${on ? 'border-primary' : 'border-line'}`}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        elementIds: on
                          ? current.elementIds.filter((id) => id !== element.id)
                          : [...current.elementIds, element.id],
                      }))
                    }
                  >
                    {element.name}
                  </button>
                )
              })}
          </div>
        ) : null}
      </Modal>
    </SiteFrame>
  )
}

export function ReconstructPage() {
  const bundle = useAnvaya((state) => state.bundle())
  const ui = useAnvaya((state) => state.ui)
  const selectElement = useAnvaya((state) => state.selectElement)
  const setConfidenceLevel = useAnvaya((state) => state.setConfidenceLevel)
  const setThenNow = useAnvaya((state) => state.setThenNow)
  const setShowColours = useAnvaya((state) => state.setShowColours)
  const addElement = useAnvaya((state) => state.addElement)
  const updateElement = useAnvaya((state) => state.updateElement)
  const linkEvidence = useAnvaya((state) => state.linkEvidence)
  const [playId, setPlayId] = useState(0)
  const [pulse, setPulse] = useState(0)
  const [adding, setAdding] = useState(false)
  const [mode, setMode] = useState<'then' | 'now' | 'compare'>('then')
  const [name, setName] = useState('North wall')
  const [geom, setGeom] = useState<Geom>('northwall')
  const selected = bundle.elements.find((element) => element.id === ui.selectedElementId) ?? null
  const sources = selected ? linkedEvidence(bundle, selected.id) : []
  const shown = mode === 'now' ? 0.15 : ui.thenNow
  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      <section className="rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-medium">Elements</h2>
          <button type="button" onClick={() => setAdding(true)} className="rounded-full bg-surface-2 px-3 py-1 text-[12px] text-text-2">+ Add</button>
        </div>
        <p className="mt-3 rounded-full bg-surface-2 px-3 py-2 text-[13px] text-text-2">{bundle.site.reconstructionYear} CE</p>
        <div className="mt-3">
          {bundle.elements.map((element) => (
            <button
              key={element.id}
              type="button"
              onClick={() => selectElement(element.id)}
              className={`flex w-full items-center gap-2 border-l-2 py-2 pl-3 text-left ${element.id === selected?.id ? 'border-conf-high bg-surface-2/60' : 'border-transparent'}`}
            >
              <span className="min-w-0 flex-1 truncate text-[14px]" style={{ paddingLeft: element.parentId ? 12 : 0 }}>{element.name}</span>
              {element.type !== 'group' ? <ConfidenceChip level={element.confidence} pulse={element.id === selected?.id ? pulse : 0} /> : null}
              {element.type !== 'group' ? <Eye size={14} className="text-text-3" /> : null}
            </button>
          ))}
        </div>
        <p className="mt-6 text-[12px] text-text-3">{bundle.elements.length} elements · {bundle.elements.filter((element) => element.type !== 'group' && !bundle.links.some((link) => link.elementId === element.id)).length} without evidence</p>
      </section>
      <section className="relative min-h-[640px] overflow-hidden rounded-[20px] bg-[#e7edf0]">
        <div className="absolute left-4 top-4 z-10 flex rounded-full bg-white p-1 shadow-card">
          {(['then', 'now', 'compare'] as const).map((item) => (
            <button key={item} type="button" onClick={() => { setMode(item); setThenNow(item === 'now' ? 0.15 : 1); setPlayId((value) => value + 1) }} className={`rounded-full px-4 py-1.5 text-[13px] capitalize ${mode === item ? 'bg-primary text-on-primary' : 'text-text-2'}`}>{item}</button>
          ))}
        </div>
        <button type="button" onClick={() => setShowColours(!ui.showColours)} className="absolute right-36 top-4 z-10 text-[13px] text-text-2">Confidence colours</button>
        <a href={`#/v/${bundle.site.slug}/ar/roof?preview=1`} className="absolute right-4 top-4 z-10 rounded-full bg-white px-3 py-1.5 text-[12px] shadow-card">AR preview</a>
        <CaveElevation elements={bundle.elements} selectedId={selected?.id} thenNow={shown} showColours={ui.showColours} playId={playId} onSelect={selectElement} />
        <p className="absolute bottom-4 left-0 right-0 text-center text-[12px] text-text-3">Wireframe first, then the inferred colour · placeholder geometry</p>
      </section>
      <aside className="grid content-start gap-3">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">Element</p>
        {selected ? (
          <>
            <div className="rounded-card bg-surface-2 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">Name</p>
              <p className="text-[18px]">{selected.name}</p>
            </div>
            <div className="rounded-card bg-surface-2 px-4 py-3 text-[13px] text-text-2">
              <p className="text-[11px] uppercase tracking-[0.08em]">Type · period · parent</p>
              <p className="mt-1 capitalize">{selected.type} · {bundle.site.reconstructionYear} CE · Cave 3</p>
            </div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">Confidence</p>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as Confidence[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    const ok = setConfidenceLevel(selected.id, level)
                    if (ok) setPulse((value) => value + 1)
                  }}
                  className={`rounded-full px-3 py-1 text-[13px] capitalize ${selected.confidence === level ? 'bg-conf-medium-bg text-conf-medium' : 'bg-surface text-text-2'}`}
                >
                  {level}
                </button>
              ))}
            </div>
            {ui.confidenceError ? <Notice>{ui.confidenceError}</Notice> : null}
            <div className="rounded-card bg-surface p-4 shadow-card">
              <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">Why this rating?</p>
              <textarea className="mt-2 w-full resize-none bg-transparent text-[14px] leading-6 outline-none" rows={4} value={selected.rationale} onChange={(event) => updateElement(selected.id, { rationale: event.target.value })} />
              <p className="text-[12px] text-text-3">Shown to visitors as a confidence label, not as fact.</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">Evidence</p>
              <span className="text-[13px] text-text-2">{sources.length} sources linked</span>
            </div>
            {sources.map((source) => (
              <div key={source.id} className="rounded-card bg-surface px-3 py-3 shadow-card">
                <p className="text-[14px]">{source.title}</p>
                <p className="text-[12px] capitalize text-text-3">{source.type} · {source.date}</p>
              </div>
            ))}
            {bundle.evidence.filter((item) => !sources.some((source) => source.id === item.id)).slice(0, 3).map((item) => (
              <button key={item.id} type="button" className="text-left text-[13px] text-accent" onClick={() => linkEvidence(selected.id, item.id)}>
                Link {item.title}
              </button>
            ))}
          </>
        ) : (
          <p className="text-text-2">Select an element.</p>
        )}
      </aside>
      <Modal
        open={adding}
        title="Add an element"
        onClose={() => setAdding(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                addElement({ name, geom })
                setAdding(false)
              }}
            >
              Add
            </Button>
          </>
        }
      >
        <Field label="Name" value={name} onChange={setName} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['northwall', 'entrance', 'roof', 'frieze', 'cistern', 'block'] as Geom[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGeom(item)}
              className={`rounded-card border px-3 py-3 text-left capitalize ${geom === item ? 'border-primary' : 'border-line'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export function StoriesPage() {
  const bundle = useAnvaya((state) => state.bundle())
  const addStory = useAnvaya((state) => state.addStory)
  const [title, setTitle] = useState('A walk through the hall')
  return (
    <SiteFrame>
      <SectionLabel>Stories</SectionLabel>
      <h1 className="mt-2 text-[32px] font-normal">Visitor stories</h1>
      <div className="mt-6 grid gap-3">
        {bundle.stories.map((story) => (
          <Card key={story.id}>
            <div className="flex items-center justify-between">
              <p>{story.title}</p>
              <StatusChip status={story.status} />
            </div>
            <p className="mt-2 text-[13px] text-text-2">{story.summary}</p>
          </Card>
        ))}
        <Field label="New story title" value={title} onChange={setTitle} />
        <Button onClick={() => addStory(title)}>Add story draft</Button>
      </div>
    </SiteFrame>
  )
}

export function ReviewPage() {
  const bundle = useAnvaya((state) => state.bundle())
  const role = useAnvaya((state) => state.ui.role)
  const submitForReview = useAnvaya((state) => state.submitForReview)
  const reply = useAnvaya((state) => state.reply)
  const resolve = useAnvaya((state) => state.resolve)
  const resubmitReview = useAnvaya((state) => state.resubmitReview)
  const review = [...bundle.reviews].reverse().find((item) => item.status !== 'withdrawn')
  const [body, setBody] = useState('Updated the assumption and kept the confidence visible.')
  return (
    <SiteFrame>
      <SectionLabel>Review</SectionLabel>
      <h1 className="mt-2 text-[32px] font-normal">Submission</h1>
      <p className="mt-2 text-[15px] text-text-2">You are acting as {role}. A creator cannot approve their own review.</p>
      <div className="mt-4">
        <StatusChip status={bundle.site.status} />
      </div>
      {review ? (
        <Card label={review.status.replace('_', ' ')}>
          {review.comments.length === 0 ? <p className="text-text-2">No comments on this round.</p> : null}
          {review.comments.map((comment) => (
            <div key={comment.id} className="border-b border-line py-3">
              <p className="text-[13px] uppercase tracking-[0.08em] text-text-3">{comment.author}</p>
              <p className="mt-1">{comment.body}</p>
              {comment.reply ? <p className="mt-2 text-[13px] text-text-2">Reply · {comment.reply}</p> : null}
              {role === 'creator' && !comment.resolved ? (
                <div className="mt-3 grid gap-2">
                  <Field label="Reply" value={body} onChange={setBody} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => reply(comment.id, body)}>
                      Reply
                    </Button>
                    <Button size="sm" onClick={() => resolve(comment.id)}>
                      Resolve
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </Card>
      ) : (
        <p className="mt-6 text-text-2">This working copy has not been submitted.</p>
      )}
      <div className="mt-4 flex gap-2">
        {role === 'creator' && bundle.site.status !== 'in_review' ? (
          <Button onClick={submitForReview}>Submit for review</Button>
        ) : null}
        {review?.status === 'changes_requested' && role === 'creator' ? (
          <Button onClick={resubmitReview}>Resubmit</Button>
        ) : null}
      </div>
    </SiteFrame>
  )
}

export function ReviewQueue() {
  const bundles = useAnvaya((state) => state.bundles)
  const role = useAnvaya((state) => state.ui.role)
  const setActive = useAnvaya((state) => state.setActive)
  const approveReview = useAnvaya((state) => state.approveReview)
  const requestReviewChanges = useAnvaya((state) => state.requestReviewChanges)
  const [comment, setComment] = useState('Please keep this assumption visible to visitors.')
  const queue = Object.values(bundles).filter((bundle) =>
    bundle.reviews.some((review) => review.status === 'open' || review.status === 'changes_requested'),
  )
  return (
    <div className="mx-auto max-w-3xl">
      <SectionLabel>Review queue</SectionLabel>
      <h1 className="mt-2 text-[32px] font-normal">Waiting on a reviewer</h1>
      {role === 'creator' ? (
        <div className="mt-4">
          <Notice>Switch to R. Mehta or S. Rao from the account menu. A creator cannot approve.</Notice>
        </div>
      ) : null}
      <div className="mt-6 grid gap-4">
        {queue.length === 0 ? <p className="text-text-2">The queue is empty.</p> : null}
        {queue.map((bundle) => (
          <Card key={bundle.site.id}>
            <p className="text-lg">{bundle.site.name}</p>
            <p className="text-[13px] text-text-2">{bundle.site.status.replace('_', ' ')}</p>
            <div className="mt-3">
              <Field label="Comment" value={comment} onChange={setComment} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={role === 'creator'}
                onClick={() => {
                  setActive(bundle.site.id)
                  const leaf = bundle.elements.find((element) => element.type !== 'group')
                  requestReviewChanges(leaf?.id || bundle.site.id, comment)
                }}
              >
                Request changes
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={role === 'creator'}
                onClick={() => {
                  setActive(bundle.site.id)
                  approveReview()
                }}
              >
                Approve
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PublishPage() {
  const bundle = useAnvaya((state) => state.bundle())
  const role = useAnvaya((state) => state.ui.role)
  const flash = useAnvaya((state) => state.ui.publishedFlash)
  const publishVersion = useAnvaya((state) => state.publishVersion)
  const clearPublishedFlash = useAnvaya((state) => state.clearPublishedFlash)
  const gate = canPublish(bundle, role)
  const next = bundle.versions.length ? '1.1' : '1.0'
  const [note, setNote] = useState('Published reconstruction. Not a statement of fact.')
  const url = `${window.location.origin}${window.location.pathname}#/v/${bundle.site.slug}`
  if (flash) {
    return (
      <SiteFrame>
        <div className="relative overflow-hidden rounded-card p-8 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4B2FA6] to-[#3D62F5]" />
          <div className="relative">
            <SectionLabel>Published</SectionLabel>
            <h1 className="mt-2 font-display text-4xl font-light">Version is live</h1>
            <p className="mt-2 text-white/80">Scan to open the visitor reconstruction.</p>
            <div className="mt-6 inline-block rounded-card bg-white p-4">
              <QRCodeSVG value={url} size={180} />
            </div>
            <p className="mt-4 text-[13px]">{url}</p>
            <div className="mt-4">
              <Button variant="secondary" onClick={clearPublishedFlash}>
                Back to checks
              </Button>
            </div>
          </div>
        </div>
      </SiteFrame>
    )
  }
  return (
    <SiteFrame>
      <SectionLabel>Publish</SectionLabel>
      <h1 className="mt-2 text-[32px] font-normal">Freeze a snapshot</h1>
      <p className="mt-2 text-[15px] text-text-2">Visitors read the snapshot, not this working copy.</p>
      <Card label="Hard checks">
        {gate.hard.length === 0 ? <p>Ready for an admin to publish.</p> : gate.hard.map((item) => <p key={item}>{item}</p>)}
      </Card>
      {gate.soft.map((item) => (
        <Notice key={item}>{item}</Notice>
      ))}
      <Field label="Version note" textarea value={note} onChange={setNote} />
      <div className="mt-4">
        <Button disabled={!gate.ok} onClick={() => publishVersion(next, note)}>
          Publish {next}
        </Button>
      </div>
    </SiteFrame>
  )
}

export function ArchivePage() {
  const bundle = useAnvaya((state) => state.bundle())
  const ui = useAnvaya((state) => state.ui)
  const [left, setLeft] = useState(bundle.versions[0]?.id ?? '')
  const [right, setRight] = useState(bundle.versions.at(-1)?.id ?? '')
  const before = bundle.versions.find((version) => version.id === left)
  const after = bundle.versions.find((version) => version.id === right)
  const diff = useMemo(
    () => (before && after ? diffSnapshots(before.snapshot, after.snapshot) : []),
    [before, after],
  )
  return (
    <div>
      <SectionLabel>Archive</SectionLabel>
      <h1 className="mt-2 text-[32px] font-normal">{bundle.site.name}</h1>
      <div className="mt-4 flex gap-3">
        {[left, right].map((value, index) => (
          <select
            key={index}
            className="rounded-full bg-surface px-4 py-2 shadow-card"
            value={value}
            onChange={(event) => (index === 0 ? setLeft(event.target.value) : setRight(event.target.value))}
          >
            {bundle.versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.number}
              </option>
            ))}
          </select>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[before, after].map((version) => (
          <div key={version?.id ?? 'empty'} className="min-h-[280px] overflow-hidden rounded-card bg-[#241f1b]">
            {version ? (
              <CaveElevation
                elements={version.snapshot.elements}
                thenNow={ui.thenNow}
                showColours={ui.showColours}
                playId={0}
              />
            ) : (
              <p className="p-6 text-white/70">Publish a version to compare.</p>
            )}
          </div>
        ))}
      </div>
      <Card label="Difference">
        {diff.length === 0 ? <p className="text-text-2">No difference between these snapshots.</p> : null}
        {diff.map((item) => (
          <p key={`${item.kind}-${item.detail}`} className="py-1">
            {item.label} · {item.detail}
          </p>
        ))}
      </Card>
    </div>
  )
}

export function ArchiveIndex() {
  const bundles = useAnvaya((state) => state.bundles)
  const setActive = useAnvaya((state) => state.setActive)
  const navigate = useNavigate()
  return (
    <div>
      <h1 className="text-[32px] font-normal">Archive</h1>
      <div className="mt-6 grid gap-3">
        {Object.values(bundles).map((bundle) => (
          <button
            key={bundle.site.id}
            type="button"
            className="rounded-card bg-surface p-4 text-left shadow-card"
            onClick={() => {
              setActive(bundle.site.id)
              navigate('/studio/site/archive')
            }}
          >
            {bundle.site.name}
            <span className="block text-[13px] text-text-2">{bundle.versions.length} published versions</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const analytics = useAnvaya((state) => state.analytics)
  const feedback = useAnvaya((state) => state.feedback)
  const counts = analytics.reduce<Record<string, number>>((map, event) => {
    map[event.type] = (map[event.type] ?? 0) + 1
    return map
  }, {})
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[32px] font-normal">Analytics</h1>
      <p className="mt-2 text-text-2">Counts come only from visits recorded in this browser.</p>
      <div className="mt-6 grid gap-3">
        {Object.keys(counts).length === 0 ? <p>No visitor events yet.</p> : null}
        {Object.entries(counts).map(([type, count]) => (
          <Card key={type}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">{type}</p>
            <p className="text-3xl font-light">{count}</p>
          </Card>
        ))}
        <Card label="Feedback">
          {feedback.length === 0 ? <p className="text-text-2">None yet.</p> : null}
          {feedback.map((item) => (
            <p key={item.id} className="py-2">
              {item.comment || 'No comment'} · trust {item.trust ?? '—'}
            </p>
          ))}
        </Card>
      </div>
    </div>
  )
}

export function AssetsPage() {
  const bundles = useAnvaya((state) => state.bundles)
  const photos = Object.values(bundles).flatMap((bundle) =>
    bundle.photos.map((photo) => ({ ...photo, site: bundle.site.name })),
  )
  return (
    <div>
      <h1 className="text-[32px] font-normal">Assets</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {photos.length === 0 ? <p className="text-text-2">No placeholder photographs on the active drafts.</p> : null}
        {photos.map((photo) => (
          <Card key={photo.id}>
            <p>{photo.title}</p>
            <p className="text-[13px] text-text-2">
              {photo.site} · {photo.caption}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const theme = useAnvaya((state) => state.ui.theme)
  const setTheme = useAnvaya((state) => state.setTheme)
  const bundle = useAnvaya((state) => state.bundle())
  const updateSettings = useAnvaya((state) => state.updateSettings)
  const resetDemo = useAnvaya((state) => state.resetDemo)
  const signOut = useAnvaya((state) => state.signOut)
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[32px] font-normal">Settings</h1>
      <div className="mt-6">
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
            { id: 'system', label: 'System' },
          ]}
        />
      </div>
      <Card label="Publishing rules">
        <label className="flex items-center justify-between py-2">
          High confidence needs a source
          <input
            type="checkbox"
            checked={bundle.site.settings.requireSourceForHigh}
            onChange={(event) => updateSettings({ requireSourceForHigh: event.target.checked })}
          />
        </label>
      </Card>
      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${bundle.site.slug}.json`
            link.click()
            URL.revokeObjectURL(url)
          }}
        >
          Export JSON
        </Button>
        <Button variant="ghost" onClick={resetDemo}>
          Reset demo
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            signOut()
            navigate('/signin')
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  )
}
