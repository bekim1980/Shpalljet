create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  from_city text not null,
  to_city text not null,
  departure_time timestamptz not null,
  price numeric,
  seats_total integer not null default 1,
  seats_available integer not null default 1,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rides enable row level security;

create policy "Anyone can view active rides"
on public.rides
for select
using (status = 'active');

create policy "Users can view own rides"
on public.rides
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own rides"
on public.rides
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own rides"
on public.rides
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own rides"
on public.rides
for delete
to authenticated
using (auth.uid() = user_id);

create trigger update_rides_updated_at
before update on public.rides
for each row execute function public.update_updated_at_column();

create index if not exists idx_rides_departure_time on public.rides(departure_time);
create index if not exists idx_rides_status on public.rides(status);

alter publication supabase_realtime add table public.rides;