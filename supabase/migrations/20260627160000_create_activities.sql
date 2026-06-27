create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id text not null,
  route_name text not null,
  region text not null,
  route_type text not null,
  distance_km numeric not null,
  duration_seconds integer not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  start_lat double precision not null,
  start_lng double precision not null,
  end_lat double precision not null,
  end_lng double precision not null,
  route_map_url text not null,
  directions_url text not null,
  route_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "Users can read their own activities"
  on public.activities
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own activities"
  on public.activities
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own activities"
  on public.activities
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own activities"
  on public.activities
  for delete
  using (auth.uid() = user_id);
