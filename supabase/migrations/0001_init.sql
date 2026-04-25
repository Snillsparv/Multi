-- Schema for the multiplikation app

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  mode text check (mode in ('kid', 'adult')) default 'kid',
  onboarded boolean default false,
  created_at timestamptz default now()
);

create table if not exists fact_mastery (
  user_id uuid references profiles(id) on delete cascade,
  a smallint not null check (a between 1 and 10),
  b smallint not null check (b between 1 and 10),
  box smallint default 1 check (box between 1 and 5),
  correct_count int default 0,
  wrong_count int default 0,
  avg_response_ms int,
  last_seen_at timestamptz,
  next_due_at timestamptz default now(),
  primary key (user_id, a, b)
);

create index if not exists fact_mastery_due_idx
  on fact_mastery (user_id, next_due_at, box);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  mode text check (mode in ('diagnostic', 'practice', 'flow')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  total_questions int default 0,
  correct_count int default 0
);

create index if not exists sessions_user_idx on sessions (user_id, started_at desc);

create table if not exists attempts (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  a smallint not null,
  b smallint not null,
  given_answer int,
  correct boolean not null,
  response_ms int not null,
  answered_at timestamptz default now()
);

create index if not exists attempts_user_idx on attempts (user_id, answered_at desc);
create index if not exists attempts_session_idx on attempts (session_id);

create table if not exists streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_practice_date date
);

-- Row Level Security
alter table profiles enable row level security;
alter table fact_mastery enable row level security;
alter table sessions enable row level security;
alter table attempts enable row level security;
alter table streaks enable row level security;

-- profiles: user owns their own row (id = auth.uid())
drop policy if exists "profiles self select" on profiles;
create policy "profiles self select" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self insert" on profiles;
create policy "profiles self insert" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles
  for update using (auth.uid() = id);

-- helper macro for the user_id-keyed tables
do $$
declare
  t text;
begin
  foreach t in array array['fact_mastery', 'sessions', 'attempts', 'streaks']
  loop
    execute format('drop policy if exists "%s self all" on %I', t, t);
    execute format(
      'create policy "%s self all" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end$$;

-- Auto-create a profile + 100 fact_mastery rows + streak when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;

  insert into public.fact_mastery (user_id, a, b)
  select new.id, a, b
  from generate_series(1, 10) as a, generate_series(1, 10) as b
  on conflict do nothing;

  insert into public.streaks (user_id) values (new.id) on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
