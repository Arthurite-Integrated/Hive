# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is Hive?

Hive is a learning management platform where:
- **Instructors** create communities, publish courses (video/PDF/live/quiz/assignment), earn revenue, and withdraw earnings.
- **Students** join communities, enroll in courses, track progress, earn certificates, take quizzes, submit assignments, and chat.
- **Parents** link to student accounts and monitor their progress/grades.
- **Super Admins** manage users, payments, withdrawals, content moderation, and platform analytics.

## Development Commands

```bash
# Start dev server (nodemon, auto-reload)
npm run start:dev

# Start background workers (BullMQ consumers)
npm run start:workers

# Run all tests (requires MongoDB + Redis running)
npm test

# Run tests in watch mode
npm run test:watch

# Run a single test file
npx vitest run src/__tests__/api/auth/auth.test.js

# Run tests matching a pattern
npx vitest run -t "should register"

# Lint and format (auto-fix)
npm run biome:fix

# Infrastructure (MongoDB on :27018, Redis on :6378)
docker compose up -d
```

Tests require MongoDB and Redis to be running (they hit real databases, not mocks). The `docker-compose.yml` provides both on non-standard ports (MongoDB 27018, Redis 6378) to avoid conflicts with local instances.

## Tech Stack

| Layer            | Technology                                     |
| ---------------- | ---------------------------------------------- |
| Runtime          | Node.js 20+ (ESM only — no `require`)          |
| Framework        | Express 5                                      |
| Database         | MongoDB (Mongoose 9)                           |
| Cache            | Redis (ioredis)                                |
| Job Queue        | BullMQ (separate ioredis connection)           |
| Auth             | JWT (RS256 asymmetric) + Google/Facebook OAuth |
| Validation       | Zod 4                                          |
| Linter/Formatter | Biome                                          |
| Test             | Vitest + Supertest (integration tests)         |

## Architecture

### Module Pattern

Each feature lives in `src/modules/{feature}/` with three files:
- `{feature}.routes.js` — endpoint definitions, Zod middleware, wires to controller
- `{feature}.controller.js` — HTTP only, delegates to service, returns response
- `{feature}.service.js` — all business logic

All role-based modules (instructor, student, parent) inherit from base classes in `src/services/bases/`:
- `BaseUserService` — register, login, profile, update, updatePassword, onboard, delete
- `BaseUserController` — thin HTTP handlers calling the service
- `BaseUserSchema` — shared Mongoose schema with `setPassword()`, `validatePassword()` methods

Role-specific services override methods to add extra allowed fields (e.g., `InstructorService.onboard()` adds `specializations`).

### Import Aliases

Package.json `"imports"` field maps `#*` → `./src/*.js`. Vitest resolves these via `resolve.alias` in `vitest.config.js`:
- `#config`, `#services`, `#middlewares`, `#errors`, `#helpers`, `#utils`, `#constants`, `#enums`, `#modules`, `#models`, `#routes`, `#connection`, `#validator`

### Request Flow

```
Request → express.json → cors → /api/v1/ router
  → jwtService.validateToken (sets req.authData from Redis)
  → zodEngine.validate.body/params/query
  → controller → service → model
  → sendSuccessResponse / throw → errorHandler
```

### Singleton Pattern

All services use static `getInstance()` singletons. When creating a new service, follow the same pattern.

### Auth Data Flow

1. Register: credentials cached in Redis (encrypted password + OTP), JWT token returned with `authId`
2. Verify OTP: user created in MongoDB, auth tokens issued, `authId` → authenticated data cached
3. Subsequent requests: `validateToken` middleware decodes JWT → looks up `authId` in Redis → sets `req.authData`

### Two Redis Connections

- `src/connection/redis.connection.js` — for `CacheService` (sessions, auth data, OTP)
- `src/connection/bullmq.redis.connection.js` — dedicated to BullMQ queues/workers

Never share these. BullMQ requires its own connection.

## Current State

The project currently has **separate models** for Instructor, Parent, and Student that share `BaseUserSchema`. The engineering plan calls for unifying them into a single `User` model with a `userType` discriminator.

