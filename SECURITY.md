# Security

GEET treats auth, access control, and secrets as first-class concerns. This document describes what is implemented, what is assumed, and what to harden before public launch.

## 1. Authentication

- **Provider:** Auth.js v5 (`next-auth@beta`) with `PrismaAdapter` — `src/auth.ts:26`.
- **Strategies:**
  - **Credentials** — email + password via `Credentials` provider (`src/auth.ts:34`). Zod validates input (`credentialsSchema` at `src/auth.ts:9`: email max 190, password 8–128).
  - **Google OAuth** — optional, gated on `AUTH_GOOGLE_ID/SECRET` (`src/auth.ts:14`). `allowDangerousEmailAccountLinking: true` links Google to existing email.
- **Password hashing:** `bcryptjs` cost factor **12** on signup (`src/app/api/auth/signup/route.ts:28`) and verified via `bcrypt.compare` in `authorize` (`src/auth.ts:50`).
- **Session:** JWT strategy (`src/auth.ts:27`). Callbacks `jwt` (`src/auth.ts:64`) and `session` (`src/auth.ts:71`) propagate `id` and `role` (`user`/`admin`). No database session lookup per request.
- **Secret:** `AUTH_SECRET` signs/encrypts JWTs (`src/auth.ts:25`). Generate with `openssl rand -base64 32` (see `.env.example`).

## 2. Route Protection — Proxy

`src/proxy.ts:10` replaces legacy `middleware.ts` (Next 16 convention).

- Skips `isPublicStaticAsset` and all `/api` paths (`src/proxy.ts:16`).
- `/` — authed → `/app`, else public.
- `/login`, `/signup` — authed → `/app`.
- `/app`, `/admin` — unauthenticated → `/login?callbackUrl=…`.
- `/admin` — additionally checks `session.user.role !== "admin"` → redirect to `/app`.

The proxy reads the JWT edge-side (`req.auth`) without DB. Server components/routes re-verify via `auth()` / `requireUser()` (`src/lib/auth-helpers.ts:3`) — defense in depth.

## 3. RBAC & Banned Users

- **Roles:** `User.role` defaults to `"user"` (`prisma/schema.prisma:22`); seed creates one `admin` (`prisma/seed.ts:232`).
- **Admin guard:** proxy (`src/proxy.ts:48`) + per-route `requireAdmin()` (`src/lib/auth-helpers.ts:11`) + layout check.
- **Ban:** `User.bannedAt` (`prisma/schema.prisma:23`). `authorize` returns `null` if `bannedAt` is set (`src/auth.ts:48`) — banned users cannot obtain a new JWT. Existing JWTs remain valid until expiry; for immediate revocation, rotate `AUTH_SECRET` or add a DB check in the `jwt` callback.
- **Signup:** `src/app/api/auth/signup/route.ts:23` checks duplicate email (`409`), normalizes to lowercase, trims display name.

## 4. Rate Limiting & Abuse

No in-app rate limiter is shipped. Harden before production:

- Add `@upstash/ratelimit` or Vercel WAF on `/api/auth/*`, `/api/youtube/intake`, `/api/search`.
- YouTube Data API has its own quota handling (`src/lib/youtube/data-api.ts:147` → `quotaExceeded`/`rate-limit` errors).
- Consider CAPTCHA on signup if abused.

## 5. XSS / CSRF / Headers

- **XSS:** React escapes by default. No `dangerouslySetInnerHTML`. User content (playlist names, bios) rendered as text.
- **CSRF:** Auth.js handles CSRF tokens for auth routes. Mutating API routes require an authenticated session; no cookie-only state changes without `requireUser()`.
- **Security headers:** `next.config.ts:17` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `HSTS`.
- **Images:** `next.config.ts:6` restricts remote patterns to `i.ytimg.com` / `img.youtube.com` only.

## 6. Secrets Handling

- `.env` is gitignored; `.env.example` ships placeholders only.
- Required: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`. Optional: `YOUTUBE_API_KEY`, `AUTH_GOOGLE_ID/SECRET`.
- On Vercel, set via dashboard → Environment Variables (per environment). Never log `AUTH_SECRET` or `DATABASE_URL`.
- `YOUTUBE_API_KEY` should be restricted in Google Cloud Console to YouTube Data API v3 + HTTP referrer/IP allow-list.

## 7. Data & Privacy

- `bannedAt` soft-blocks without deleting data (GDPR-friendly; add hard-delete flow if required).
- `VerificationToken` (`prisma/schema.prisma:87`) exists for future email verification.
- `Report` model (`prisma/schema.prisma:387`) supports abuse reporting.
- Prisma `onDelete: Cascade` is scoped to owned data; shared catalog (Track/Artist) is never cascade-deleted by user deletion unless desired.

## 8. Checklist Before Launch

- [ ] Rotate `AUTH_SECRET` and set strong value in prod.
- [ ] Restrict `YOUTUBE_API_KEY` in GCP.
- [ ] Add rate limiting on auth + intake endpoints.
- [ ] Consider `bannedAt` JWT revocation (DB check in `jwt` callback).
- [ ] Enable Vercel Analytics / logging for auth failures.
- [ ] Review `allowDangerousEmailAccountLinking` — disable if strict account separation needed.
