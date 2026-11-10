-- Kartlık için Supabase şeması.
-- Supabase panelinde SQL Editor > New query içine yapıştırıp "Run" ile çalıştır.

create table if not exists public.sets (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  source      text,
  cards       jsonb not null default '[]'::jsonb,
  best        real,
  updated_at  timestamptz not null default now()
);

create index if not exists sets_user_id_idx on public.sets (user_id);

-- Satır düzeyinde güvenlik: herkes yalnızca kendi setlerini görür ve değiştirir.
alter table public.sets enable row level security;

drop policy if exists "Kendi setlerini oku" on public.sets;
create policy "Kendi setlerini oku" on public.sets
  for select using (auth.uid() = user_id);

drop policy if exists "Kendi setini ekle" on public.sets;
create policy "Kendi setini ekle" on public.sets
  for insert with check (auth.uid() = user_id);

drop policy if exists "Kendi setini güncelle" on public.sets;
create policy "Kendi setini güncelle" on public.sets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Kendi setini sil" on public.sets;
create policy "Kendi setini sil" on public.sets
  for delete using (auth.uid() = user_id);
