import { motion } from 'framer-motion'
import { cloneElement, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import type { Confidence, Element } from '../store/types'
import { prefersReducedMotion } from './ui'

const STONE = '#8d8478'
const STONE_DARK = '#5c564e'
const BEIGE = '#d9c7a6'

function confColour(level: Confidence, showColours: boolean) {
  if (!showColours) return BEIGE
  if (level === 'high') return '#2E7D4F'
  if (level === 'medium') return '#B7791F'
  return '#C0392B'
}

export function CaveElevation({
  elements,
  selectedId,
  thenNow,
  showColours,
  transparent = false,
  playId = 0,
  onSelect,
}: {
  elements: Element[]
  selectedId?: string | null
  thenNow: number
  showColours: boolean
  transparent?: boolean
  playId?: number
  onSelect?: (id: string) => void
}) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    setRevealed(false)
    if (prefersReducedMotion()) {
      setRevealed(true)
      return
    }
    const timer = window.setTimeout(() => setRevealed(true), 1200)
    return () => window.clearTimeout(timer)
  }, [playId])

  const byGeom = (geom: Element['geom']) => elements.find((element) => element.geom === geom && element.visible)
  const blocks = elements.filter((element) => element.geom === 'block' && element.visible)
  const hasCave = elements.some((element) => element.geom && element.geom !== 'block')
  const fillOpacity = revealed ? 0.16 + thenNow * 0.5 : 0

  if (!hasCave && blocks.length === 0) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-card border border-dashed border-white/30 bg-[#241f1b]/80 p-8 text-center text-white/80">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/50">2D reconstruction</p>
          <p className="mt-2 font-display text-3xl font-light">Empty drawing</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/70">
            Add an element. The drawing starts as a wireframe, then the inferred parts fill in.
          </p>
        </div>
      </div>
    )
  }

  const shape = (element: Element | undefined, node: ReactElement) => {
    if (!element) return null
    const selected = element.id === selectedId
    const colour = confColour(element.confidence, showColours)
    const outline = cloneElement(node, {
      fill: 'none',
      stroke: revealed ? colour : '#ffffff',
      strokeWidth: selected ? 2.4 : 1.6,
      strokeDasharray: '7 5',
    })
    const filled = cloneElement(node, { stroke: 'none' })
    return (
      <g
        key={element.id}
        onClick={(event) => {
          event.stopPropagation()
          onSelect?.(element.id)
        }}
        style={{ cursor: onSelect ? 'pointer' : 'default' }}
      >
        <motion.g initial={false} animate={{ opacity: fillOpacity }} transition={{ duration: 0.7 }}>
          {filled}
        </motion.g>
        {outline}
      </g>
    )
  }

  return (
    <svg viewBox="0 0 880 520" className="h-full w-full" role="img" aria-label="Two dimensional reconstruction">
      <defs>
        <linearGradient id="stoneGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b5d4d" />
          <stop offset="1" stopColor="#2b2621" />
        </linearGradient>
      </defs>
      {transparent ? null : <rect width="880" height="520" fill="url(#stoneGrad)" />}
      <text x="36" y="36" fill="white" fillOpacity="0.75" fontSize="11" letterSpacing="1.4">
        {revealed ? 'RECONSTRUCTION · NOT A FACT' : 'WIREFRAME'}
      </text>

      {hasCave ? (
        <g fill="none" stroke={revealed ? STONE : 'white'} strokeWidth="1.6">
          <rect x="120" y="250" width="70" height="190" fill={revealed ? STONE : 'none'} stroke={STONE_DARK} />
          <rect x="690" y="250" width="70" height="190" fill={revealed ? STONE : 'none'} stroke={STONE_DARK} />
          <rect x="190" y="250" width="500" height="175" fill={revealed ? STONE : 'none'} />
          <rect x="230" y="300" width="36" height="140" fill={revealed ? '#746b60' : 'none'} />
          <rect x="614" y="300" width="36" height="140" fill={revealed ? '#746b60' : 'none'} />
          <rect x="120" y="430" width="640" height="28" fill={revealed ? STONE : 'none'} />
          <rect x="266" y="408" width="348" height="18" fill={revealed ? '#6e655b' : 'none'} />
          <ellipse cx="440" cy="468" rx="86" ry="16" />
        </g>
      ) : null}

      {shape(
        byGeom('roof'),
        <polygon points="160,168 440,48 720,168" fill={confColour(byGeom('roof')!.confidence, showColours)} />,
      )}
      {shape(
        byGeom('northwall'),
        <rect x="190" y="150" width="500" height="100" fill={confColour(byGeom('northwall')!.confidence, showColours)} />,
      )}
      {shape(
        byGeom('frieze'),
        <rect x="230" y="248" width="420" height="22" fill={confColour(byGeom('frieze')!.confidence, showColours)} />,
      )}
      {shape(
        byGeom('entrance'),
        <rect x="266" y="268" width="348" height="26" fill={confColour(byGeom('entrance')!.confidence, showColours)} />,
      )}
      {shape(
        byGeom('cistern'),
        <ellipse cx="440" cy="452" rx="70" ry="18" fill={confColour(byGeom('cistern')!.confidence, showColours)} />,
      )}

      {blocks.map((element, index) => (
        <g key={element.id} onClick={() => onSelect?.(element.id)} style={{ cursor: 'pointer' }}>
          <motion.rect
            x={160 + (index % 4) * 150}
            y={180 + Math.floor(index / 4) * 90}
            width="120"
            height="64"
            rx="8"
            fill={confColour(element.confidence, showColours)}
            initial={false}
            animate={{ opacity: fillOpacity }}
          />
          <rect
            x={160 + (index % 4) * 150}
            y={180 + Math.floor(index / 4) * 90}
            width="120"
            height="64"
            rx="8"
            fill="none"
            stroke="white"
            strokeDasharray="6 4"
          />
          <text x={170 + (index % 4) * 150} y={216 + Math.floor(index / 4) * 90} fill="white" fontSize="12">
            {element.name}
          </text>
        </g>
      ))}

      <g fill="white" fontSize="12">
        {byGeom('roof') ? <text x="400" y="110">Roof</text> : null}
        {byGeom('northwall') ? <text x="390" y="205">North wall</text> : null}
        {byGeom('frieze') ? <text x="400" y="264">Frieze</text> : null}
        {byGeom('entrance') ? <text x="400" y="286">Lintel</text> : null}
        {byGeom('cistern') ? <text x="400" y="456">Cistern</text> : null}
      </g>
    </svg>
  )
}
