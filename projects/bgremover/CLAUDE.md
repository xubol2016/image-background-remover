# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BgRemover is an online image background removal tool. Users upload images (drag-and-drop or click), backgrounds are removed via the Remove.bg API, and results are downloaded as transparent PNGs. All UI text is in Chinese (Simplified, `zh-CN`). Error messages from the backend are also in Chinese.

## Commands

- `npm run dev` — Start Next.js dev server (listens on 0.0.0.0:3000). **Frontend only** — Cloudflare Functions won't run. Use `npx wrangler pages dev out/` after `npm run build` to test functions locally.
- `npm run build` — Static export to `out/` directory
- `npm run lint` — ESLint with Next.js config
- No test suite exists in this project.

## Architecture

**Frontend:** Next.js 14 App Router with static export (`output: 'export'`), React 18, TypeScript (strict), Tailwind CSS.

**Backend:** Cloudflare Pages Functions (in `functions/`) — these are NOT Next.js API routes. They run as Cloudflare Workers and access environment via `context.env`. Each file exports `onRequestGet`/`onRequestPost`/`onRequestPut` handlers typed as `PagesFunction<Env>`. Each function file declares its own `Env` interface listing only the bindings it needs (e.g., `BGREMOVER_KV`, `REMOVE_BG_API_KEY`).

**Deployment:** Static files exported to `out/`, served by Cloudflare Pages. Functions deployed alongside. CI/CD via GitHub Actions. Node.js pinned to v20 (`.node-version`).

### Key directories

- `app/` — Next.js App Router pages (`page.tsx`, `pricing/page.tsx`, `profile/page.tsx`), `components/`, `context/`
- `functions/api/` — Cloudflare Workers endpoints organized by domain: `auth/`, `user/`, `credits/`, `payment/`, `remove-bg.ts`
- `functions/api/user/_utils.ts` — Shared utilities for authentication, quota management, and profile operations (imported by multiple endpoints via relative paths, e.g., `import { authenticateRequest } from './user/_utils'`)

### Authentication flow

Google OAuth 2.0 → frontend sends Google ID token to `/api/auth/google` → backend verifies JWT using `jose` library against Google JWKS → calls `initUserData()` to set up profile & quota → creates session (UUID) stored in Cloudflare KV (`BGREMOVER_KV`, 7-day TTL) → token stored in `localStorage` as `auth_token` → subsequent requests use `Authorization: Bearer <token>` header.

Auth state managed via React Context (`app/context/AuthContext.tsx`). Authentication helper `authenticateRequest()` in `_utils.ts` validates tokens for protected endpoints.

### Image processing flow

Client validates file (JPEG/PNG, max 10MB) → POST FormData to `/api/remove-bg` → Worker checks auth & quota → calls Remove.bg API with `REMOVE_BG_API_KEY` → deducts quota (subscription quota first, then credits) → returns PNG blob → client shows before/after preview with checkerboard background.

### Quota & credits system

- **Guest users** (IP-based): 2 images lifetime, stored 30 days in KV as `guest:{clientIP}`
- **Free tier**: 3 images signup bonus (one-time, no monthly reset)
- **Pro tier**: 50 images/month, resets on 1st of next month
- **Enterprise tier**: 200 images/month, resets on 1st of next month
- **Credits**: Purchased separately via Stripe, 1 credit = 1 image, never expire. Credit functions exported from `functions/api/credits/balance.ts` are imported by `remove-bg.ts`.
- KV keys: `user:{userId}`, `quota:{userId}`, `credits:{userId}`, `session:{token}`, `guest:{clientIP}`

### Payments

Stripe integration for subscriptions and credit packs. Endpoints in `functions/api/payment/` and `functions/api/credits/`. Stripe secret key accessed via `context.env.STRIPE_SECRET_KEY`.

## Environment Variables

- `REMOVE_BG_API_KEY` — Remove.bg API key (server-side, Cloudflare secret)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth client ID (exposed to client via `next.config.js` `env` block)
- `GOOGLE_CLIENT_ID` — Same Google client ID accessed server-side in Workers as `context.env.GOOGLE_CLIENT_ID`
- `STRIPE_SECRET_KEY` — Stripe API secret key (server-side, Cloudflare secret)

Template: `.env.local.example` (only has `REMOVE_BG_API_KEY` and `GOOGLE_CLIENT_ID`). Cloudflare-side secrets set via dashboard or `wrangler secret`.

## Important Notes

- Path alias `@/*` maps to project root (tsconfig)
- Images are unoptimized (`next.config.js`) — required for static export
- Cloudflare KV namespace `BGREMOVER_KV` is used for session, quota, credit, and profile storage
- Tailwind has a custom purple/violet primary color palette (`primary-50` through `primary-900`) and custom animations (`pulse-slow`, `bounce-slow`)
- `functions/` is excluded from TypeScript compilation in `tsconfig.json` — Cloudflare builds these separately
- The main page (`app/page.tsx`) is a `'use client'` component — it handles upload, processing, quota display, and the quota-exhausted modal all in one file
