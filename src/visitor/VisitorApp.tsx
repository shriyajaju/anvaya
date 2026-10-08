import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CaveElevation } from '../components/CaveElevation'
import { ConfidenceChip } from '../components/ui'
import { visitorConfidence } from '../store/rules'
import { useAnvaya } from '../store'
import type { Bundle, Element, Evidence, Interpretation, Snapshot } from '../store/types'

type View = {
  siteName: string
  siteId: string
  description: string
  location: string
  year: string
  elements: Array<Element & { evidence: Evidence[]; interpretations: Interpretation[] }>
  stories: Bundle['stories']
  watermark: boolean
  published: boolean
}

function viewOf(bundle: Bundle, preview: boolean, version: string | null): View | null {
  if (preview) {
    return {
      siteName: bundle.site.name,
      siteId: bundle.site.id,
      description: bundle.site.description,
      location: bundle.site.location,
      year: bundle.site.reconstructionYear,
      elements: bundle.elements.map((element) => ({
        ...element,
        evidence: bundle.evidence.filter((item) =>
          bundle.links.some((link) => link.elementId === element.id && link.evidenceId === item.id),
        ),
        interpretations: bundle.interpretations.filter((item) => item.elementId === element.id),
      })),
      stories: bundle.stories,
      watermark: true,
      published: true,
    }
  }
  const snapshot: Snapshot | undefined = version
    ? bundle.versions.find((item) => item.number === version)?.snapshot
    : bundle.versions.find((item) => item.id === bundle.site.currentVersionId)?.snapshot
  if (!snapshot) return null
  return {
    siteName: snapshot.site.name,
    siteId: snapshot.site.id,
    description: snapshot.site.description,
    location: snapshot.site.location,
    year: snapshot.site.reconstructionYear,
    elements: snapshot.elements,
    stories: snapshot.stories,
    watermark: false,
    published: true,
  }
}

export function VisitorPage() {
  const { slug = 'kanheri' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const prefix = `/v/${slug}`
  const path = location.pathname.startsWith(prefix) ? location.pathname.slice(prefix.length) || '/' : '/'
  const preview = new URLSearchParams(location.search).get('preview') === '1'
  return (
    <VisitorApp
      slug={slug}
      path={path}
      preview={preview}
      onNavigate={(next) => navigate(`${prefix}${next === '/' ? '' : next}${location.search}`)}
    />
  )
}

export function VisitorApp({
  slug,
  path,
  onNavigate,
  embedded = false,
  preview = false,
}: {
  slug: string
  path: string
  onNavigate: (path: string) => void
  embedded?: boolean
  preview?: boolean
}) {
  const bundle = useAnvaya((state) =>
    Object.values(state.bundles).find((item) => item.site.slug === slug || item.site.id === slug),
  )
  const logEvent = useAnvaya((state) => state.logEvent)
  const addFeedback = useAnvaya((state) => state.addFeedback)
  const thenNow = useAnvaya((state) => state.ui.thenNow)
  const showColours = useAnvaya((state) => state.ui.showColours)
  const light = useAnvaya((state) => state.ui.visitorLight)
  const version = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('version')
  const view = bundle ? viewOf(bundle, preview || embedded, embedded ? null : version) : null

  useEffect(() => {
    if (!view || embedded) return
    const type = path.startsWith('/ar')
      ? 'ar_open'
      : path.startsWith('/hdwk')
        ? 'hdwk_open'
        : path.startsWith('/sources')
          ? 'sources_open'
          : path.startsWith('/story')
            ? 'story_play'
            : path === '/'
              ? 'scan'
              : ''
    if (type) logEvent(type, { path }, view.siteId, false)
  }, [path, view?.siteId, embedded])

  if (!bundle || !view) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#171412] p-8 text-center text-white">
        <div>
          <p className="font-display text-4xl font-light">Nothing published yet</p>
          <p className="mt-3 text-white/70">This site has no frozen snapshot for visitors.</p>
        </div>
      </main>
    )
  }

  const parts = path.split('/').filter(Boolean)
  const elementId = parts[1]
  const element = view.elements.find((item) => item.id === elementId) ?? view.elements.find((item) => item.geom === 'roof')
  const shell = light ? 'bg-[#f6f6f4] text-[#111]' : 'bg-[#111] text-white'

  return (
    <div className={`relative min-h-full ${shell}`} style={{ minHeight: embedded ? 844 : '100vh' }}>
      {view.watermark ? (
        <p className="absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]">
          Preview
        </p>
      ) : null}
      {parts[0] === 'ar' && element ? (
        <ArView element={element} elements={view.elements} thenNow={thenNow} showColours={showColours} camera={!embedded} onBack={() => onNavigate('/')} onKnow={() => onNavigate(`/hdwk/${element.id}`)} />
      ) : null}
      {parts[0] === 'hdwk' && element ? (
        <KnowView element={element} onBack={() => onNavigate(`/ar/${element.id}`)} />
      ) : null}
      {parts[0] === 'compare' && element ? (
        <CompareView element={element} elements={view.elements} showColours={showColours} onBack={() => onNavigate(`/ar/${element.id}`)} />
      ) : null}
      {parts[0] === 'about' ? (
        <AboutView
          view={view}
          onBack={() => onNavigate('/')}
          onSend={(comment, trust) => {
            addFeedback({ siteId: view.siteId, comment, trust, where: 'about', understand: trust })
            if (!embedded) logEvent('feedback_submit', {}, view.siteId, false)
          }}
        />
      ) : null}
      {parts[0] === 'stories' || parts[0] === 'story' ? (
        <StoriesView view={view} storyId={parts[1]} onOpen={(id) => onNavigate(`/story/${id}`)} onBack={() => onNavigate('/')} />
      ) : null}
      {parts.length === 0 ? (
        <Landing view={view} onOpen={(id) => onNavigate(`/ar/${id}`)} onAbout={() => onNavigate('/about')} onStories={() => onNavigate('/stories')} />
      ) : null}
    </div>
  )
}

