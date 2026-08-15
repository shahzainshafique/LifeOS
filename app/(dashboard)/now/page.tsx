import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadNow } from '@/lib/decision'
import { BlurFade } from '@/components/ui/blur-fade'
import { StateChips } from './state-chips'
import { NextAction } from './action-card'
import { Capture } from './capture'

// Renders instantly: gatherContext + reflections are fast DB reads. The decision
// engine (the slow model call) runs client-side via <NextAction>, never in SSR.
export const dynamic = 'force-dynamic'

const REFLECTION_LABEL: Record<string, string> = {
  observation: "I've noticed",
  inference: 'A guess',
  hypothesis: 'A hunch worth testing',
}

export default async function NowPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = await loadNow(supabase, user.id) // no generate -> instant

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <BlurFade delay={0.02}>
        <StateChips current={now.state} />
      </BlurFade>

      {now.empty ? (
        <BlurFade delay={0.08}>
          <section className="rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center backdrop-blur">
            <p className="font-heading text-xl">Let&apos;s start where you are.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Say something in{' '}
              <a className="underline underline-offset-4" href="/chat">
                Talk
              </a>{' '}
              — even &ldquo;I don&apos;t know what to do&rdquo; is enough. I&apos;ll begin to understand, and point
              you at one small thing.
            </p>
          </section>
        </BlurFade>
      ) : (
        <NextAction now={now} />
      )}

      {now.reflections.length > 0 && (
        <BlurFade delay={0.16}>
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              What I&apos;ve noticed
            </h3>
            <ul className="flex flex-col gap-2">
              {now.reflections.map((r) => (
                <li key={r.id} className="rounded-xl border border-border bg-card/60 p-3 text-sm backdrop-blur">
                  <span className="text-muted-foreground">{REFLECTION_LABEL[r.type] ?? r.type}:</span>{' '}
                  {r.content}
                  <span className="ml-1 text-xs text-muted-foreground">
                    (not a fact · {(r.confidence * 100).toFixed(0)}% sure)
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </BlurFade>
      )}

      <details className="rounded-xl border border-border bg-card/40 backdrop-blur">
        <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground">Quick capture</summary>
        <div className="p-4 pt-0">
          <Capture />
        </div>
      </details>
    </div>
  )
}
