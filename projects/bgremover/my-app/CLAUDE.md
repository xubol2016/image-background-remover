# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BgRemover is an online image background removal tool. Users upload images (drag-and-drop or click), backgrounds are removed via the Remove.bg API, and results are downloaded as transparent PNGs. All UI text is in Chinese (Simplified, `zh-CN`).

## Commands

- `npm run dev` — Start dev server (listens on 0.0.0.0:3000)
- `npm run build` — Static export to `out/` directory
- `npm run lint` — ESLint with Next.js config
- `npm start` — Start production server (local only; production uses Cloudflare Pages)

## Architecture

**Frontend:** Next.js 14 App Router with static export (`output: 'export'`), React 18, TypeScript (strict), Tailwind CSS.

**Backend:** Cloudflare Pages Functions (in `functions/`) — these are NOT Next.js API routes. They run as Cloudflare Workers and access environment via `context.env`.

**Deployment:** Static files exported to `out/`, served by Cloudflare Pages. Functions deployed alongside. CI/CD via GitHub Actions (`.github/workflows/deploy.yml`). Node.js pinned to v18 (`.node-version`).

### Key directories

- `app/` — Next.js App Router: `page.tsx` (main page, client component), `layout.tsx` (root layout, server component), `components/`, `context/`
- `functions/api/` — Cloudflare Workers endpoints: `remove-bg.ts`, `auth/google.ts`, `auth/me.ts`, `auth/logout.ts`

### Authentication flow

Google OAuth 2.0 → frontend sends Google ID token to `/api/auth/google` → backend verifies JWT using `jose` library against Google JWKS → creates session (UUID) stored in Cloudflare KV (`BGREMOVER_KV`, 7-day TTL) → token stored in `localStorage` as `auth_token` → subsequent requests use `Authorization: Bearer <token>` header.

Auth state managed via React Context (`app/context/AuthContext.tsx`).

### Image processing flow

Client validates file (JPEG/PNG, max 10MB) → POST FormData to `/api/remove-bg` → Worker calls Remove.bg API with `REMOVE_BG_API_KEY` → returns PNG blob → client shows before/after preview with checkerboard background.

## Environment Variables

- `REMOVE_BG_API_KEY` — Remove.bg API key (server-side, Cloudflare secret)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth client ID (exposed to client)
- `GOOGLE_CLIENT_ID` — Same Google client ID accessed server-side in Workers as `context.env.GOOGLE_CLIENT_ID`

Template: `.env.local.example`. Cloudflare-side secrets set via dashboard or `wrangler secret`.

## Important Notes

- Path alias `@/*` maps to project root (tsconfig)
- Images are unoptimized (`next.config.js`) — required for static export
- Cloudflare KV namespace `BGREMOVER_KV` is used for session storage
- Tailwind has a custom purple/violet primary color palette and custom animations (`pulse-slow`, `bounce-slow`)