function Landing({
  view,
  onOpen,
  onAbout,
  onStories,
}: {
  view: View
  onOpen: (id: string) => void
  onAbout: () => void
  onStories: () => void
}) {
  const focus = view.elements.find((element) => element.geom === 'roof') ?? view.elements.find((element) => element.type !== 'group')
  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-10">
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">ANVAYA</p>
      <h1 className="mt-8 font-display text-[40px] font-light leading-[1.1]">{view.siteName}</h1>
      <p className="mt-3 text-[15px] leading-6 text-white/75">{view.description}</p>
      <p className="mt-2 text-[13px] text-white/50">
        {view.location} · c. {view.year} · reconstruction, not a fact
      </p>
      {focus ? (
        <button type="button" onClick={() => onOpen(focus.id)} className="mt-8 h-[52px] rounded-btn bg-white text-[11px] font-medium uppercase tracking-[0.08em] text-black">
          See the reconstruction
        </button>
      ) : (
        <p className="mt-8 text-white/70">This published snapshot has no reconstructed elements.</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onStories} className="h-12 rounded-full bg-white/10 text-[13px] backdrop-blur">
          Stories
        </button>
        <button type="button" onClick={onAbout} className="h-12 rounded-full bg-white/10 text-[13px] backdrop-blur">
          About
        </button>
      </div>
    </div>
  )
}

function CameraBackdrop({ enabled }: { enabled: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const [denied, setDenied] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let stream: MediaStream | null = null
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((next) => {
        stream = next
        if (video.current) {
          video.current.srcObject = next
          void video.current.play()
        }
      })
      .catch(() => setDenied(true))
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [enabled])
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#6b5d4d,#2b2621_55%,#171412)]">
      {enabled && !denied ? <video ref={video} className="h-full w-full object-cover" playsInline muted /> : null}
      {enabled && denied ? (
        <p className="absolute bottom-24 left-4 right-4 text-center text-[13px] text-white/70">
          Camera is unavailable. The drawing sits on a stand-in backdrop.
        </p>
      ) : null}
    </div>
  )
}

function ArView({
  element,
  elements,
  thenNow,
  showColours,
  camera,
  onBack,
  onKnow,
}: {
  element: Element
  elements: Element[]
  thenNow: number
  showColours: boolean
  camera: boolean
  onBack: () => void
  onKnow: () => void
}) {
  return (
    <div className="relative min-h-full">
      <CameraBackdrop enabled={camera} />
      <div className="absolute inset-x-4 top-16 bottom-28">
        <CaveElevation elements={elements} selectedId={element.id} thenNow={thenNow} showColours={showColours} transparent />
      </div>
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-full bg-white/15 px-3 py-2 text-[13px] text-white backdrop-blur">
          Back
        </button>
        <ConfidenceChip level={element.confidence} audience="visitor" />
      </div>
      <div className="absolute inset-x-4 bottom-6">
        <p className="text-[13px] text-white/80">The drawing floats on the camera so you can see where the reconstruction sits.</p>
        <button type="button" onClick={onKnow} className="mt-3 h-[52px] w-full rounded-btn bg-white text-[11px] font-medium uppercase tracking-[0.08em] text-black">
          How do we know?
        </button>
      </div>
    </div>
  )
}

