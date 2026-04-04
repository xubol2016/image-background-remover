# BgRemover 图片背景移除工具

基于 Next.js + Tailwind CSS + Remove.bg API 开发的在线图片背景移除工具。

## 快速开始

```bash
cd my-app
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 添加 REMOVE_BG_API_KEY

npm run dev
```

访问 http://localhost:3000

## 部署到 Vercel

1. 在 Vercel Dashboard 创建新项目
2. 导入代码仓库
3. 设置环境变量 `REMOVE_BG_API_KEY`
4. 点击 Deploy

详细说明见 [my-app/README.md](my-app/README.md)

## 项目结构

```
my-app/
├── app/
│   ├── api/remove-bg/route.ts    # API 路由
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
├── .env.local.example            # 环境变量示例
├── next.config.js                # Next.js 配置
├── tailwind.config.js            # Tailwind 配置
└── package.json
```

## 功能特性

- ✅ 图片上传（拖拽 + 点击选择）
- ✅ 背景移除 API 调用
- ✅ 左右对比预览
- ✅ 下载透明背景 PNG
- ✅ 格式验证（JPG、PNG，最大10MB）
- ✅ 加载状态和错误提示
- ✅ 响应式适配

## 技术栈

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Remove.bg API
