import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaveElevation } from '../components/CaveElevation'
import { Button, Card, ConfidenceChip, Field, Modal, Notice, SectionLabel, Segmented, StatusChip } from '../components/ui'
import { attention, canPublish, diffSnapshots, linkedEvidence } from '../store/rules'
import { PLACEHOLDER_SITE } from '../store/seed'
import { useAnvaya } from '../store'
import type { Confidence, EvidenceType, Geom } from '../store/types'
import { SiteFrame } from './Shell'

const samples = ['Coastal fort (sample)', 'Stepwell (sample)', 'Temple tank (sample)']

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
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">Studio</p>
        <h1 className="mt-2 text-[40px] font-light leading-[48px]">
          {greeting}, {session?.name ?? 'there'}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-text-2">
          Kanheri Caves is already published. Start a placeholder hall when you want to author a site from scratch.
        </p>
        <div className="mt-8 grid gap-3">
          {items.length === 0 ? (
            <Card>
              <p className="text-[15px]">Nothing needs attention.</p>
            </Card>
          ) : (
            items.slice(0, 6).map((item) => (
              <button
                key={`${item.site}-${item.title}-${item.detail}`}
                type="button"
                className="rounded-card bg-surface p-4 text-left shadow-card"
                onClick={() => {
                  setActive(item.id)
                  navigate('/studio/site/reconstruct')
                }}
              >
                <SectionLabel>{item.site}</SectionLabel>
                <p className="mt-2 text-[15px]">{item.title}</p>
                <p className="text-[13px] text-text-2">{item.detail}</p>
              </button>
            ))
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/studio/create')}
        className="relative min-h-64 overflow-hidden rounded-card p-6 text-left text-white shadow-card"
      >
        <span className="absolute inset-0 bg-gradient-to-br from-[#4B2FA6] via-[#1A3FE0] to-[#F45FBF]" />
        <span className="relative block text-[11px] uppercase tracking-[0.08em]">Create</span>
        <span className="relative mt-4 block text-3xl font-light">Start a placeholder site</span>
      </button>
    </div>
  )
}

