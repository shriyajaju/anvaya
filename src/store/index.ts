import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  approve,
  publish,
  replyToComment,
  requestChanges,
  resubmit,
  resolveComment,
  setConfidence,
  submitReview,
} from './rules'
import { blankBundle, DEMO_PASSWORD, PEOPLE, resetState } from './seed'
import type {
  AnalyticsEvent,
  Bundle,
  Confidence,
  Evidence,
  EvidenceType,
  Feedback,
  Geom,
  Role,
} from './types'

export type ThemeChoice = 'light' | 'dark' | 'system'

interface UiState {
  role: Role
  theme: ThemeChoice
  selectedElementId: string | null
  thenNow: number
  showColours: boolean
  visitorLight: boolean
  toast: string | null
  publishedFlash: boolean
  confidenceError: string | null
}

interface Account {
  email: string
  password: string
  role: Role
  name: string
}

interface AnvayaState {
  bundles: Record<string, Bundle>
  activeId: string
  analytics: AnalyticsEvent[]
  feedback: Feedback[]
  sessionId: string
  session: { email: string; role: Role; name: string } | null
  accounts: Account[]
  ui: UiState
  bundle: () => Bundle
  setActive: (id: string) => void
  setRole: (role: Role) => void
  setTheme: (theme: ThemeChoice) => void
  toast: (message: string) => void
  selectElement: (id: string | null) => void
  setThenNow: (value: number) => void
  setShowColours: (value: boolean) => void
  setVisitorLight: (value: boolean) => void
  setConfidenceLevel: (elementId: string, level: Confidence) => boolean
  addEvidence: (input: {
    type: EvidenceType
    title: string
    citation: string
    date: string
    strength: Confidence
    note: string
    elementIds: string[]
  }) => void
  linkEvidence: (elementId: string, evidenceId: string) => void
  addElement: (input: { name: string; geom: Geom; parentId?: string }) => void
  updateElement: (elementId: string, patch: Partial<Bundle['elements'][number]>) => void
  addStory: (title: string) => void
  updateSettings: (patch: Partial<Bundle['site']['settings']>) => void
  updateCondition: (patch: Partial<Bundle['condition']>) => void
  setSurvival: (elementId: string, value: number) => void
  submitForReview: () => void
  requestReviewChanges: (target: string, body: string) => void
  reply: (commentId: string, body: string) => void
  resolve: (commentId: string) => void
  resubmitReview: () => void
  approveReview: () => void
  publishVersion: (number: string, note: string) => boolean
  clearPublishedFlash: () => void
  createSite: (input: {
    name: string
    location: string
    type: string
    description: string
    year: string
  }) => string
  logEvent: (type: string, payload: Record<string, string>, siteId: string, embedded: boolean) => void
  addFeedback: (input: Omit<Feedback, 'id' | 'at'>) => void
  resetDemo: () => void
  signIn: (email: string, password: string) => boolean
  signUp: (input: { name: string; email: string; password: string }) => boolean
  signInAs: (role: Role) => void
  signOut: () => void
  patchBundle: (recipe: (bundle: Bundle) => Bundle) => void
}

