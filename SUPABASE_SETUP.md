# 使用 Supabase 云端存储（三步）

## 第一步：安装依赖

在 Cursor 终端里（先 `cd` 到项目根目录）：

```bash
npm install
```

若报错可改用：`npm.cmd install`

---

## 第二步：在 Supabase 建表和拿密钥

1. 打开 **https://supabase.com**，用 GitHub 登录 → **New project**。
2. 填项目名、数据库密码、选区域 → **Create**。
3. 左侧 **SQL Editor** → **New query**，粘贴下面整段 → **Run**：

```sql
create table if not exists public.groups (
  id text primary key,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

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

alter table public.groups enable row level security;
alter table public.terms enable row level security;
create policy "Allow all for groups" on public.groups for all using (true) with check (true);
create policy "Allow all for terms" on public.terms for all using (true) with check (true);
```

4. 左侧 **Project Settings** → **API**，复制：
   - **Project URL**
   - **anon public** key

---

## 第三步：填到项目里

打开项目根目录的 **`.env.local`**，把上面两个值填进去（不要加引号）：

```env
VITE_SUPABASE_URL=https://你的项目id.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon公钥
```

保存后，重启开发服务器（终端里 Ctrl+C 停掉，再执行 `npm run dev` 或 `npm.cmd run dev`）。

之后添加的术语和分组会自动同步到 Supabase，刷新或换设备打开同一链接都能看到。
