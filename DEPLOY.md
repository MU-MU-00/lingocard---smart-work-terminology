# 分享网页 + 手机使用 + 数据不丢失（Supabase 免费方案）

## 方案说明

- **数据存储**：用 **Supabase**（免费额度：500MB 数据库、50K 月活），术语和分组存在云端，刷新、换设备打开同一链接都能看到同一份数据；未配置 Supabase 时自动退化为浏览器 localStorage。
- **网页托管**：用 **GitHub Pages** 或 **Vercel 免费版** 部署前端，**全程 0 费用**。

---

## 一、创建 Supabase 项目并建表（约 5 分钟）

1. 打开 **https://supabase.com**，用 GitHub 登录，点击 **New project**。
2. 选组织、填项目名（如 `lingocard`）、设数据库密码，选区域后创建。
3. 进入项目 → 左侧 **SQL Editor** → **New query**，把下面整段粘贴进去，点 **Run**：

```sql
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

alter table public.groups enable row level security;
alter table public.terms enable row level security;
create policy "Allow all for groups" on public.groups for all using (true) with check (true);
create policy "Allow all for terms" on public.terms for all using (true) with check (true);
```

4. 左侧 **Project Settings** → **API**，记下：
   - **Project URL**（如 `https://xxxx.supabase.co`）
   - **anon public** key（一长串字符串）

---

## 二、本地 / 部署环境变量

在项目根目录的 **`.env.local`** 里增加（部署时在托管平台同样配置这两项）：

```env
# 豆包 API（生成术语用）
GEMINI_API_KEY=你的豆包API密钥

# Supabase（数据存云端，可选；不填则只用浏览器 localStorage）
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon公钥
```

- 不配 Supabase：只使用 localStorage，数据只在当前浏览器，刷新不丢。
- 配好 Supabase：数据写入 Supabase，同一链接下多设备、刷新都看到同一份数据。

---

## 三、部署前端（二选一，都免费）

### 方式 A：GitHub Pages

1. 仓库 **Settings** → **Pages** → Source 选 **GitHub Actions**。
2. 在仓库里新建 `.github/workflows/deploy.yml`（若没有），内容可为：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

3. 在仓库 **Settings** → **Secrets and variables** → **Actions** 里添加：
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 推代码后等 Actions 跑完，页面地址为：`https://你的用户名.github.io/仓库名/`。  
   Vite 需配置 `base: '/仓库名/'`，在 `vite.config.ts` 里加一行 `base: '/lingocard---smart-work-terminology/',`（或你的仓库名）。

### 方式 B：Vercel（推荐，配置最少）

1. 打开 **https://vercel.com**，用 GitHub 登录，**Add New** → **Project**，选本仓库。
2. **Environment Variables** 里添加：
   - `GEMINI_API_KEY` 或 `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 点 **Deploy**，完成后会得到 `https://xxx.vercel.app`。

---

## 四、在手机上用

- 用手机浏览器打开你部署好的地址（GitHub Pages 或 Vercel）。
- 若已配置 Supabase：数据在云端，换手机或刷新都不会丢。
- 可把该网页 **“添加到主屏幕”**，当 App 用。

---

## 五、小结

| 项目       | 说明 |
|------------|------|
| 费用       | Supabase + GitHub Pages / Vercel 均为免费额度，可 0 成本使用。 |
| 数据存哪   | 配了 Supabase → 存 Supabase；未配 → 存浏览器 localStorage。 |
| 刷新/换设备 | 用 Supabase 时，同一链接下刷新或换设备都能看到同一份数据。 |
| 建表       | 使用本文 **一** 中的 SQL 在 Supabase 执行一次即可；项目里 `supabase/schema.sql` 也有一份相同结构可参考。 |

这样就用 **Supabase 做免费云端存储**，配合免费前端托管，实现分享网页、手机使用、数据持久且不因刷新丢失。
