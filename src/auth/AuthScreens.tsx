import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Field, Modal } from '../components/ui'
import { DEMO_PASSWORD, PEOPLE } from '../store/seed'
import { useAnvaya } from '../store'
import type { Role } from '../store/types'

function Stage() {
  return (
    <div className="relative hidden overflow-hidden bg-[#1c1916] lg:block">
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#4b2fa6] opacity-70 blur-[40px]" />
      <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-[#f7b267] opacity-70 blur-[40px]" />
      <div className="absolute bottom-0 left-16 h-80 w-80 rounded-full bg-[#1a3fe0] opacity-60 blur-[40px]" />
      <div className="relative grid h-full place-items-center p-12 text-white">
        <div className="w-[280px] rounded-phone bg-black p-3 shadow-float">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/60">Visitor</p>
          <p className="mt-6 font-display text-4xl font-light leading-tight">Kanheri Caves</p>
          <p className="mt-3 text-sm text-white/70">A reconstruction, never labelled as fact.</p>
        </div>
      </div>
    </div>
  )
}

export function SignIn() {
  const session = useAnvaya((state) => state.session)
  const signIn = useAnvaya((state) => state.signIn)
  const signInAs = useAnvaya((state) => state.signInAs)
  const navigate = useNavigate()
  const [email, setEmail] = useState<string>(PEOPLE.creator.email)
  const [password, setPassword] = useState<string>(DEMO_PASSWORD)
  const [error, setError] = useState('')
  const [googleOpen, setGoogleOpen] = useState(false)
  if (session) return <Navigate to="/studio" replace />

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <Stage />
      <main className="flex items-center justify-center bg-page px-6 py-16">
        <form
          className="w-full max-w-[400px]"
          onSubmit={(event) => {
            event.preventDefault()
            if (!signIn(email, password)) {
              setError('Those details do not match a demo account.')
              return
            }
            navigate('/studio')
          }}
        >
          <p className="text-sm tracking-[0.18em]">ANVAYA</p>
          <h1 className="mt-8 text-[32px] font-normal leading-10">Welcome back</h1>
          <p className="mt-2 text-[15px] leading-6 text-text-2">
            Sign in to the studio. The password is filled in for the jury demo.
          </p>
          <div className="mt-8 grid gap-3">
            <Field label="Email" value={email} onChange={setEmail} />
            <Field label="Password" type="password" value={password} onChange={setPassword} />
          </div>
          {error ? <p className="mt-3 text-[13px] text-conf-low">{error}</p> : null}
          <div className="mt-6">
            <Button type="submit">Sign in</Button>
          </div>
          <div className="my-6 flex items-center gap-3 text-[13px] text-text-3">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" onClick={() => setGoogleOpen(true)}>
            Continue with Google
          </Button>
          <p className="mt-3 text-[13px] leading-5 text-text-3">
            Google sign-in here is a demo chooser. It does not contact Google.
          </p>
          <p className="mt-8 text-[15px] text-text-2">
            New organisation?{' '}
            <Link className="text-text-1 underline" to="/signup">
              Create an account
            </Link>
          </p>
        </form>
      </main>
      <Modal
        open={googleOpen}
        title="Choose a demo account"
        onClose={() => setGoogleOpen(false)}
        footer={<Button variant="ghost" onClick={() => setGoogleOpen(false)}>Cancel</Button>}
      >
        <p className="mb-4 text-[15px] leading-6 text-text-2">
          This stands in for Google sign-in during the jury. Pick a person to enter the studio.
        </p>
        <div className="grid gap-2">
          {(Object.keys(PEOPLE) as Role[]).map((role) => (
            <button
              key={role}
              type="button"
              className="rounded-card border border-line px-4 py-3 text-left hover:bg-surface-2"
              onClick={() => {
                signInAs(role)
                navigate('/studio')
              }}
            >
              <span className="block text-[15px]">{PEOPLE[role].name}</span>
              <span className="block text-[13px] text-text-2">
                {PEOPLE[role].email} · {PEOPLE[role].role}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export function SignUp() {
  const session = useAnvaya((state) => state.session)
  const signUp = useAnvaya((state) => state.signUp)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  if (session) return <Navigate to="/studio" replace />

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <Stage />
      <main className="flex items-center justify-center bg-page px-6 py-16">
        <form
          className="w-full max-w-[400px]"
          onSubmit={(event) => {
            event.preventDefault()
            if (!signUp({ name, email, password })) {
              setError('Use a new email and a password of at least 4 characters.')
              return
            }
            navigate('/studio')
          }}
        >
          <p className="text-sm tracking-[0.18em]">ANVAYA</p>
          <h1 className="mt-8 text-[32px] font-normal leading-10">Create an account</h1>
          <p className="mt-2 text-[15px] leading-6 text-text-2">
            This stays on this browser. You will enter as a creator.
          </p>
          <div className="mt-8 grid gap-3">
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Email" value={email} onChange={setEmail} />
            <Field label="Password" type="password" value={password} onChange={setPassword} />
          </div>
          {error ? <p className="mt-3 text-[13px] text-conf-low">{error}</p> : null}
          <div className="mt-6">
            <Button type="submit">Create account</Button>
          </div>
          <p className="mt-8 text-[15px] text-text-2">
            Already have a demo login?{' '}
            <Link className="text-text-1 underline" to="/signin">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}
