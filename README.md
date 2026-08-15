# LifeOS

A private, local-first "second brain" that tries to actually understand me — and then tells me the one thing worth doing right now.

Most productivity apps hand you a pile of tasks and assume you've got the executive function to sort them out. LifeOS bets the other way: when I'm low on energy or direction, the app should get *simpler* and just point me at a single next step. And because it holds the messy personal stuff, it runs entirely on my own machine. Nothing leaves it.

It's a personal project and very much a work in progress. Today it does one loop, end to end:

> talk → understand → remember → decide → act → learn

## Why it's different

A handful of ideas in here that I haven't really seen put together elsewhere:

**It knows the difference between a fact and a guess.** Everything LifeOS believes about me is *typed* — is this something I actually said (a fact), a pattern it noticed (an observation), or a hunch it's floating (a hypothesis)? Anything it infers has to point back to the exact words that produced it; there's no belief without a receipt, and that rule is enforced in the code, not just hoped for. The **Memory** screen shows all of it in plain language, and I can correct or delete anything. It's my model of me, and I get the last word.

**One thing, right now.** The home screen isn't a dashboard, it's a single card: the one action worth doing, a concrete first physical step, and an honest "here's why." Not seventeen options. If I'm fried, "rest" or "go outside" are perfectly valid answers — it isn't trying to max out my output, it's trying to get me unstuck.

**It admits when it's unsure.** Reflections show up labeled like *"a hunch worth testing · 70% sure."* No confident nonsense, and it never pretends to diagnose anything.

**Nothing leaves the machine.** The model is a local Ollama (Qwen 2.5 7B). The database is a self-hosted Supabase. I get to it from my phone over a private Tailscale network. There's a cloud escape hatch in the code for heavier reasoning, but it ships off — flipping it on is the only way anything goes out, and that's meant to be a deliberate decision.

**Safety is a code path, not a prompt.** If I type something that reads like a crisis, a deterministic check short-circuits the model completely and surfaces real resources. That path doesn't depend on the LLM behaving itself.

## What works right now

- Streaming chat that quietly extracts typed, evidence-backed memory from what I say
- A decision engine that picks a single next action with a rationale and provenance
- The Memory trust surface — browse, correct, or refute anything it believes
- A one-tap "how am I feeling" state that the recommendations actually respond to
- The crisis-safety layer
- Installable PWA with offline capture that syncs when the machine's awake again

Deliberately **not** built yet (and I'm holding the line): research agents, autonomous experiments, weekly/monthly reviews, third-party integrations, auto-detected mood. Those earn their place only after the core loop has proven itself over real use.

## Stack

- Next.js 16 (App Router) + React 19, Tailwind 4 + shadcn, `motion`
- Supabase (Postgres + pgvector + Auth + RLS), self-hosted via Docker
- Ollama — `qwen2.5:7b-instruct` for reasoning, `nomic-embed-text` for embeddings
- pg-boss for the background extraction worker
- A provider-agnostic model gateway, so the app isn't welded to a single LLM

It runs on fairly modest hardware. I built it on a laptop with a 6 GB RTX 4050, which is why the local model choices are what they are.

## Running it locally

You'll need Docker, Node 20+, and Ollama installed.

```bash
# 1. deps
npm install

# 2. models (a few GB, one time)
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text

# 3. database — this also applies the migrations
npx supabase start

# 4. env — then paste in the keys that `supabase start` printed
cp .env.example .env.local

# 5. run the app and the worker (two terminals)
npm run dev
npm run worker
```

Then open http://localhost:3000, sign up, and start talking.

To use it from your phone, put both devices on a Tailscale network and front the dev server over HTTPS with `tailscale serve`.

## How the loop actually works

1. I say something in **Talk**. It's saved as an immutable entry and streamed a reply.
2. A background job runs that message through the model and pulls out typed beliefs (each with its evidence), open threads, and candidate actions.
3. **Now** gathers that context and, when I ask, has the model rank it all down to one best action — with the "why" attached.
4. I act, defer, or hit "that's not it." The outcome is recorded and shapes the next decision.
5. **Memory** is where I keep it honest — everything it thinks it knows, editable.

The slow part is the local model (a fresh decision is ~15–20s on my card), so none of this happens during a page render. The screen paints instantly and the thinking happens in the background with the model kept warm between calls.

## Tests

```bash
npm test
```

The suite covers the parts I care about most: the provenance invariant (no inferred belief without evidence) and the crisis-safety layer.

## About the name

It's "LifeOS" because the aim is less a to-do list and more an operating system for figuring out what to do — one that gets more useful the longer it knows me, and, ideally, makes itself a little less necessary over time.
