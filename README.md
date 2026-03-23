# BgRemover - 图片背景移除工具

基于 Next.js + Tailwind CSS 开发的在线图片背景移除工具。

## 功能特性

- 🖼️ 拖拽/点击上传图片
- ✨ 自动移除背景（使用 Remove.bg API）
- 🔄 左右对比预览
- 💾 下载透明背景 PNG
- 📱 响应式设计

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Remove.bg API

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 部署

本项目使用 GitHub Actions 自动部署到 Cloudflare Pages。

### 配置步骤

1. **Fork/Clone 本仓库到 GitHub**

2. **在 GitHub 仓库设置 Secrets**：
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加以下 Secrets：
     - `CLOUDFLARE_API_TOKEN`: 你的 Cloudflare API Token
     - `REMOVE_BG_API_KEY`: 你的 Remove.bg API Key

3. **在 Cloudflare Dashboard 创建 Pages 项目**：
   - 进入 Cloudflare Dashboard → Pages
   - 点击 "Create a project"
   - 选择 "Connect to Git"
   - 授权 GitHub 并选择本仓库
   - 框架预设选择 "Next.js"
   - 环境变量添加：`REMOVE_BG_API_KEY`

4. **推送代码到 main 分支**，自动触发部署

## 获取 API Key

- **Remove.bg**: https://www.remove.bg/api (每月 50 次免费)
- **Cloudflare**: https://dash.cloudflare.com/profile/api-tokens

## License

MIT
# Deployment trigger - Mon Mar 23 11:49:10 PM CST 2026
