# 将项目连接到 GitHub 并做版本管理

按下面步骤操作后，你可以在 Cursor 里直接提交并推送到 GitHub，用 GitHub 做版本管理和备份。

---

## 一、安装 Git（若尚未安装）

1. 打开 **https://git-scm.com/download/win** 下载 Windows 版 Git。
2. 安装时保持默认选项即可（可勾选 “Add Git to PATH”）。
3. 安装完成后**关闭并重新打开 Cursor**，再打开终端。

在终端中验证是否安装成功：

```bash
git --version
```

若显示版本号（如 `git version 2.43.0`）即表示安装成功。

---

## 二、在 GitHub 上创建仓库

1. 登录 **https://github.com**。
2. 右上角点击 **“+”** → **“New repository”**。
3. 填写：
   - **Repository name**：例如 `lingocard-smart-work-terminology`（或你喜欢的名字）。
   - **Description**（可选）：例如 “LingoCard 术语学习应用”。
   - 选择 **Public**。
   - **不要**勾选 “Add a README file”（本地已有项目）。
4. 点击 **“Create repository”**。
5. 创建完成后，记下仓库地址，形如：
   - `https://github.com/你的用户名/仓库名.git`
   - 或 `git@github.com:你的用户名/仓库名.git`

---

## 三、在 Cursor 里连接并首次推送到 GitHub

在 Cursor 中按 **Ctrl + `** 打开终端，在项目目录下依次执行（把下面的仓库地址换成你自己的）：

```bash
# 1. 进入项目目录（若已在项目根目录可省略）
cd "C:\Users\lenovo\Downloads\lingocard---smart-work-terminology"

# 2. 若尚未初始化 Git，执行（若已初始化会提示已有 .git）
git init

# 3. 添加远程仓库（替换为你的 GitHub 仓库地址）
git remote add origin https://github.com/你的用户名/仓库名.git

# 4. 查看当前文件状态
git status

# 5. 添加所有文件（.gitignore 会排除 node_modules、.env.local 等）
git add .

# 6. 第一次提交
git commit -m "Initial commit: LingoCard project"

# 7. 推送到 GitHub（主分支名为 main 或 master，按你仓库默认分支）
git branch -M main
git push -u origin main
```

若使用 **HTTPS**，第一次 `git push` 时可能会提示登录 GitHub（浏览器弹出或用户名/密码）。  
若使用 **SSH**，需先在 GitHub 添加 SSH 公钥，再用 `git@github.com:用户名/仓库名.git` 作为 `origin`。

---

## 四、日常在 Cursor 里提交并推送到 GitHub

本地改完代码后，在 Cursor 里任选一种方式即可。

### 方式 A：用 Cursor 图形界面（推荐）

1. 左侧点击 **“源代码管理”** 图标（或 **Ctrl + Shift + G**）。
2. 在 **“更改”** 里看到修改的文件，在 **“消息”** 框输入本次修改说明（如 `优化触屏适配`）。
3. 点击 **“提交”**（✓）完成本地提交。
4. 再点击 **“同步更改”** 或 **“推送”**，把提交推送到 GitHub。

### 方式 B：用终端命令

在项目根目录下执行：

```bash
git add .
git commit -m "这里写本次修改的简短说明"
git push
```

之后每次改完代码，重复上述步骤即可由 GitHub 做版本管理。

---

## 五、其他常用操作

| 目的           | 命令或操作 |
|----------------|------------|
| 查看提交历史   | `git log --oneline` 或 Cursor 源代码管理里点提交记录 |
| 拉取他人/别处更新 | `git pull` 或 点击 “拉取” |
| 查看远程地址   | `git remote -v` |
| 更换远程地址   | `git remote set-url origin 新地址` |

---

## 六、重要说明

- **`.env.local` 不会上传**：已在 `.gitignore` 中忽略，API 密钥只保留在本地，不会推到 GitHub。
- **首次推送若失败**：检查是否已安装 Git、是否已 `git init`、`origin` 地址是否正确、网络是否正常；若用 HTTPS，需能登录 GitHub。
- **与 GitHub 的“其他联通”**：连上后你可以：
  - 在 GitHub 网页上查看/对比代码、看提交历史；
  - 用 GitHub Actions 做 CI/CD（可选）；
  - 克隆到其他电脑或分享给他人协作。

按顺序完成 **一 → 二 → 三** 后，就可以在 Cursor 里直接提交并推送到 GitHub，用 GitHub 做版本管理。
