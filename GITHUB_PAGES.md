# 用 GitHub Pages 部署（手机直接打开链接）

已为你加好自动部署：推送到 **main** 后会自动构建并发布到 GitHub Pages。

---

## 一、在仓库里配置密钥（只做一次）

1. 打开你的 **GitHub 仓库**（lingocard 那个）→ **Settings** → 左侧 **Secrets and variables** → **Actions**。
2. 点 **New repository secret**，依次添加三个 secret（**Name** 必须一致，**Value** 从本地的 `.env.local` 里复制）：

   | Name | Value（从 .env.local 复制） |
   |------|-----------------------------|
   | `GEMINI_API_KEY` | 你的豆包 API 密钥 |
   | `VITE_SUPABASE_URL` | 你的 Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | 你的 Supabase anon 公钥 |

3. 保存后不要改 Name，否则构建会拿不到环境变量。

---

## 二、开启 GitHub Pages（只做一次）

1. 同一仓库 **Settings** → 左侧 **Pages**。
2. 在 **Build and deployment** 里：
   - **Source** 选 **GitHub Actions**（不要选 Deploy from a branch）。
3. 保存。

---

## 三、触发部署

1. 在 **GitHub Desktop** 里：把当前改动 **Commit to main** → **Push origin**。
2. 打开 GitHub 网页 → 仓库 → 顶部 **Actions**，会看到一次 **Deploy to GitHub Pages** 在跑。
3. 等状态变成绿色 ✓（约 1～2 分钟）。

---

## 四、你的访问地址

部署成功后：

- 打开 **Settings** → **Pages**，页面里会写你的站点地址；
- 一般是：**`https://你的用户名.github.io/仓库名/`**

例如仓库名是 `lingocard---smart-work-terminology`，地址就是：

**`https://你的GitHub用户名.github.io/lingocard---smart-work-terminology/`**

用**手机浏览器打开这个链接**即可使用；可「添加到主屏幕」当 App 用。数据在 Supabase，换设备也能看到。

---

## 五、之后更新

改完代码 → GitHub Desktop **Commit** → **Push** → 等 Actions 再跑完（约 1～2 分钟），同一链接会自动变成新版本，无需重新配置。
