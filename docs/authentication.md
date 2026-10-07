# Authentication and account identity — Task 8

JIMO uses `@clerk/expo` 4.8.1 and `@clerk/backend` 3.23.0, compatible with Expo 57/React 19/Node 24. Clerk owns credentials, sessions and refresh. Neon never stores passwords, session tokens, JWTs or provider secrets. Social login, subscriptions, AI and Task 9 are outside this task.

## Identity, verification and ownership

`ClerkAuthProvider` implements `AuthProvider.verify()`: the official SDK verifies signature/algorithm, expiration and optional not-before. The adapter checks exact HTTPS issuer, user subject, session ID and non-pending status. A signed `azp` web origin must match `CLERK_AUTHORIZED_PARTIES`; native tokens may omit it. Both retain signature, issuer and time verification. API authentication uses Bearer session tokens, not cookies. Cryptographic/provider errors are mapped to safe 401 responses.

`authenticatedCurrentUser()` passes only `{provider,subject}` to `CurrentUserResolver`, which resolves JIMO `users.id` UUID. Programs/custom exercises/workouts/sync/progress retain internal UUID ownership; services do not know Clerk. Optional `x-jimo-owner` and sync `expectedUserId` detect mismatches, never authenticate. Body/query/arbitrary headers cannot establish identity. Different subjects are distinct accounts; email never links them.

Drizzle-generated `0006_auth_identity.sql` adds nullable text `auth_provider`/`auth_subject`, composite unique constraint, paired/nonempty identity check and nullable timestamptz `profile_initialized_at`. All domain UUIDs/FKs survive. Locale remains text/default `system` with application Zod support `system/it/en`; stable enums are unchanged. Email comes from the mobile provider account view, so no unnecessary email column was added. First-login provisioning is a unique-key atomic upsert: concurrent requests return one UUID. It creates no sample workouts/programs. The existing updated-at trigger may touch audit time during upsert but never overwrites preferences.

Migration was applied through the guarded Neon HTTP runner **only to the user-confirmed development branch**. Before/after comparison of every existing user UUID/name/locale/unit/created-at field confirmed preservation. Production was not contacted. Seven versioned migration hashes match the live ledger. SQLite remains version 2; existing `sync_metadata` stores subject-scoped non-secret profile references/pending locale; no new SQLite tables or reset migration.

## API settings and fail closed

API-only: secure `DATABASE_URL`, `CLERK_SECRET_KEY`; exact HTTPS `CLERK_ISSUER_URL`; explicit comma-separated `CLERK_AUTHORIZED_PARTIES` browser origins; optional `CLERK_JWT_KEY` **public** PEM verification key for networkless validation; `API_ALLOWED_ORIGINS`; confirmed `NEON_DEVELOPMENT_BRANCH_ID` for development startup. Neither database URL nor secret key belongs in mobile/public config. Turbo forwards these secrets only to the API development task and database integration tasks, never to mobile development/build.

`ALLOW_DEV_AUTH=false`/unset uses real Clerk. True explicitly opts into old server-only DEV identity **only when Clerk configuration is absent**. `DEV_USER_ID` must be an existing development UUID; blank uses documented bootstrap. Any partial Clerk configuration fails validation rather than silently selecting DEV identity. Empty optional env values count as absent. Production requires Clerk and rejects DEV_USER_ID, bypass and Clerk development keys. Missing settings stop startup. `.env.example` contains placeholders only.

Missing auth → `401 AUTH_REQUIRED`; malformed/rejected token → `401 INVALID_SESSION`; SDK expiration → `401 SESSION_EXPIRED`; authenticated owner mismatch → `403 FORBIDDEN` (existing sync namespace mismatch remains `IDENTITY_CHANGED`). Logs omit raw SDK/crypto errors, Authorization, cookies, bodies and query values; explicit redaction covers session/secret paths. Replies use `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`. CORS permits configured origins and Authorization, no wildcard/cookie credentials. Native does not use browser CORS. Credential endpoints/rate limits remain Clerk's; no custom credential API was introduced.

## Profile, onboarding and new devices

`GET /me` returns internal id, displayName (nullable), locale, unitSystem, createdAt, initialized; no auth subject/secrets. Strict Zod `PATCH /me` accepts trimmed nonempty displayName (≤120), locale, unitSystem (`metric/imperial`), optional `initialize:true`; rejects empty updates/names/identity fields/unsupported values. Normal updates mark initialized. `initialize:true` changes only an uninitialized row, so simultaneous bootstrap and returning profiles cannot overwrite established preferences with defaults.

First install: splash/session resolution → existing onboarding → account → first profile preferences → app. Existing authenticated account/new device resolves `/me` and goes straight to app, no duplicated user/forced onboarding. Onboarding currently contains language, no display name/unit fields; language is synced on initial provisioning and metric is the server default. Empty names are never sent. Returning server locale/unit/name win, then active program/cache/sync restore. Cached profiles are indexed by API/Clerk deployment and subject, never just last-used UUID. A persisted `accountOnboarded` preference records restored account setup without inventing fitness-onboarding answers; logout/re-auth on that new device returns to login rather than repeating onboarding.

