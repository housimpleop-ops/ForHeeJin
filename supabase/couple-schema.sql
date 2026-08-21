-- ============================================================
-- 계획하는 사이 — Supabase 스키마
-- 사용법: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- 여러 번 실행해도 안전하게 작성됨.
-- ============================================================

-- 1) 데이터 테이블: 한 행(id='main')에 앱 데이터 전체(jsonb)
create table if not exists public.couple_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.couple_state enable row level security;

-- 로그인한 사람만 읽고 쓸 수 있음 (우리 둘만 계정을 만들 것)
drop policy if exists "couple read"   on public.couple_state;
drop policy if exists "couple insert" on public.couple_state;
drop policy if exists "couple update" on public.couple_state;
create policy "couple read"   on public.couple_state for select to authenticated using (true);
create policy "couple insert" on public.couple_state for insert to authenticated with check (true);
create policy "couple update" on public.couple_state for update to authenticated using (true);

-- 2) 실시간(한쪽이 저장하면 다른 쪽 화면이 바로 갱신)
do $$
begin
  alter publication supabase_realtime add table public.couple_state;
exception when duplicate_object then null;
end $$;

-- 3) 사진·음성·영상 저장소 (public: 링크를 아는 사람만 볼 수 있는 공개 버킷)
insert into storage.buckets (id, name, public)
values ('couple-media', 'couple-media', true)
on conflict (id) do nothing;

drop policy if exists "couple media read"   on storage.objects;
drop policy if exists "couple media insert" on storage.objects;
drop policy if exists "couple media update" on storage.objects;
drop policy if exists "couple media delete" on storage.objects;
create policy "couple media read"   on storage.objects for select using (bucket_id = 'couple-media');
create policy "couple media insert" on storage.objects for insert to authenticated with check (bucket_id = 'couple-media');
create policy "couple media update" on storage.objects for update to authenticated using (bucket_id = 'couple-media');
create policy "couple media delete" on storage.objects for delete to authenticated using (bucket_id = 'couple-media');
