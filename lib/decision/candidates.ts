import type { LifeContext } from '@/lib/memory/retrieve'
import type { ActionEnergy } from '@/lib/domain'

/**
 * A choice the decision engine can pick. Existing open actions carry their real
 * action_id/thread_id; the always-available fallbacks (rest/reset/outside) do not —
 * if one is chosen we materialise a next_action for it so the loop can be closed.
 */
export interface Candidate {
  label: string
  title: string
  first_physical_step: string
  energy_cost: ActionEnergy
  action_id: string | null
  thread_id: string | null
}

const FALLBACKS: Omit<Candidate, 'label'>[] = [
  {
    title: 'Take a short rest',
    first_physical_step: 'Set a 15-minute timer and step away from screens',
    energy_cost: 'low',
    action_id: null,
    thread_id: null,
  },
  {
    title: 'Do a 5-minute reset',
    first_physical_step: 'Clear the surface in front of you for five minutes',
    energy_cost: 'low',
    action_id: null,
    thread_id: null,
  },
  {
    title: 'Get outside for a few minutes',
    first_physical_step: 'Put on shoes and step out the front door',
    energy_cost: 'low',
    action_id: null,
    thread_id: null,
  },
]

export function buildCandidates(ctx: LifeContext): Candidate[] {
  const out: Candidate[] = []
  ctx.openActions.forEach((a, i) => {
    out.push({
      label: `A${i + 1}`,
      title: a.title,
      first_physical_step: a.first_physical_step ?? 'Start with the smallest possible step',
      energy_cost: a.energy_cost,
      action_id: a.id,
      thread_id: a.thread_id,
    })
  })
  FALLBACKS.forEach((f, i) => out.push({ ...f, label: `R${i + 1}` }))
  return out
}
