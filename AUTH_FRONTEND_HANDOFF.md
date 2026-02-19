# Frontend Auth Handoff (Login / Signup / Token)

This document is for frontend-agent onboarding.
Goal: start implementation without re-reading backend source.

## Path Resolution (important)

- This file is inside frontend repo: `/Users/hwanjinchoi/Documents/faddit/faddit-fe-v2`
- Backend repo root is: `/Users/hwanjinchoi/Documents/faddit/faddit_be`
- All `src/...` references in this document point to backend repo (`faddit_be/src/...`), not frontend `src/`.
- If an agent opens a terminal, set working directory to backend repo when checking backend references.

## 1) Runtime and Global Rules

- Base URL: `http://localhost:1004`
- Swagger URL: `http://localhost:1004/api`
- Global prefix/versioning: none
- CORS credentials: enabled (cookie-based refresh supported)
- Validation: global `ValidationPipe` with `whitelist: true`, `transform: true`
- Cookie parser: enabled

References:

- `src/main.ts`

## 2) Auth Model (important)

- Access token is used via `Authorization: Bearer <accessToken>` on protected APIs.
- Refresh token is stored in cookie key `refreshToken` (HttpOnly cookie).
- Guard behavior:
  - `@Public()` endpoints do not require access token.
  - Non-public endpoints require bearer access token.

References:

- `src/guards/auth.guard.ts`
- `src/decorators/public.decorator.ts`

## 3) Token Lifecycle (current backend)

- Sign-in:
  - verify user/password
  - issue refresh token + access token
  - set cookie `refreshToken`
  - return `accessToken`, `accessTokenExpiresAt`, `serverNow`
- Refresh:
  - read `req.cookies.refreshToken`
  - validate refresh token
  - rotate refresh token + reissue access token
  - reset cookie `refreshToken`
  - return `accessToken`, `accessTokenExpiresAt`, `serverNow`
- Sign-out:
  - clear token record in DB
  - clear cookie `refreshToken`

References:

- `src/user/user.controller.ts`
- `src/user/services/token.service.ts`

## 4) Reuse-Detection Logic (jti + family)

Refresh token payload now includes:

- `version`
- `family`
- `jti`

DB token state includes:

- `refresh_token`
- `refresh_token_version`
- `refresh_token_jti`
- `refresh_token_family`
- `refresh_token_expires_at`

Validation path:

1. Exact match (`token`, `version`, `jti`) -> valid
2. Not exact but same `family` -> treat as reuse detection, invalidate family and reject
3. Else -> reject

References:

- `src/user/services/token.service.ts`
- `src/user/entities/token.entity.ts`

## 5) Endpoint Contract (Frontend scope)

### 5.1 Email verification for signup

- `POST /user/email-verification` (Public)

  - body:
    - `email: string`
  - response: `204`

- `POST /user/check-verification-email` (Public)
  - body:
    - `email: string`
    - `code: number`
  - response: `200` with verification status payload

References:

- `src/user/controller/email-auth.controller.ts`

### 5.2 Signup / Signin / Refresh / Signout

- `POST /user/sign-up` (Public)

  - body:
    - `name: string`
    - `email: string`
    - `password: string` (strong password rule)
    - `serviceAgreement: boolean`
    - `userAgreement: boolean`
    - `marketingAgreement: boolean`
  - response:
    - `userId`, `name`, `profileImg`, `accessToken`, `accessTokenExpiresAt`

- `POST /user/sign-in` (Public)

  - body:
    - `email: string`
    - `password: string`
  - sets cookie:
    - `refreshToken` (`httpOnly: true`, `secure: true`, `sameSite: "lax"`, `maxAge: REFRESH_EXPIRE`)
  - response (main fields):
    - `accessToken`, `accessTokenExpiresAt`, `serverNow`
    - user profile fields + storage fields

