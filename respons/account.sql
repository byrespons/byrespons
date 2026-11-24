create table if not exists public.bokprosjekter (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now()
);

create index if not exists bokprosjekter_owner_updated
  on public.bokprosjekter (owner_id, updated_at desc);

alter table public.bokprosjekter enable row level security;
revoke all on public.bokprosjekter from anon, authenticated, public;
grant select, insert, update on public.bokprosjekter to authenticated;

create policy "Read own book projects" on public.bokprosjekter
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Create own book projects" on public.bokprosjekter
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own book projects" on public.bokprosjekter
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
