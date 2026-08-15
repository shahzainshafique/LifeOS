// Calm, GPU-friendly ambient background. Pure CSS (transform on blurred radial
// gradients) — no canvas/RAF, so it adds "aliveness" without competing with the
// model for the machine. Sits behind the translucent, backdrop-blurred cards.
export function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-1/4 -top-1/4 h-[60vmax] w-[60vmax] rounded-full opacity-[0.22] blur-[100px] [animation:aurora_22s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle at center, #a78bfa, transparent 60%)' }}
      />
      <div
        className="absolute -right-1/4 top-1/4 h-[55vmax] w-[55vmax] rounded-full opacity-[0.18] blur-[100px] [animation:aurora_28s_ease-in-out_infinite_reverse]"
        style={{ background: 'radial-gradient(circle at center, #60a5fa, transparent 60%)' }}
      />
      <div
        className="absolute -bottom-1/4 left-1/3 h-[48vmax] w-[48vmax] rounded-full opacity-[0.14] blur-[110px] [animation:aurora_26s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle at center, #f0abfc, transparent 60%)' }}
      />
    </div>
  )
}
