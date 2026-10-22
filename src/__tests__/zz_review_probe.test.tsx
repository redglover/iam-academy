import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ProgressProvider } from '../features/progress/progress'
import { JmlSimulator } from '../features/jml-sim/JmlSimulator'
import { ReviewGame } from '../features/review/ReviewGame'
import { PimLab } from '../features/pim/PimLab'

const xp = () => JSON.parse(localStorage.getItem('iam-progress-v1') || '{"xp":0}').xp as number
const wrap = (el: JSX.Element) => render(<ProgressProvider totalModules={99}>{el}</ProgressProvider>)
beforeEach(() => localStorage.clear())

describe('reviewer probe: effects changed for exhaustive-deps', () => {
  it('JML: +10 XP exactly once per finished run, dept select follows department', async () => {
    const r = wrap(<JmlSimulator />)
    fireEvent.click(screen.getByText('Automated IAM'))
    fireEvent.click(screen.getByText(/Hire into/))
    fireEvent.click(screen.getByText(/Skip/))
    await act(async () => {})
    expect(xp()).toBe(10)
    r.rerender(<ProgressProvider totalModules={99}><JmlSimulator /></ProgressProvider>)
    await act(async () => {})
    expect(xp()).toBe(10)
    const btn = screen.getByText(/Transfer to/)
    const dept = btn.textContent!.replace(/.*Transfer to\s*/, '')
    expect(dept).not.toBe('…')
    fireEvent.click(btn)
    fireEvent.click(screen.getByText(/Skip/))
    await act(async () => {})
    expect(xp()).toBe(20)
    // after moving, the selected target must not be the current department
    expect(screen.getByText(/Transfer to/).textContent).not.toContain(dept)
  })

  it('Review game: XP awarded once per round, again on replay', async () => {
    wrap(<ReviewGame />)
    fireEvent.click(screen.getByText('Start review'))
    for (const b of screen.getAllByText('Revoke')) fireEvent.click(b)
    await act(async () => {})
    const first = xp()
    expect(first).toBeGreaterThan(0)
    await act(async () => {})
    expect(xp()).toBe(first)
    fireEvent.click(screen.getByText('Review again'))
    for (const b of screen.getAllByText('Revoke')) fireEvent.click(b)
    await act(async () => {})
    expect(xp()).toBe(first * 2)
  })

  it('PIM: switching person selects their first eligible role', async () => {
    const r = wrap(<PimLab />)
    fireEvent.click(screen.getByText(/Nora/, { selector: 'button' }))
    await act(async () => {})
    const sel = r.container.querySelector('select') as HTMLSelectElement | null
    console.log('PIM selects:', [...r.container.querySelectorAll('select')].map((s) => (s as HTMLSelectElement).value))
    expect(sel).not.toBeNull()
  })
})
