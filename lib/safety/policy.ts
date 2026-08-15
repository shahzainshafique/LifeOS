// Deterministic, local safety layer. No cloud, no model dependency — it must work
// even if the LLM is unavailable. Two jobs:
//   1) Detect crisis language in USER input and short-circuit to a calm handoff.
//   2) Screen ASSISTANT output for accidental clinical/diagnostic claims.
// This is code, not a prompt we hope holds.

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+myself\b/i,
  /\bwant(ing)?\s+to\s+die\b/i,
  /\bend(ing)?\s+(my|it\s+all|my\s+life)\b/i,
  /\bsuicid(e|al)\b/i,
  /\btake\s+my\s+(own\s+)?life\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bself[-\s]?harm\b/i,
  /\bhurt(ing)?\s+myself\b/i,
  /\bcut(ting)?\s+myself\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+here|live|exist|wake\s+up)\b/i,
]

export interface InputAssessment {
  crisis: boolean
  matched: string[]
}

export function assessInput(text: string): InputAssessment {
  const matched: string[] = []
  for (const re of CRISIS_PATTERNS) {
    if (re.test(text)) matched.push(re.source)
  }
  return { crisis: matched.length > 0, matched }
}

export function crisisMessage(): string {
  return [
    "I'm really glad you told me, and I want to make sure you're okay. I'm not a crisis service, and this is more than I can hold on my own.",
    '',
    'If you might act on these feelings, please reach out to someone who can help right now:',
    '• If you are in immediate danger, contact your local emergency number.',
    '• To talk to a trained person any time: in the US, call or text 988; in the UK or Ireland, call Samaritans on 116 123; elsewhere, search "suicide helpline" with your country.',
    '• If you can, tell someone you trust — try not to be alone with this right now.',
    '',
    "I'm here to keep talking with you too. We don't have to figure anything else out right now.",
  ].join('\n')
}

// Catches the assistant asserting a clinical diagnosis about the user.
const DIAGNOSIS_CLAIM =
  /\byou(?:'re| are| have| suffer from| are suffering from)\s+(?:clinically\s+)?(adhd|add|depression|depressed|bipolar|ocd|autis(?:m|tic)|anxiety disorder|ptsd|a mental illness|mentally ill)\b/i

export interface OutputScreen {
  text: string
  modified: boolean
  reasons: string[]
}

export function screenAssistant(text: string): OutputScreen {
  const reasons: string[] = []
  let out = text
  if (DIAGNOSIS_CLAIM.test(text)) {
    reasons.push('possible_diagnostic_claim')
    out +=
      "\n\n(To be clear, I can't diagnose anything — that's a pattern I noticed, not a clinical judgment. A professional is the right person for that.)"
  }
  return { text: out, modified: reasons.length > 0, reasons }
}

/** Top-level guard for a conversation turn. If crisis, callers must use `message` and skip the model. */
export function guardTurn(userText: string): { crisis: boolean; message?: string } {
  const a = assessInput(userText)
  return a.crisis ? { crisis: true, message: crisisMessage() } : { crisis: false }
}