function KnowView({
  element,
  onBack,
}: {
  element: Element & { evidence?: Evidence[]; interpretations?: Interpretation[]; assumptions?: string[] }
  onBack: () => void
}) {
  return (
    <div className="min-h-full px-5 pb-10 pt-8">
      <button type="button" onClick={onBack} className="text-[13px] text-white/70">
        Back
      </button>
      <p className="mt-6 text-[11px] uppercase tracking-[0.08em] text-white/50">How do we know?</p>
      <h1 className="mt-2 font-display text-4xl font-light">{element.name}</h1>
      <div className="mt-3">
        <ConfidenceChip level={element.confidence} audience="visitor" />
      </div>
      <p className="mt-4 text-[15px] leading-6 text-white/80">{element.rationale || 'No rationale has been written.'}</p>
      <p className="mt-6 text-[11px] uppercase tracking-[0.08em] text-white/50">Sources</p>
      {(element.evidence ?? []).length === 0 ? <p className="mt-2 text-white/70">No linked source.</p> : null}
      {(element.evidence ?? []).map((source) => (
        <p key={source.id} className="mt-3 text-[15px]">
          {source.title}
          <span className="block text-[13px] text-white/60">{source.citation}</span>
        </p>
      ))}
      <p className="mt-6 text-[11px] uppercase tracking-[0.08em] text-white/50">Assumptions</p>
      {(element.assumptions ?? []).length === 0 ? <p className="mt-2 text-white/70">None recorded.</p> : null}
      {(element.assumptions ?? []).map((item) => (
        <p key={item} className="mt-2 text-[15px]">
          {item}
        </p>
      ))}
      <p className="mt-8 text-[13px] text-white/50">This is an interpretation. It is not presented as fact. Label: {visitorConfidence(element.confidence)}.</p>
    </div>
  )
}

function CompareView({
  element,
  elements,
  showColours,
  onBack,
}: {
  element: Element
  elements: Element[]
  showColours: boolean
  onBack: () => void
}) {
  const [split, setSplit] = useState(0.5)
  return (
    <div className="relative min-h-full">
      <button type="button" onClick={onBack} className="absolute left-4 top-4 z-10 rounded-full bg-white/15 px-3 py-2 text-[13px] text-white">
        Back
      </button>
      <div className="grid min-h-screen" style={{ gridTemplateRows: `${split * 100}% ${100 - split * 100}%` }}>
        <div className="overflow-hidden bg-[#3a342c]">
          <CaveElevation elements={elements.filter((item) => item.geom !== element.geom)} thenNow={0} showColours={false} transparent={false} />
        </div>
        <div className="overflow-hidden">
          <CaveElevation elements={elements} selectedId={element.id} thenNow={1} showColours={showColours} />
        </div>
      </div>
      <input
        aria-label="Compare split"
        className="absolute left-1/2 top-1/2 w-40 -translate-x-1/2"
        type="range"
        min={0.15}
        max={0.85}
        step={0.01}
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
      />
    </div>
  )
}

function StoriesView({
  view,
  storyId,
  onOpen,
  onBack,
}: {
  view: View
  storyId?: string
  onOpen: (id: string) => void
  onBack: () => void
}) {
  const story = view.stories.find((item) => item.id === storyId)
  return (
    <div className="px-5 pb-10 pt-8">
      <button type="button" onClick={onBack} className="text-[13px] text-white/70">
        Back
      </button>
      {story ? (
        <>
          <h1 className="mt-6 font-display text-4xl font-light">{story.title}</h1>
          {story.steps.map((step) => (
            <p key={step.id} className="mt-4 text-[15px] leading-6 text-white/80">
              <span className="block text-[11px] uppercase tracking-[0.08em] text-white/50">{step.title}</span>
              {step.body}
            </p>
          ))}
        </>
      ) : (
        <>
          <h1 className="mt-6 font-display text-4xl font-light">Stories</h1>
          {view.stories.length === 0 ? <p className="mt-4 text-white/70">No published stories.</p> : null}
          {view.stories.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="mt-4 block w-full rounded-card bg-white/10 p-4 text-left">
              {item.title}
            </button>
          ))}
        </>
      )}
    </div>
  )
}

function AboutView({
  view,
  onBack,
  onSend,
}: {
  view: View
  onBack: () => void
  onSend: (comment: string, trust: number) => void
}) {
  const [comment, setComment] = useState('')
  const [trust, setTrust] = useState(3)
  const [sent, setSent] = useState(false)
  return (
    <div className="px-5 pb-10 pt-8">
      <button type="button" onClick={onBack} className="text-[13px] text-white/70">
        Back
      </button>
      <h1 className="mt-6 font-display text-4xl font-light">About</h1>
      <p className="mt-3 text-[15px] leading-6 text-white/80">
        {view.siteName} is shown as a reconstruction. Confidence stays on every inferred part.
      </p>
      <label className="mt-6 block text-[13px] text-white/70">
        How much do you trust this reconstruction? {trust}
        <input className="mt-2 w-full" type="range" min={1} max={5} value={trust} onChange={(event) => setTrust(Number(event.target.value))} />
      </label>
      <textarea
        className="mt-4 w-full rounded-card bg-white/10 p-3 text-white outline-none"
        rows={4}
        value={comment}
        placeholder="A note for the site team"
        onChange={(event) => setComment(event.target.value)}
      />
      <button
        type="button"
        className="mt-4 h-[52px] w-full rounded-btn bg-white text-[11px] font-medium uppercase tracking-[0.08em] text-black"
        onClick={() => {
          onSend(comment, trust)
          setSent(true)
        }}
      >
        {sent ? 'Sent' : 'Send feedback'}
      </button>
    </div>
  )
}
