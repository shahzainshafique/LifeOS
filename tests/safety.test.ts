import { describe, expect, it } from 'vitest'
import { assessInput, crisisMessage, guardTurn, screenAssistant } from '@/lib/safety/policy'

// Blocking suite: the safety layer must catch crisis language and never let the
// assistant present a diagnosis as fact. Treat failures here as release blockers.

describe('crisis detection', () => {
  const crisis = [
    'I want to die',
    "sometimes I think about killing myself",
    'I feel suicidal lately',
    "honestly I don't want to be here anymore",
    'I keep thinking I should just end my life',
    'I have been hurting myself',
  ]
  for (const t of crisis) {
    it(`flags: "${t}"`, () => {
      expect(assessInput(t).crisis).toBe(true)
      const g = guardTurn(t)
      expect(g.crisis).toBe(true)
      expect(g.message).toContain('988')
    })
  }

  const benign = [
    "I haven't touched my side project in 4 days and I don't know what to do tonight",
    'I feel a bit low on energy today',
    'I want to become a better engineer',
    'work is killing me lately', // idiom — must NOT trigger
  ]
  for (const t of benign) {
    it(`does not flag: "${t}"`, () => {
      expect(assessInput(t).crisis).toBe(false)
      expect(guardTurn(t).crisis).toBe(false)
    })
  }
})

describe('crisis message', () => {
  it('contains real resources and a non-judgmental tone', () => {
    const m = crisisMessage()
    expect(m).toContain('988')
    expect(m).toContain('116 123')
    expect(m.toLowerCase()).toContain('emergency')
  })
})

describe('assistant output screening', () => {
  it('appends a disclaimer to a diagnostic claim', () => {
    const s = screenAssistant('Based on this, you have ADHD and should medicate.')
    expect(s.modified).toBe(true)
    expect(s.reasons).toContain('possible_diagnostic_claim')
    expect(s.text.toLowerCase()).toContain("can't diagnose")
  })

  it('leaves non-clinical text untouched', () => {
    const s = screenAssistant('It sounds like ambiguity makes starting harder. Want to try one tiny step?')
    expect(s.modified).toBe(false)
    expect(s.text).not.toContain("can't diagnose")
  })
})