**Phase roadmap:**
1. ✅ Phase 1a: Auth + Basic User Models — DONE
2. 🔨 Phase 1b: Unified User Model + Communities + Courses + Enrollment
3. Phase 2: Payments + Subscriptions + Progress Tracking
4. Phase 3: Assessments + Certificates + Messaging
5. Phase 4: Real-time + Notifications + Analytics + Admin

## Critical Conventions

### ESM Only
Always include `.js` extension in relative imports. Use `#alias` paths for `src/` imports.

### Money
All monetary values as **integers in kobo** (100 kobo = 1 NGN). Never floats.

### Dates
All UTC. Frontend converts to user timezone.

### Soft Delete
Set `deletedAt = new Date()` + `status: "deleted"`. Never hard-delete. NDPR requires 30-day recoverability.

### Denormalized Counters
`memberCount`, `courseCount`, etc. — update via `$inc`. Background job reconciles drift every 6 hours.

### Error Handling
Services throw custom errors from `src/errors/`. Global error handler in `src/middlewares/error/` catches everything. Controllers never try/catch.

### Config
All env vars validated with Zod in `src/config/env.js`. Access via `config` object from `src/config/config.js`. **No `process.env` outside `src/config/`.**

### Logging
Use `logger` from `src/utils/logger.js`. **No `console.log`.**

### Validation
Zod schemas in `src/validator/`. Applied as middleware via `ZodEngine.getInstance().validate.body(schema)`.

## Key Business Rules

### Payment Flow (CRITICAL)
1. Frontend calls `POST /payments/initialize` → gets gateway URL
2. User pays on hosted UI (Paystack/Flutterwave/Stripe)
3. Gateway webhook → verify signature → update Payment
4. **ONLY the webhook creates the Enrollment** — never trust frontend redirect
5. Post-payment actions in BullMQ jobs

### Teacher Earnings
- Payment success → 10% platform fee → instructor share to `pendingBalance`
- Daily job → 7-day-old funds move to `availableBalance`
- Withdrawals from `availableBalance` only

### The Bouncer (Enrollment Access Control)
`requireEnrollment()` middleware: free course/preview → allow; one-time payment → check enrollment; subscription → check `expiresAt` + grace period.

## Testing

Tests are integration tests in `src/__tests__/api/`. They hit real MongoDB and Redis (started via docker-compose).

- `setup.js` — connects to DB, cleans collections between tests, drops DB after all tests
- `helpers.js` — `createAuthenticatedUser(userType)` bypasses registration flow; `registerAndVerify(userType)` goes through the full API flow including OTP extraction from Redis

Tests run sequentially (`fileParallelism: false`) with 30s timeout.

## Commit Message Format

```
[CATEGORY]: Short description

* Detail bullet 1
* Detail bullet 2
```

Categories: `[FEATURE⚡]`, `[FIX🐛]`, `[REFACTOR♻️]`, `[SCHEMA📐]`, `[AUTH🔐]`, `[PAYMENT💰]`, `[TEST🧪]`, `[CONFIG⚙️]`, `[DOCS📝]`, `[CHORE🧹]`, `[PERF🚀]`

## Learning Notes

After every significant code change, provide:

```
📘 LEARNING NOTES
━━━━━━━━━━━━━━━━
WHAT: [One-line summary]
HOW: [2-4 sentences — the mechanics, the non-obvious parts]
WHY THIS APPROACH: [Why this pattern over alternatives]
PATTERN: [Design pattern name if applicable]
GOTCHA: [Common mistakes to watch out for]
CONNECT THE DOTS: [How this relates to other Hive modules]
━━━━━━━━━━━━━━━━
```

## Postman Integration

When building or modifying API endpoints, sync them to the Postman Hive collection using the Postman MCP.

- **Workspace:** Arthurite (team)
- **Collection UID:** `46586895-023c0aab-af5e-41d7-bf59-d895c6f112c6`

Conventions:
- Use `{{BASE_URL}}`, `{{JWT_TOKEN}}`, `{{REFRESH_TOKEN}}` variables — don't create new ones without asking
- Folder structure mirrors modules (Auth/, User/, Community/, Course/)
- Request names are action verbs: "Register", "Get Me", "Create Course"
- JSON bodies must be clean (no escaped whitespace)
- Every body field gets an inline comment: valid options, format, constraints, whether optional
