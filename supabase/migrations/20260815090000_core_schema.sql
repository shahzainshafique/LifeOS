-- LifeOS core schema (Slice 0): the provenance-first domain spine.
--
-- Design laws enforced here + in lib/db:
--   * `entries` is an append-only episodic log (the immutable source of truth).
--   * `memory_items` are typed, derived beliefs. Every non-`fact` belief MUST cite
--     >= 1 `evidence` row (enforced in the repository layer).
--   * Status transitions are reversible (the system can change its mind with history).
--   * RLS scopes every row to its owner (single-user today, multi-user ready).

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------------
create type memory_type as enum (
  'fact','observation','inference','hypothesis','preference',
  'value','strength','challenge','goal','commitment'
);
create type memory_status as enum ('active','superseded','refuted','archived');
create type evidence_polarity as enum ('support','contradict');
create type life_state as enum (
  'focused','normal','low_energy','overwhelmed','restless','reflective','motivated','uncertain'
);
create type entry_role as enum ('user','assistant','system');
create type thread_status as enum ('open','dormant','closed');
create type action_energy as enum ('low','med','high');
create type action_status as enum ('suggested','active','done','dismissed');

-- ---------------------------------------------------------------------------
-- entries — append-only episodic log
-- ---------------------------------------------------------------------------
create table entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  ts         timestamptz not null default now(),
  role       entry_role not null default 'user',
  modality   text not null default 'text',
  content    text not null,
  session_id uuid,
  embedding  vector(768)   -- matches nomic-embed-text (LLM_EMBED_DIM)
);
create index entries_user_ts_idx on entries (user_id, ts desc);
-- HNSW works on an empty table (unlike ivfflat). Cosine distance for text embeddings.
create index entries_embedding_idx on entries using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- memory_items — typed derived knowledge (beliefs)
-- ---------------------------------------------------------------------------
create table memory_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          memory_type not null,
  content       text not null,
  subject       text,
  status        memory_status not null default 'active',
  confidence    real not null default 0.5 check (confidence >= 0 and confidence <= 1),
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  superseded_by uuid references memory_items(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index memory_items_user_idx on memory_items (user_id, status, type);

-- ---------------------------------------------------------------------------
-- evidence — the provenance spine (belief <-> supporting/contradicting source)
-- ---------------------------------------------------------------------------
create table evidence (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  memory_item_id uuid not null references memory_items(id) on delete cascade,
  source_type    text not null default 'entry',   -- 'entry' | later: 'outcome' | 'research_finding'
  source_id      uuid not null,
  polarity       evidence_polarity not null default 'support',
  weight         real not null default 1.0,
  ts             timestamptz not null default now()
);
create index evidence_memory_idx on evidence (memory_item_id);
create index evidence_user_idx on evidence (user_id);

-- ---------------------------------------------------------------------------
-- threads — open loops / topics / projects
-- ---------------------------------------------------------------------------
create table threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  status          thread_status not null default 'open',
  priority_signal real not null default 0,
  last_touched    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index threads_user_idx on threads (user_id, status, last_touched desc);

-- ---------------------------------------------------------------------------
-- next_actions — concrete actionables
-- ---------------------------------------------------------------------------
create table next_actions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  thread_id           uuid references threads(id) on delete set null,
  title               text not null,
  first_physical_step text,
  energy_cost         action_energy not null default 'med',
  status              action_status not null default 'suggested',
  created_from        uuid,   -- provenance: entry or recommendation id
  created_at          timestamptz not null default now()
);
create index next_actions_user_idx on next_actions (user_id, status);

-- ---------------------------------------------------------------------------
-- state_log — self-declared state chips
-- ---------------------------------------------------------------------------
create table state_log (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ts      timestamptz not null default now(),
  state   life_state not null,
  note    text
);
create index state_log_user_ts_idx on state_log (user_id, ts desc);

-- ---------------------------------------------------------------------------
-- recommendations — closes the loop (proposed -> chosen -> outcome)
-- ---------------------------------------------------------------------------
create table recommendations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  ts              timestamptz not null default now(),
  action_id       uuid references next_actions(id) on delete set null,
  rationale       text,
  provenance_refs jsonb not null default '[]',
  chosen          boolean,
  feedback        text,        -- 'helpful' | 'not_now' | 'wrong' | ...
  outcome         text,
  outcome_ts      timestamptz
);
create index recommendations_user_ts_idx on recommendations (user_id, ts desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — every table scoped to its owner
-- ---------------------------------------------------------------------------
alter table entries         enable row level security;
alter table memory_items    enable row level security;
alter table evidence        enable row level security;
alter table threads         enable row level security;
alter table next_actions    enable row level security;
alter table state_log       enable row level security;
alter table recommendations enable row level security;

create policy "entries_own"         on entries         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "memory_items_own"    on memory_items    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "evidence_own"        on evidence        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "threads_own"         on threads         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "next_actions_own"    on next_actions    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "state_log_own"       on state_log       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recommendations_own" on recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Data API role grants. Supabase's default does NOT auto-expose new public
-- tables, so we grant explicitly. RLS above still restricts rows per user; the
-- `authenticated` role only ever sees its own. `service_role` (the worker)
-- bypasses RLS but still needs table privileges.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  entries, memory_items, evidence, threads, next_actions, state_log, recommendations
  to authenticated, service_role;
