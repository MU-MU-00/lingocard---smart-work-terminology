<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1sfq-eBDGxpg1_Zj7sDISsT6RcDz8gDO4

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies: `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your API key (e.g. Doubao/豆包)
3. Run the app: `npm run dev`

## 连接 GitHub 做版本管理

在 Cursor 里把本地更改推送到 GitHub、用 GitHub 做版本管理：请按 **[GITHUB_SETUP.md](GITHUB_SETUP.md)** 中的步骤操作（安装 Git、创建仓库、连接并推送、日常提交与推送）。

## 分享网页 + 手机使用 + 数据不丢失

- **不配置 Supabase**：数据仅存浏览器 **localStorage**，同一网址下刷新不丢。
- **配置 Supabase**：数据存云端（免费额度），多设备、刷新都同步。  
按 **[DEPLOY.md](DEPLOY.md)** 配置 Supabase 并部署到 **GitHub Pages** 或 **Vercel**（均免费），即可用手机打开链接使用并持久保存数据。
