create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  timezone    text default 'UTC',
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "users_own_profile" on profiles
  for all using (auth.uid() = id);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();