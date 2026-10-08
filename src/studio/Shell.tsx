import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  BarChart3,
  ClipboardCheck,
  Home,
  Image,
  Landmark,
  Moon,
  Settings,
  Sun,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Toast } from '../components/ui'
import { VisitorApp } from '../visitor/VisitorApp'
import { PEOPLE } from '../store/seed'
import { applyTheme, useAnvaya } from '../store'
import type { Role } from '../store/types'

const rail = [
  { to: '/studio', icon: Home, label: 'Home', end: true },
  { to: '/studio/sites', icon: Landmark, label: 'Sites' },
  { to: '/studio/review-queue', icon: ClipboardCheck, label: 'Review' },
  { to: '/studio/archive', icon: Archive, label: 'Archive' },
  { to: '/studio/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/studio/assets', icon: Image, label: 'Assets' },
  { to: '/studio/settings', icon: Settings, label: 'Settings' },
]

export function Shell() {
  const location = useLocation()
  const ui = useAnvaya((state) => state.ui)
  const toast = useAnvaya((state) => state.ui.toast)
  const reviews = useAnvaya((state) =>
    Object.values(state.bundles).filter((bundle) => bundle.site.status === 'in_review').length,
  )
  useEffect(() => {
    applyTheme(ui.theme)
  }, [ui.theme])

  return (
    <div className="min-h-screen bg-page text-text-1">
      <aside className="fixed bottom-4 left-4 right-4 z-40 flex h-16 items-center justify-between rounded-[40px] bg-surface px-3 shadow-card min-[1100px]:bottom-6 min-[1100px]:left-6 min-[1100px]:right-auto min-[1100px]:top-6 min-[1100px]:h-auto min-[1100px]:w-[72px] min-[1100px]:flex-col min-[1100px]:py-3 dark:border dark:border-line">
        <div className="flex items-center gap-1 min-[1100px]:flex-col">
          <div className="grid h-10 w-10 place-items-center text-sm font-medium">A</div>
          {rail.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) =>
                `relative grid h-10 w-10 place-items-center rounded-full ${isActive ? 'bg-primary text-on-primary' : 'text-text-2'}`
              }
            >
              <item.icon size={18} />
              {item.label === 'Review' && reviews > 0 ? (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-review" />
              ) : null}
            </NavLink>
          ))}
        </div>
        <AccountMenu />
      </aside>
      <div className="px-4 pb-24 pt-4 min-[1100px]:pb-6 min-[1100px]:pl-[120px] min-[1100px]:pr-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      <Toast message={toast} />
    </div>
  )
}