const initial = resetState()

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export const useAnvaya = create<AnvayaState>()(
  persist(
    (set, get) => ({
      bundles: initial.bundles,
      activeId: initial.activeId,
      analytics: [],
      feedback: [],
      sessionId: uid('s'),
      session: null,
      accounts: (Object.keys(PEOPLE) as Role[]).map((role) => ({
        email: PEOPLE[role].email,
        password: DEMO_PASSWORD,
        role,
        name: PEOPLE[role].name,
      })),
      ui: {
        role: 'creator',
        theme: 'system',
        selectedElementId: 'roof',
        thenNow: 0.65,
        showColours: true,
        visitorLight: false,
        toast: null,
        publishedFlash: false,
        confidenceError: null,
      },
      bundle: () => get().bundles[get().activeId],
      patchBundle: (recipe) => {
        const id = get().activeId
        const current = get().bundles[id]
        set({ bundles: { ...get().bundles, [id]: recipe(current) } })
      },
      setActive: (id) => set({ activeId: id, ui: { ...get().ui, selectedElementId: null } }),
      setRole: (role) => set({ ui: { ...get().ui, role } }),
      setTheme: (theme) => set({ ui: { ...get().ui, theme } }),
      toast: (message) => {
        set({ ui: { ...get().ui, toast: message } })
        window.setTimeout(() => {
          if (get().ui.toast === message) set({ ui: { ...get().ui, toast: null } })
        }, 2400)
      },
      selectElement: (id) => set({ ui: { ...get().ui, selectedElementId: id } }),
      setThenNow: (value) => set({ ui: { ...get().ui, thenNow: value } }),
      setShowColours: (value) => set({ ui: { ...get().ui, showColours: value } }),
      setVisitorLight: (value) => set({ ui: { ...get().ui, visitorLight: value } }),
      setConfidenceLevel: (elementId, level) => {
        const result = setConfidence(get().bundle(), elementId, level)
        if (!result.ok) {
          set({ ui: { ...get().ui, confidenceError: result.error } })
          return false
        }
        get().patchBundle(() => result.value)
        set({ ui: { ...get().ui, confidenceError: null } })
        return true
      },
      addEvidence: (input) => {
        const evidence: Evidence = {
          id: uid('ev'),
          type: input.type,
          title: input.title.trim(),
          citation: input.citation.trim() || `${input.title.trim()} (placeholder reference)`,
          date: input.date.trim(),
          strength: input.strength,
          addedBy: get().ui.role,
          note: input.note.trim(),
          createdAt: new Date().toISOString(),
        }
        get().patchBundle((bundle) => ({
          ...bundle,
          evidence: [...bundle.evidence, evidence],
          links: [
            ...bundle.links,
            ...input.elementIds.map((elementId) => ({ elementId, evidenceId: evidence.id })),
          ],
        }))
        get().toast('Evidence added')
      },
      linkEvidence: (elementId, evidenceId) => {
        const bundle = get().bundle()
        if (bundle.links.some((link) => link.elementId === elementId && link.evidenceId === evidenceId)) {
          return
        }
        get().patchBundle((current) => ({
          ...current,
          links: [...current.links, { elementId, evidenceId }],
        }))
        get().toast('Source linked')
      },
      addElement: (input) => {
        const id = uid('el')
        get().patchBundle((bundle) => ({
          ...bundle,
          elements: [
            ...bundle.elements,
            {
              id,
              name: input.name.trim(),
              type: input.geom === 'block' ? 'object' : 'architectural',
              parentId: input.parentId,
              confidence: 'low',
              rationale: '',
              assumptions: [],
              visible: true,
              geom: input.geom,
              x: 180 + bundle.elements.length * 24,
              y: 160,
            },
          ],
        }))
        set({ ui: { ...get().ui, selectedElementId: id } })
      },
      updateElement: (elementId, patch) => {
        get().patchBundle((bundle) => ({
          ...bundle,
          elements: bundle.elements.map((element) =>
            element.id === elementId ? { ...element, ...patch } : element,
          ),
        }))
      },
      addStory: (title) => {
        get().patchBundle((bundle) => ({
          ...bundle,
          stories: [
            ...bundle.stories,
            {
              id: uid('story'),
              title: title.trim(),
              category: 'Place',
              summary: 'Placeholder story. Reconstruction is not presented as fact.',
              status: 'draft',
              duration: 60,
              steps: [
                {
                  id: uid('step'),
                  title: 'Opening',
                  locationId: bundle.locations[0]?.id ?? 'L1',
                  body: 'Write what a visitor should understand, and keep assumptions visible.',
                  audio: '',
                  sourceIds: [],
                },
              ],
            },
          ],
        }))
        get().toast('Story draft added')
      },
      updateSettings: (patch) => {
        get().patchBundle((bundle) => ({
          ...bundle,
          site: { ...bundle.site, settings: { ...bundle.site.settings, ...patch } },
        }))
      },
      updateCondition: (patch) => {
        get().patchBundle((bundle) => ({ ...bundle, condition: { ...bundle.condition, ...patch } }))
      },
      setSurvival: (elementId, value) => {
        get().patchBundle((bundle) => ({
          ...bundle,
          condition: {
            ...bundle.condition,
            survival: { ...bundle.condition.survival, [elementId]: value },
          },
        }))
      },
      submitForReview: () => {
        const result = submitReview(get().bundle(), get().ui.role)
        if (!result.ok) return get().toast(result.error)
        get().patchBundle(() => result.value)
        get().toast('Submitted for review')
      },
      requestReviewChanges: (target, body) => {
        const result = requestChanges(get().bundle(), get().ui.role, target, body)
        if (!result.ok) return get().toast(result.error)
        get().patchBundle(() => result.value)
        get().toast('Changes requested')
      },
      reply: (commentId, body) => {
        const result = replyToComment(get().bundle(), commentId, body)
        if (!result.ok) return get().toast(result.error)
        get().patchBundle(() => result.value)
      },
      resolve: (commentId) => get().patchBundle((bundle) => resolveComment(bundle, commentId)),
      resubmitReview: () => {
        const result = resubmit(get().bundle(), get().ui.role)
        if (!result.ok) return get().toast(result.error)
        get().patchBundle(() => result.value)
        get().toast('Resubmitted')
      },
      approveReview: () => {
        const result = approve(get().bundle(), get().ui.role)
        if (!result.ok) return get().toast(result.error)
        get().patchBundle(() => result.value)
        get().toast('Review approved')
      },
      publishVersion: (number, note) => {
        const result = publish(get().bundle(), get().ui.role, number, note)
        if (!result.ok) {
          get().toast(result.error)
          return false
        }
        get().patchBundle(() => result.value)
        set({ ui: { ...get().ui, publishedFlash: true } })
        return true
      },
      clearPublishedFlash: () => set({ ui: { ...get().ui, publishedFlash: false } }),
      createSite: (input) => {
        const bundle = blankBundle(input)
        set({
          bundles: { ...get().bundles, [bundle.site.id]: bundle },
          activeId: bundle.site.id,
          ui: { ...get().ui, selectedElementId: null },
        })
        get().toast('Draft site created')
        return bundle.site.id
      },
      logEvent: (type, payload, siteId, embedded) => {
        if (embedded) return
        const event: AnalyticsEvent = {
          id: uid('a'),
          type,
          payload,
          sid: get().sessionId,
          at: new Date().toISOString(),
          siteId,
        }
        set({ analytics: [...get().analytics, event] })
      },
      addFeedback: (input) => {
        set({
          feedback: [
            ...get().feedback,
            { ...input, id: uid('f'), at: new Date().toISOString() },
          ],
        })
      },
      signIn: (email, password) => {
        const account = get().accounts.find(
          (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
        )
        if (!account) return false
        set({
          session: { email: account.email, role: account.role, name: account.name },
          ui: { ...get().ui, role: account.role },
        })
        return true
      },
      signUp: ({ name, email, password }) => {
        const clean = email.trim().toLowerCase()
        if (!name.trim() || !clean.includes('@') || password.length < 4) return false
        if (get().accounts.some((item) => item.email === clean)) return false
        const account = { email: clean, password, role: 'creator' as Role, name: name.trim() }
        set({
          accounts: [...get().accounts, account],
          session: { email: account.email, role: 'creator', name: account.name },
          ui: { ...get().ui, role: 'creator' },
        })
        return true
      },
      signInAs: (role) => {
        const person = PEOPLE[role]
        set({
          session: { email: person.email, role, name: person.name },
          ui: { ...get().ui, role },
        })
      },
      signOut: () => set({ session: null }),
      resetDemo: () => {
        const next = resetState()
        set({
          bundles: next.bundles,
          activeId: next.activeId,
          analytics: [],
          feedback: [],
          ui: { ...get().ui, role: 'creator', selectedElementId: 'roof', publishedFlash: false },
        })
        get().toast('Demo reset')
      },
    }),
    {
      name: 'anvaya.state.v1',
      partialize: (state) => ({
        bundles: state.bundles,
        activeId: state.activeId,
        analytics: state.analytics,
        feedback: state.feedback,
        session: state.session,
        accounts: state.accounts,
        ui: {
          role: state.ui.role,
          theme: state.ui.theme,
          selectedElementId: state.ui.selectedElementId,
          thenNow: state.ui.thenNow,
          showColours: state.ui.showColours,
          visitorLight: state.ui.visitorLight,
        },
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AnvayaState>
        return {
          ...current,
          ...saved,
          ui: { ...current.ui, ...saved.ui, toast: null, publishedFlash: false, confidenceError: null },
        }
      },
    },
  ),
)

export function applyTheme(theme: ThemeChoice) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}