export function Sites() {
  const bundles = useAnvaya((state) => state.bundles)
  const setActive = useAnvaya((state) => state.setActive)
  const navigate = useNavigate()
  return (
    <div>
      <h1 className="text-[32px] font-normal">My sites</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.values(bundles).map((bundle) => (
          <button
            key={bundle.site.id}
            type="button"
            className="rounded-card bg-surface p-5 text-left shadow-card"
            onClick={() => {
              setActive(bundle.site.id)
              navigate('/studio/site/overview')
            }}
          >
            <StatusChip status={bundle.site.status} />
            <p className="mt-4 text-xl">{bundle.site.name}</p>
            <p className="mt-1 text-[13px] text-text-2">{bundle.site.location}</p>
          </button>
        ))}
        {samples.map((name) => (
          <div key={name} className="rounded-card border border-dashed border-line p-5 text-text-3">
            <p className="text-[11px] uppercase tracking-[0.08em]">Not editable</p>
            <p className="mt-4 text-xl text-text-2">{name}</p>
          </div>
        ))}
        <button
          type="button"
          onClick={() => navigate('/studio/create')}
          className="rounded-card bg-primary p-5 text-left text-on-primary"
        >
          <p className="text-[11px] uppercase tracking-[0.08em]">New</p>
          <p className="mt-4 text-xl">Create from the placeholder</p>
        </button>
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
  return (
    <SiteFrame>
      <SectionLabel>Overview</SectionLabel>
      <h1 className="mt-2 text-[32px] font-normal">{bundle.site.name}</h1>
      <p className="mt-2 text-[15px] leading-6 text-text-2">{bundle.site.description}</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Elements', bundle.elements.length],
          ['Sources', bundle.evidence.length],
          ['Versions', bundle.versions.length],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">{label}</p>
            <p className="mt-2 text-3xl font-light">{value}</p>
          </Card>
        ))}
      </div>
      <Card label="Record">
        <p>Location · {bundle.site.location}</p>
        <p className="mt-1">Year · c. {bundle.site.reconstructionYear}</p>
        <p className="mt-1">Licence · {bundle.site.licence}</p>
        <div className="mt-3">
          <StatusChip status={bundle.site.status} />
        </div>
      </Card>
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
  const [name, setName] = useState('North wall')
  const [geom, setGeom] = useState<Geom>('northwall')
  const selected = bundle.elements.find((element) => element.id === ui.selectedElementId) ?? null
  const sources = selected ? linkedEvidence(bundle, selected.id) : []
  return (
    <div>
      <header className="mb-4 flex items-end justify-between">
        <div>
          <SectionLabel>Reconstruct</SectionLabel>
          <h1 className="text-[32px] font-normal">2D elevation</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPlayId((value) => value + 1)}>
            Replay
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            Add element
          </Button>
        </div>
      </header>
      <div className="grid gap-4 xl:grid-cols-[240px_1fr_300px]">
        <Card label="Elements">
          {bundle.elements.length === 0 ? <p className="text-text-2">None yet.</p> : null}
          {bundle.elements.map((element) => (
            <button
              key={element.id}
              type="button"
              onClick={() => selectElement(element.id)}
              className={`flex w-full items-center justify-between py-2 text-left ${element.id === selected?.id ? 'font-medium' : ''}`}
            >
              <span style={{ paddingLeft: element.parentId ? 12 : 0 }}>{element.name}</span>
              {element.type !== 'group' ? <ConfidenceChip level={element.confidence} pulse={element.id === selected?.id ? pulse : 0} /> : null}
            </button>
          ))}
        </Card>
        <div className="relative min-h-[480px] overflow-hidden rounded-card bg-[#241f1b]">
          <CaveElevation
            elements={bundle.elements}
            selectedId={selected?.id}
            thenNow={ui.thenNow}
            showColours={ui.showColours}
            playId={playId}
            onSelect={selectElement}
          />
          <p className="absolute bottom-4 left-4 text-[13px] text-white/70">
            Wireframe first, then the inferred colour.
          </p>
        </div>
        <div className="grid content-start gap-3">
          {selected ? (
            <Card label="Inspector">
              <p className="text-lg">{selected.name}</p>
              <div className="mt-3">
                <ConfidenceChip level={selected.confidence} pulse={pulse} />
              </div>
              <div className="mt-4 flex gap-2">
                {(['low', 'medium', 'high'] as Confidence[]).map((level) => (
                  <Button
                    key={level}
                    size="sm"
                    variant={selected.confidence === level ? 'primary' : 'secondary'}
                    onClick={() => {
                      const ok = setConfidenceLevel(selected.id, level)
                      if (ok) setPulse((value) => value + 1)
                    }}
                  >
                    {level}
                  </Button>
                ))}
              </div>
              {ui.confidenceError ? (
                <div className="mt-3">
                  <Notice>{ui.confidenceError}</Notice>
                </div>
              ) : null}
              <div className="mt-4">
                <Field
                  label="Rationale"
                  textarea
                  value={selected.rationale}
                  onChange={(rationale) => updateElement(selected.id, { rationale })}
                />
              </div>
              <div className="mt-4">
                <SectionLabel>Linked sources</SectionLabel>
                {sources.length === 0 ? <p className="mt-2 text-[13px] text-text-2">None linked.</p> : null}
                {sources.map((source) => (
                  <p key={source.id} className="mt-2 text-[13px]">
                    {source.title}
                  </p>
                ))}
                {bundle.evidence
                  .filter((item) => !sources.some((source) => source.id === item.id))
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="mt-2 block text-left text-[13px] underline"
                      onClick={() => linkEvidence(selected.id, item.id)}
                    >
                      Link {item.title}
                    </button>
                  ))}
              </div>
            </Card>
          ) : (
            <Card>
              <p>Select an element, or add one to the drawing.</p>
            </Card>
          )}
          <Card label="Then / now">
            <input
              aria-label="Then and now"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={ui.thenNow}
              onChange={(event) => setThenNow(Number(event.target.value))}
              className="w-full"
            />
            <button type="button" className="mt-3 text-[13px] underline" onClick={() => setShowColours(!ui.showColours)}>
              {ui.showColours ? 'Confidence colours on' : 'Confidence colours off'}
            </button>
          </Card>
        </div>
      </div>
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