Profile UI adds account email, editable name, language, units and logout with minimal existing design. Language updates persist server and local i18n; system follows device. Offline language changes persist an owner-scoped pending patch in SQLite, replayed before profile refresh after reconnect. Name/unit editing requires online access. Unit preference is synchronized; workout display stays kg (no lb conversion in Task 8).

## Mobile sessions, forms and tokens

Mobile public config: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, reachable `EXPO_PUBLIC_API_URL` only. Root Clerk SDK owns signed-in/out and token availability; no Zustand auth mirror. Official `tokenCache` uses native Expo SecureStore (plugin configured). SDK native `resourceCache` enables offline session/resource restoration, currently experimental and version pinned, encrypted/chunked by SecureStore. Web omits native cache and uses Clerk's browser session persistence. No raw token is written to AsyncStorage, SQLite or JIMO profile cache.

Custom JS `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password` use current official password/factor APIs, not native Clerk UI modules. Optional native UI client synchronization is disabled, keeping these flows suitable for Expo Go. Sign-in handles email trust challenge when required. Signup verifies required email code and only finalizes a complete session; resend is throttled 30 seconds. Password reset uses provider create → send email code → verify → new password → finalize, signing out other sessions. Unsupported additional factors/required fields remain fail-closed. Web signup supplies the captcha container; do not bypass verification/security.

Forms use IT/EN, existing dark tokens, safe area, keyboard-aware `Screen`/KeyboardAvoidingView/scroll-to-focus/reachable footer, real labels, accessible show/hide password, text errors and ≥48px actions. Synchronous submission lock prevents double requests; errors preserve drafts. Existing reduced-motion behavior remains. Web startup uses identical initial SSR/hydration snapshot before client auth resolution; protected screens cannot briefly mount before identity resolution.

Central `TokenProvider` injects Authorization into private requests. SDK `getToken({skipCache:true})` refreshes and retries once after 401; persistent server 401 asks for login. Missing offline-renewal token is availability failure, not proof of revocation. Account generation changes reject in-flight replies. Query keys include internal owner; switching clears in-memory queries, not SQLite.

## Offline, outbox, logout and multiple accounts

CHECK/timer/skip/correction/finish write SQLite without token renewal. Cached **SDK subject** resolves its local UUID; `_device/currentOwner` alone no longer binds startup. Known-offline cached accounts skip HTTP profile refresh. Native SDK resource cache supports cold restoration; actual airplane/expired token/kill/reopen still needs real-device testing. Browser API interception is not proof of native cached-session behavior or Metro availability.

An in-flight account switch/HTTP identity-mismatch also leaves the previous owner’s queue pending and does not poison the new account. Sync 401 releases operations to `pending` with `AUTH_REQUIRED`, pauses automatic retries, and does not delete/mark permanent failure. Reauth/reset resumes and removes only ACKed operations. Namespaces, UUIDs/timestamps/decimal payloads remain intact. Logout checks active workout/all pending statuses: no work → normal sign-out; otherwise Cancel / Sign out anyway dialog, stronger active-workout warning. A's data remains on device. Old owner is unbound and in-memory queries cancelled/cleared before another account can mount. B sees only B; returning A restores its workout/outbox. Owner checks bracket sync/reconciliation; API never trusts cached UUID as authentication.

## Deterministic tests

Ordinary tests mock `AuthProvider` verification instead of requiring Clerk/email/OTP. API unit tests cover missing/invalid/expired identities, verified internal UUID, arbitrary headers, production/dev config and logging. Official SDK additionally verifies ephemeral in-memory RSA test signatures/claims: native/web valid, wrong issuer/origin, bad signature, future nbf, missing expiration/session/subject, pending session, expired token. No real token/key is stored in fixtures/logs.

Neon development tests: 20 parallel `/me` → one UUID; returning login, strict PATCH/first initialization preservation, separate subjects, A/B program/custom exercise/workout/progress/records isolation, sync with B session/set/program references, health/ready and restricted CORS. Isolated dependencies/users clean in finally. Existing Task 4–7 integration suites continue.

Mobile tests exercise navigator decision helper, initial merge, token injection/refresh/401/account-change reply guard, real SQLite A→B→A cache/workout/outbox isolation, reopen preservation and sync401 → offline CHECKs → reauth ACK. E2E covers account screens/verification/reset, guarded sign-in → workout → Progress, logout warning plus prior onboarding/program/workout/offline/progress regressions. Browser tests run actual SQLite/OPFS with mocked transport and an isolated Neon test API for live program/workout paths.

Dedicated **test artifact only**:

```sh
EXPO_PUBLIC_AUTH_TEST=true EXPO_PUBLIC_API_URL=http://localhost:4301 pnpm build
CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @jimo/mobile test:ui
```

The simulator requires a separately flagged export at exact web origin `http://localhost:4173`; cannot run on native/other origin or authenticate real API. It has no credential/token, and the loopback-only API test identity uses isolated development fixtures. Keep `EXPO_PUBLIC_AUTH_TEST` unset for normal/release builds; never publish a test export. Rebuild ordinary export after E2E. Do not run export concurrently with Playwright.

