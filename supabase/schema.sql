-- 在 Supabase 控制台 SQL Editor 中执行此脚本，创建 groups 和 terms 表

-- 分组表
create table if not exists public.groups (
  id text primary key,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- 术语表
create table if not exists public.terms (
  id text primary key,
  term text not null,
  phonetic text default '',
  term_translation text,
  definition_en text default '',
  definition_cn text not null default '',
  example text default '',
  wrong_definitions jsonb default '[]'::jsonb,
  group_id text not null,
  created_at bigint not null,
  status text not null default 'new',
  next_review_date bigint not null,
  review_stage int not null default 0,
  consecutive_failures int not null default 0
);

-- 允许匿名读写（适合个人单用户使用；如需多用户请改用 RLS + auth）
alter table public.groups enable row level security;
alter table public.terms enable row level security;

create policy "Allow all for groups" on public.groups for all using (true) with check (true);
create policy "Allow all for terms" on public.terms for all using (true) with check (true);