function AccountMenu() {
  const [open, setOpen] = useState(false)
  const role = useAnvaya((state) => state.ui.role)
  const setRole = useAnvaya((state) => state.setRole)
  const resetDemo = useAnvaya((state) => state.resetDemo)
  const active = useAnvaya((state) => state.bundles[state.activeId])
  const navigate = useNavigate()
  const person = PEOPLE[role]
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account"
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-full bg-accent-bg text-xs font-medium text-accent"
      >
        {person.initials}
      </button>
      {open ? (
        <div className="absolute bottom-12 left-0 z-50 w-64 rounded-card bg-surface p-3 shadow-float min-[1100px]:bottom-0 min-[1100px]:left-12 dark:border dark:border-line">
          <p className="text-sm font-medium">{person.name}</p>
          <p className="text-[13px] text-text-2">{person.role}</p>
          <div className="mt-3 grid gap-1">
            {(Object.keys(PEOPLE) as Role[]).map((key) => (
              <button
                key={key}
                type="button"
                className="rounded-btn px-2 py-2 text-left text-[13px] hover:bg-surface-2"
                onClick={() => {
                  setRole(key)
                  setOpen(false)
                }}
              >
                Act as {PEOPLE[key].name}
              </button>
            ))}
            <button
              type="button"
              className="rounded-btn px-2 py-2 text-left text-[13px] hover:bg-surface-2"
              onClick={() => {
                navigate(`/v/${active.site.slug}`)
                setOpen(false)
              }}
            >
              Open visitor
            </button>
            <button
              type="button"
              className="rounded-btn px-2 py-2 text-left text-[13px] hover:bg-surface-2"
              onClick={() => {
                resetDemo()
                setOpen(false)
              }}
            >
              Reset demo
            </button>
            <button
              type="button"
              className="rounded-btn px-2 py-2 text-left text-[13px] hover:bg-surface-2"
              onClick={() => {
                useAnvaya.getState().signOut()
                navigate('/signin')
                setOpen(false)
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function PreviewPanel({ caption }: { caption?: string }) {
  const bundle = useAnvaya((state) => state.bundles[state.activeId])
  const [path, setPath] = useState('/')
  const [updated, setUpdated] = useState(false)
  const signature = `${bundle.site.status}-${bundle.versions.length}-${bundle.elements.map((element) => element.confidence).join('')}-${path}`
  useEffect(() => {
    setUpdated(true)
    const timer = window.setTimeout(() => setUpdated(false), 1200)
    return () => window.clearTimeout(timer)
  }, [signature])
  const theme = useAnvaya((state) => state.ui.visitorLight)
  const setVisitorLight = useAnvaya((state) => state.setVisitorLight)
  return (
    <aside className="sticky top-6 hidden h-[calc(100vh-48px)] overflow-hidden rounded-card bg-[#2b2621] min-[1100px]:block">
      <div className="flex h-full flex-col bg-[radial-gradient(circle_at_30%_20%,#6b5d4d,#2b2621_55%,#171412)] p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/15 px-4 py-2 text-[13px] text-white backdrop-blur">
            anvaya.app/v/{bundle.site.slug}
          </span>
          <button
            type="button"
            aria-label="Toggle visitor theme"
            className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
            onClick={() => setVisitorLight(!theme)}
          >
            {theme ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <a
            className="rounded-btn bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-black"
            href={`#/v/${bundle.site.slug}?preview=1`}
          >
            Open
          </a>
        </div>
        <div className="grid flex-1 place-items-center">
          <div className="relative h-[506px] w-[234px] overflow-hidden rounded-phone bg-black shadow-float">
            <motion.div key={path} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="absolute left-0 top-0 h-[844px] w-[390px] origin-top-left scale-[0.6]">
              <VisitorApp slug={bundle.site.slug} path={path} onNavigate={setPath} embedded preview />
            </motion.div>
            {updated ? (
              <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-[11px] text-white backdrop-blur">
                Updated
              </div>
            ) : null}
          </div>
        </div>
        <p className="text-[13px] text-white/70">{caption ?? 'Visitor preview of the working copy'}</p>
      </div>
    </aside>
  )
}

export function SiteFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const bundle = useAnvaya((state) => state.bundles[state.activeId])
  const bundles = useAnvaya((state) => state.bundles)
  const setActive = useAnvaya((state) => state.setActive)
  const toast = useAnvaya((state) => state.toast)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const step = pathname.split('/').pop()
  const steps = ['overview', 'document', 'evidence', 'timeline', 'reconstruct', 'stories', 'review', 'publish', 'archive']
  return (
    <div>
      <header className="mb-6 flex h-[88px] items-center gap-4">
        <label className="rounded-full bg-surface px-4 py-2 text-sm shadow-card">
          <span className="sr-only">Site</span>
          <select
            className="bg-transparent outline-none"
            value={bundle.site.id}
            onChange={(event) => setActive(event.target.value)}
          >
            {Object.values(bundles).map((item) => (
              <option key={item.site.id} value={item.site.id}>
                {item.site.name}
              </option>
            ))}
          </select>
        </label>
        <nav className="hidden flex-1 justify-center gap-1 lg:flex">
          {steps.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => navigate(`/studio/site/${item}`)}
              className="relative rounded-full px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-2"
            >
              {step === item ? (
                <motion.span layoutId="step-pill" className="absolute inset-0 rounded-full bg-surface shadow-card" />
              ) : null}
              <span className={`relative ${step === item ? 'text-text-1' : ''}`}>{item}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="ml-auto rounded-btn bg-primary px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-on-primary"
          onClick={() => toast('Working copy updated')}
        >
          Update
        </button>
      </header>
      {wide ? (
        children
      ) : (
        <div className="grid items-start gap-6 min-[1100px]:grid-cols-2">
          <div className="mx-auto w-full max-w-[600px] min-[1100px]:mx-0">{children}</div>
          <PreviewPanel />
        </div>
      )}
    </div>
  )
}