## Clerk dashboard and secure setup still needed

Clerk credentials were absent during implementation. Automated tests do not prove external delivery or a live Clerk project. Supply keys securely in environment settings/private API env, never chat/Git.

1. Select/create a **development** Clerk application. Enable email/password; require email verification by code and email-code password reset. Configure no unimplemented required username/phone/MFA for this task. Keep provider security/captcha enabled. No social login yet.
2. Place that instance's publishable key in mobile configuration, secret key only in API environment, exact issuer and intended browser origins. Optional public JWT PEM avoids backend JWKS network fetch.
3. Allow required API egress to `api.clerk.com` if PEM is absent; client must reach its Clerk frontend API hostname. Preserve TLS. Do not replace an unknown allowlist wholesale.
4. Keep real auth `ALLOW_DEV_AUTH=false`, DEV_USER_ID unset; restart API/Expo. Verify signup/code/resend/sign-in/trust challenge/reset against development account. No production required/contacted.

Reusable start instructions and missing Clerk key/variable requirements were saved as a cloud environment draft. Draft persistence does not provide credentials, start services or publish an environment. Existing DEV_USER_ID data is kept separate; no automatic email/ownership transfer.

## Windows / Expo Go

Two PowerShell terminals in repo root; private root `.env` contains server-only development Neon/Clerk settings, mobile `.env.local` contains public key/API origin. Current PC Wi-Fi IPv4, never phone localhost.

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd exec turbo run build --filter=@jimo/api
$env:NEON_DEVELOPMENT_BRANCH_ID="br-purple-math-b1fsq2wb"
node --env-file=.env apps/api/dist/server.js
```

Check phone browser `http://<PC-WiFi-IPv4>:3001/health` and `/ready`, successful, private-network firewall permitted; API binds 0.0.0.0. Second terminal:

```powershell
$env:EXPO_PUBLIC_API_URL="http://<PC-WiFi-IPv4>:3001"
pnpm.cmd --filter @jimo/mobile exec expo start --lan --clear
```

Same Wi-Fi, SDK-compatible Expo Go. Tunnel exposes Metro only: outside LAN API needs its own reachable HTTPS origin. No migrations/seeds needed for device setup.

Phone checklist: onboarding/signup/code → Home; returning/new phone restores same UUID/server preferences; wrong password/email/code retain inputs; resend/reset deliver; locale/system/name/unit persist (kg display unchanged); workout online → airplane → two CHECKs → kill/reopen → timer/resume/finish → network → ACK/Progress; pending/active logout warning → B sees no A → A restores; expired session preserves pending data and resumes after login; Android/iOS large font, keyboard/safe area, screen reader, reduced motion/password visibility. Expo Go may need Metro JS after kill; installed development/release bundle isolates native cold-offline testing if Metro cannot be reached. No APK/IPA or physical-device validation was performed.

## Future deletion and provider replacement

Full deletion requires coordinated provider revocation/deletion, JIMO transaction and other-device offline reconciliation, with a deletion state to prevent reprovisioning. FK-safe removal: sync_operations, workout_sets/exercises/sessions, program_exercises/days/programs, owned custom exercises/translations, user; keep system catalog. Explicitly clear that owner's local normalized caches/workouts/sets/outbox/sync_metadata (profile refs/pending preferences)/progress_cache and memory only after coordinated acknowledgement. Revoke Clerk sessions/identity, prevent stale outbox recreating data and reconcile other devices. No fragile delete-account endpoint now.

Provider replacement implements auth/session/token adapters and an explicit verified subject mapping, not email matching. CurrentUser/domain UUID/ownership remain stable. Future social login can reuse that boundary.

## Validation

Executed checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm format:check` passed. Unit suites: **91 passed**, zero skips/failures (database 5, shared schemas 14, mobile 60, API 12). Neon API regression suite: **47 passed**, including auth provisioning/security/profile; final focused auth rerun: **6 passed**. Database integration: **11 passed**. Browser E2E after final UI revision: **19 passed**, including two account-flow tests, native-independent SQLite offline regressions and live Neon program/workout tests. Health/ready returned HTTP 200 during isolated test server validation. `/me` and private routes were verified via mocked verified identities, and JWT cryptography via the actual official SDK with ephemeral test keys.

Drizzle live check: 10 tables, 6 stable enums, 31 indexes, 132 constraints, 7 matching migrations, 9 audit triggers. Existing SQLite versions 0/1 → 2/reopen and future-version non-destructive failure remain covered. Credential scan covers committable files, mobile exports and check logs; zero full environment secret or real secret-key/JWT-pattern matches. Test export was replaced with an ordinary Android/iOS/web export with the simulator flag unset. No production connection, seed, account data transfer, Git commit/push or Task 9.

The cloud draft saves missing Clerk settings but does not supply them. Real Clerk signup/email delivery/reset, real-session native cold offline expiry and physical Android/iOS accessibility remain manual checks. Do not interpret export, ephemeral signature verification or simulated OTP as proof of live Clerk/native runtime.
