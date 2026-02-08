# LingoCard 项目 - 初始化 Git 并首次提交（若已配置远程则推送）
# 用法：在项目根目录用 PowerShell 或 Git Bash 运行此脚本；或在 GitHub Desktop 添加本文件夹后直接提交、发布。

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== 1. 检查 Git ===" -ForegroundColor Cyan
try {
    $v = git --version
    Write-Host $v
} catch {
    Write-Host "未检测到 Git。请先安装 Git 或使用 GitHub Desktop 添加本仓库后提交、发布。" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 2. 初始化仓库（若尚未初始化）===" -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
    Write-Host "已执行 git init，当前分支 main。"
} else {
    Write-Host "已是 Git 仓库，跳过 init。"
}

Write-Host "`n=== 3. 添加所有文件并提交 ===" -ForegroundColor Cyan
git add .
$status = git status --short
if (-not $status) {
    Write-Host "没有需要提交的更改。"
} else {
    git commit -m "Initial commit: LingoCard project"
    Write-Host "已创建首次提交。"
}

Write-Host "`n=== 4. 远程与推送 ===" -ForegroundColor Cyan
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "当前远程: $remote"
    Write-Host "正在推送到 origin main..."
    git push -u origin main
    Write-Host "完成。"
} else {
    Write-Host "尚未添加远程。请先在 GitHub 创建仓库，然后执行：" -ForegroundColor Yellow
    Write-Host '  git remote add origin https://github.com/你的用户名/仓库名.git'
    Write-Host "  git push -u origin main"
}

Write-Host "`n全部步骤已执行完毕。" -ForegroundColor Green
