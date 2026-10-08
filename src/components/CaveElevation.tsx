import { motion } from 'framer-motion'
import { useEffect, useState, type MouseEvent } from 'react'
import type { Confidence, Element } from '../store/types'
import { prefersReducedMotion } from './ui'

function iso(x: number, y: number, z: number): [number, number] {
  return [330 + (x - y) * 34, 300 + (x + y) * 16 - z * 28]
}

function poly(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
}

function colour(level: Confidence, showColours: boolean) {
  if (!showColours) return '#e7d7a4'
  if (level === 'high') return '#1f9d55'
  if (level === 'medium') return '#e0b33a'
  return '#e22442'
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
    const timer = window.setTimeout(() => setRevealed(true), 900)
    return () => window.clearTimeout(timer)
  }, [playId])

  const byGeom = (geom: Element['geom']) => elements.find((element) => element.geom === geom && element.visible)
  const hasCave = elements.some((element) => element.geom && element.geom !== 'block')
  const fill = revealed ? 0.18 + thenNow * 0.55 : 0
  const roof = byGeom('roof')
  const wall = byGeom('northwall')
  const frieze = byGeom('frieze')
  const entrance = byGeom('entrance')

  if (!hasCave) {
    return (
      <div className="grid h-full min-h-[420px] place-items-center rounded-[16px] bg-[#eef1f3] text-center text-text-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em]">2D reconstruction</p>
          <p className="mt-2 text-[18px] text-text-1">Add an element to draw the hall</p>
        </div>
      </div>
    )
  }

  const floor = [iso(0, 0, 0), iso(8, 0, 0), iso(8, 6, 0), iso(0, 6, 0)]
  const back = [iso(0, 6, 0), iso(8, 6, 0), iso(8, 6, 3.2), iso(0, 6, 3.2)]
  const side = [iso(0, 0, 0), iso(0, 6, 0), iso(0, 6, 3.2), iso(0, 0, 3.2)]
  const front = [iso(8, 0, 0), iso(8, 6, 0), iso(8, 6, 2.4), iso(8, 0, 2.4)]
  const roofShape = [iso(0, 0, 3.2), iso(8, 0, 3.2), iso(8, 6, 3.2), iso(4, 6, 5.4), iso(4, 0, 5.4), iso(0, 6, 3.2)]
  const ridge = [iso(4, 0, 5.4), iso(4, 6, 5.4)]
  const band = [iso(0.3, 6, 2.5), iso(7.7, 6, 2.5), iso(7.7, 6, 2.9), iso(0.3, 6, 2.9)]
  const green = [iso(0.3, 6, 1.7), iso(7.7, 6, 1.7), iso(7.7, 6, 2.05), iso(0.3, 6, 2.05)]
  const lintel = [iso(2.2, 0, 2.2), iso(5.8, 0, 2.2), iso(5.8, 0, 2.55), iso(2.2, 0, 2.55)]
  const label = iso(4, 2, 5.8)

  const hit = (id?: string) => ({
    onClick: (event: MouseEvent) => {
      event.stopPropagation()
      if (id) onSelect?.(id)
    },
    style: { cursor: onSelect ? 'pointer' : 'default' },
  })

  return (
    <svg viewBox="0 0 660 460" className="h-full w-full" role="img" aria-label="Isometric reconstruction">
      {transparent ? null : <rect width="660" height="460" fill="#e7edf0" rx="16" />}
      <polygon points={poly(floor)} fill="#d7d2c8" stroke="#b7b1a6" />
      <polygon points={poly(side)} fill="#cfc8bc" stroke="#b7b1a6" />
      <polygon points={poly(back)} fill="#e4dfd6" stroke="#b7b1a6" />
      <polygon points={poly(front)} fill="#c8c0b4" stroke="#b7b1a6" />
      {wall ? (
        <polygon points={poly(green)} fill={colour(wall.confidence, showColours)} opacity={0.9} {...hit(wall.id)} />
      ) : null}
      {frieze ? (
        <polygon points={poly(band)} fill={colour(frieze.confidence, showColours)} opacity={0.85} {...hit(frieze.id)} />
      ) : null}
      {entrance ? (
        <polygon points={poly(lintel)} fill={colour(entrance.confidence, showColours)} opacity={0.8} {...hit(entrance.id)} />
      ) : null}
      {roof ? (
        <g {...hit(roof.id)}>
          <motion.polygon
            points={poly([iso(-0.15, 3, 3.35), iso(8.15, 3, 3.35), iso(4, 3, 5.55)])}
            fill={colour(roof.confidence, showColours)}
            initial={false}
            animate={{ opacity: fill }}
          />
          <polygon
            points={poly(roofShape)}
            fill="none"
            stroke={revealed ? colour(roof.confidence, showColours) : '#111'}
            strokeDasharray="7 5"
            strokeWidth={selectedId === roof.id ? 2.4 : 1.6}
          />
          <line x1={ridge[0][0]} y1={ridge[0][1]} x2={ridge[1][0]} y2={ridge[1][1]} stroke={colour(roof.confidence, showColours)} strokeDasharray="6 4" />
          <g transform={`translate(${label[0] - 54}, ${label[1] - 28})`}>
            <rect width="108" height="22" rx="11" fill="#fff6df" />
            <text x="54" y="15" textAnchor="middle" fontSize="10" fill="#8a6410" fontFamily="Inter, sans-serif">
              ROOF · {roof.confidence.toUpperCase()}
            </text>
          </g>
        </g>
      ) : null}
    </svg>
  )
}
