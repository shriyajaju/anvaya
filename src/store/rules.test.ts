import { describe, expect, it } from 'vitest'
import { createKanheri } from './seed'
import { canPublish, diffSnapshots, setConfidence, snapshotOf } from './rules'

describe('setConfidence', () => {
  it('refuses high confidence when a source is required and missing', () => {
    const bundle = createKanheri()
    const result = setConfidence(bundle, 'cistern', 'high')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe(
        'High confidence needs at least one linked source. Link evidence first.',
      )
    }
  })

  it('allows high confidence after a source is linked', () => {
    const bundle = createKanheri()
    const linked = {
      ...bundle,
      links: [...bundle.links, { elementId: 'cistern', evidenceId: 'ev5' }],
    }
    const result = setConfidence(linked, 'cistern', 'high')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.elements.find((element) => element.id === 'cistern')?.confidence).toBe(
        'high',
      )
    }
  })
})

describe('canPublish', () => {
  it('allows an admin to publish an approved, unchanged review', () => {
    const bundle = createKanheri()
    expect(canPublish(bundle, 'admin').ok).toBe(true)
    expect(canPublish(bundle, 'creator').ok).toBe(false)
  })

  it('blocks publish after the reconstruction changes', () => {
    const bundle = createKanheri()
    const changed = setConfidence(bundle, 'frieze', 'medium')
    expect(changed.ok).toBe(true)
    if (changed.ok) expect(canPublish(changed.value, 'admin').ok).toBe(false)
  })
})

describe('diffSnapshots', () => {
  it('lists a confidence change and a newly linked source', () => {
    const bundle = createKanheri()
    const before = snapshotOf(bundle)
    const next = {
      ...bundle,
      links: [...bundle.links, { elementId: 'cistern', evidenceId: 'ev5' }],
      elements: bundle.elements.map((element) =>
        element.id === 'cistern' ? { ...element, confidence: 'medium' as const } : element,
      ),
    }
    const diff = diffSnapshots(before, snapshotOf(next))
    expect(diff.some((item) => item.detail.includes('Water cistern Low → Medium'))).toBe(true)
    expect(diff.some((item) => item.label === 'Source added' && item.detail.includes('cistern'))).toBe(
      true,
    )
  })
})