- `POST /user/refresh` (Public)

  - request:
    - cookie `refreshToken` required
  - sets cookie:
    - `refreshToken` (`httpOnly: true`, `secure: true`, `sameSite: "none"`, `maxAge: REFRESH_EXPIRE`)
  - response:
    - `userId`, `accessToken`, `accessTokenExpiresAt`, `serverNow`

- `POST /user/sign-out` (Protected)
  - header:
    - `Authorization: Bearer <accessToken>`
  - body:
    - `userId: uuid`
  - response: `204`

References:

- `src/user/user.controller.ts`
- `src/user/dto/create-user.dto.ts`
- `src/user/dto/sign-in.dto.ts`
- `src/user/dto/refresh.dto.ts`
- `src/user/dto/sign-out.dto.ts`

### 5.3 Social login and social profile completion

- OAuth start/callback (Public):

  - `GET /oauth/google`, `GET /oauth/google/callback`
  - `GET /oauth/kakao`, `GET /oauth/kakao/callback`
  - `GET /oauth/naver`, `GET /oauth/naver/callback`

- Callback behavior:

  - if social user email is missing:
    - returns `sns_access_token`, `sns_access_token_expires_at`
  - else:
    - sets `refreshToken` cookie
    - returns `accessToken`, `accessTokenExpiresAt`, `serverNow`

- Social completion:
  - `PATCH /user/update-sns-user` (Public)
  - body:
    - `email`, `name`, `serviceAgreement`, `userAgreement`, `marketingAgreement`, `snsAccessToken`
  - response:
    - user fields + `accessToken`, `accessTokenExpiresAt`
  - also sets `refreshToken` cookie

References:

- `src/oauth/oauth.controller.ts`
- `src/user/user.controller.ts`
- `src/user/dto/update-user.dto.ts`

### 5.4 Password reset flow (auth-adjacent)

- `POST /user/request-reset-password` (Public)
  - body: `email`
  - response: `204`
- `POST /user/verification-reset-password` (Public)
  - body: `userId`, `passwordResetToken`
  - response: `204`
- `PATCH /user/update-password` (Public)
  - body: `userId`, `passwordResetToken`, `password`
  - response: `204`

References:

- `src/user/user.controller.ts`
- `src/user/services/token.service.ts`

## 6) Frontend Implementation Rules (must follow)

- Keep access token in memory (or controlled state), not in localStorage if avoidable.
- Always send credentials for refresh cookie path (`withCredentials: true` on refresh calls).
- For protected APIs, always attach bearer access token.
- Use proactive refresh:
  - schedule refresh before expiry using `accessTokenExpiresAt` and `serverNow`
  - recommended buffer: 60-120 seconds
- On `401` from protected API:
  - attempt one refresh
  - retry original request once
  - if refresh fails -> force logout and route to sign-in
- Prevent refresh stampede:
  - single-flight/mutex for concurrent refresh attempts

## 7) Known Backend Inconsistencies (frontend should be aware)

- `sameSite` differs by endpoint:
  - sign-in uses `"lax"`
  - refresh and update-sns-user use `"none"`
  - OAuth callbacks set cookie without `sameSite/secure` explicitly
- Signup response does not include `serverNow` while sign-in/refresh/social callback do.

References:

- `src/user/user.controller.ts`
- `src/oauth/oauth.controller.ts`

## 8) Env keys that affect frontend auth behavior

- `ACCESS_EXPIRE`
- `REFRESH_EXPIRE`
- `ACCESS_SECRET_KEY`
- `REFRESH_SECRET_KEY`
- `ACCESS_SNS_EXPIRE`
- `RESET_PASSWORD_EXPIRE`

References:

- `src/app.config.ts`

## 9) Quick frontend boot sequence

1. Sign-in -> store `accessToken`, `accessTokenExpiresAt`, `serverNow`.
2. Start refresh scheduler (`expiresAt - buffer`).
3. Protected API calls attach bearer token.
4. Refresh endpoint uses cookie (`withCredentials`).
5. Update auth state on refresh success; hard logout on refresh failure.
