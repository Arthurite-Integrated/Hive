# Hive

An online teaching SaaS platform that provides a flexible, private, and community-driven teaching environment. Hive connects **Instructors**, **Parents**, and **Students** through managed communities and courses.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Core Services](#core-services)
- [Docker](#docker)
- [Deployment](#deployment)
- [Git Workflow](#git-workflow)
- [Code Quality](#code-quality)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express 5 |
| Database | MongoDB (Mongoose 9) |
| Cache | Redis (via `redis` + `ioredis`) |
| Job Queue | BullMQ |
| Auth | JWT (RS256 asymmetric) + Google OAuth + Facebook OAuth |
| Email | Nodemailer + Handlebars templates |
| Validation | Zod 4 |
| Process Manager | PM2 (cluster mode) |
| Real-time | Socket.IO |
| Linter/Formatter | Biome |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions → EC2 |

---

## Architecture Overview

```
Client
  │
  ▼
Express 5 (app/server.js)
  ├── Middleware (CORS, metadata extraction, request logger)
  ├── /api/v1 routes
  │     ├── /auth       → register, login, verify, OAuth (Google/Facebook)
  │     ├── /instructor → (protected, in progress)
  │     ├── /parent     → (protected, in progress)
  │     └── /student    → (protected, in progress)
  ├── /queue → BullMQ Dashboard (Bull Board)
  ├── Error handler
  │
  ├── MongoDB (user data, communities, activity logs)
  ├── Redis (session cache, token storage)
  └── BullMQ Workers (email delivery)
```

Each module follows a **Controller → Service → Model** pattern with route-level Zod validation.

---

## Project Structure

```
hive/
├── app/
│   └── server.js                  # Application entry point
├── src/
│   ├── config/
│   │   ├── config.js              # Centralized config object
│   │   └── env.js                 # Zod-validated environment variables
│   ├── connection/
│   │   ├── mongo.connection.js    # MongoDB connection
│   │   ├── redis.connection.js    # Redis connection (cache)
│   │   └── bullmq.redis.connection.js  # Separate ioredis for BullMQ
│   ├── constants/                 # Regex patterns, TTLs, auth constants
│   ├── emails/                    # Handlebars email templates
│   │   ├── verify-otp/
│   │   └── welcome/
│   ├── enums/                     # Enums for user types, auth, community, etc.
│   ├── errors/                    # Custom error classes (BadRequest, NotFound, etc.)
│   ├── helpers/                   # Utility functions (base64, random bytes, responses)
│   ├── middlewares/
│   │   ├── extract-metadata.js    # IP geolocation + user agent extraction
│   │   ├── request-logger.js      # HTTP request logging
│   │   ├── route-not-found.js     # 404 handler
│   │   └── error/                 # Global error handler
│   ├── models/                    # Mongoose schemas
│   │   ├── instructor.model.js
│   │   ├── parent.model.js
│   │   ├── student.model.js
│   │   ├── community.model.js
│   │   ├── activity-log.model.js
│   │   └── location.model.js
│   ├── modules/                   # Feature modules (controller/route/service)
│   │   ├── auth/
│   │   ├── instructor/
│   │   ├── parent/
│   │   └── student/
│   ├── routes/
│   │   └── router.js             # Root API router
│   ├── services/
│   │   ├── cache.service.js       # Redis cache wrapper
│   │   ├── encryption.service.js  # AES encrypt/decrypt
│   │   ├── jwt.service.js         # RS256 JWT generation + validation middleware
│   │   ├── mail.service.js        # Email sending (Gmail/Hostinger)
│   │   ├── queue.service.js       # Base queue service
│   │   ├── queues/                # Job producers
│   │   └── workers/               # Job consumers
│   ├── utils/
│   │   └── logger.js             # Winston logger
│   └── validator/                 # Zod schemas for request validation
├── .github/workflows/
│   └── deploy.yml                # CI/CD pipeline
├── .husky/
│   └── pre-commit                # Git hooks (branch protection + lint-staged)
├── biome.json                    # Biome linter/formatter config
├── docker-compose.yml
├── dockerfile
├── ecosystem.config.cjs          # PM2 cluster config (2 instances)
├── nodemon.json                  # Dev server auto-reload config
└── package.json
```

---

## Prerequisites

- **Node.js** ≥ 20.x
- **Yarn** 1.x (Classic)
- **MongoDB** 7+ (or via Docker)
- **Redis** 7+ (or via Docker)
- **PM2** (production process management)
- **Docker** & **Docker Compose** (optional, for containerized setup)

---

## Environment Variables

Create a `.env.development` file in the project root. All variables are validated at startup via Zod — the app will crash immediately if any are missing or malformed.

```env
# Server
PORT=3000
HOSTNAME=localhost
NODE_ENV=development
SERVER_DOMAIN=http://localhost:3000
ROOT_DOMAIN=http://localhost:3000

# Database
MONGO_URI=mongodb://localhost:27017/hive
REDIS_URI=redis://localhost:6379

# JWT (RS256 — use PEM-encoded keys)
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_EXPIRES_IN=7d

# Gmail SMTP
GMAIL_HOST=smtp.gmail.com
GMAIL_PORT_SSL=465
GMAIL_PORT_TLS=587
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
GMAIL_SECURE=true

# Hostinger SMTP
HOSTINGER_HOST=smtp.hostinger.com
HOSTINGER_PORT_SSL=465
HOSTINGER_PORT_TLS=587
HOSTINGER_USER=your-email@yourdomain.com
HOSTINGER_PASSWORD=your-password
HOSTINGER_SECURE=true

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

---

## Getting Started

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Arthurite-Integrated/Hive.git
cd Hive

# 2. Install dependencies (also sets up Husky git hooks)
yarn install

# 3. Set up your environment file
cp .env.example .env.development   # then fill in your values

# 4. Start the dev server (auto-reloads on file changes)
yarn start:dev
```

The server starts at `http://localhost:3000` with the BullMQ dashboard at `http://localhost:3000/queue`.

### Using Docker

```bash
# Start the full stack (app + MongoDB + Redis)
docker compose up -d

# The API will be available at http://localhost:4000
# MongoDB at localhost:27017, Redis at localhost:6379
```

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start:dev` | `yarn start:dev` | Start dev server with nodemon (auto-reload) |
| `start:prod` | `yarn start:prod` | Start production server via PM2 (2 cluster instances) |
| `stop:prod` | `yarn stop:prod` | Stop PM2 production processes |
| `build` | `yarn build` | Bundle the project with esbuild |
| `biome:fix` | `yarn biome:fix` | Run Biome linter/formatter with auto-fix |
| `prepare` | `yarn prepare` | Install Husky git hooks (runs automatically on `yarn install`) |

---

## API Reference

Base URL: `/api/v1`

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Register a new user (Instructor/Parent/Student) | No |
| `POST` | `/auth/login` | Login with email and password | No |
| `POST` | `/auth/verify` | Verify email with OTP code | JWT |
| `GET` | `/auth/google` | Initiate Google OAuth flow | No |
| `GET` | `/auth/google/callback` | Google OAuth callback | No |
| `POST` | `/auth/google/login` | Login with Google token | No |
| `POST` | `/auth/google/signup` | Sign up with Google token | No |
| `GET` | `/auth/facebook` | Initiate Facebook OAuth flow | No |
| `GET` | `/auth/facebook/callback` | Facebook OAuth callback | No |
| `POST` | `/auth/facebook/login` | Login with Facebook token | No |
| `POST` | `/auth/facebook/signup` | Sign up with Facebook token | No |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` or `/api/v1/` | Returns server status |

### BullMQ Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/queue` | Bull Board UI for monitoring email jobs |

> **Note:** Instructor, Parent, and Student module endpoints are under active development and currently protected behind JWT middleware.

---

## Data Models

### User Models (Instructor / Parent / Student)

All user models share a common set of fields:

| Field | Type | Description |
|-------|------|-------------|
| `firstName` | String | Required |
| `lastName` | String | Required |
| `email` | String | Required, unique, regex-validated |
| `emailVerified` | Boolean | Default `false` |
| `emailVerifiedAt` | Date | Timestamp of verification |
| `lastLoginAt` | Date | Last successful login |
| `avatar` | String | Profile image URL |
| `userType` | String | `INSTRUCTOR`, `PARENT`, or `STUDENT` |
| `authMethod` | String | `EMAIL`, `GOOGLE`, or `FACEBOOK` |
| `salt` / `hash` | String | bcrypt password storage |
| `mfaEnabled` | Boolean | Multi-factor auth flag |
| `onboarded` | Boolean | Onboarding completion flag |
| `google` | Object | Google OAuth tokens |
| `facebook` | Object | Facebook OAuth tokens |

**Model-specific fields:**
- **Instructor** — `bio`, `phone`, `phoneVerified`, `isSuperAdmin`, `location` (ref)
- **Parent** — `linkedStudents[]` (array of student references with status tracking)
- **Student** — `linkedParent` (single parent ref), `linkedAt`, `unlinkedAt`

### Community

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Community name |
| `slug` | String | URL slug, unique |
| `ownerId` | ObjectId | Ref to Instructor |
| `category` | String | Community category |
| `visibility` | String | `PUBLIC` / `PRIVATE` |
| `requireApproval` | Boolean | Join approval gate |
| `memberCount` | Number | Denormalized counter |
| `courseCount` | Number | Denormalized counter |

### Activity Log

Polymorphic logging model that tracks user actions across the platform using `refPath` for dynamic references.

### Location

Simple address model (`address`, `city`, `state`, `country`, `zipCode`) referenced by user profiles.

---

## Core Services

| Service | Description |
|---------|-------------|
| **JwtService** | RS256 asymmetric JWT — generates tokens, verifies signatures, validates sessions against Redis cache. Also serves as Express auth middleware. |
| **CacheService** | Redis key-value wrapper with TTL support. Used for session storage, OTP codes, and general caching. |
| **EncryptionService** | AES symmetric encryption via CryptoJS for encrypting sensitive data in transit (OTPs, etc.). |
| **MailService** | Nodemailer + Handlebars templating. Supports Gmail and Hostinger SMTP transports. Previews emails in development, sends in production. |
| **EmailQueueService** | BullMQ producer — enqueues email jobs for async delivery. |
| **EmailWorkerService** | BullMQ consumer — processes email jobs from the queue. |

---

## Docker

### Dockerfile

Production-optimized Node.js 25 Alpine image running PM2 in cluster mode (2 instances).

### Docker Compose Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `hive` | Built from Dockerfile | 4000 → 3000 | Application server |
| `mongodb` | mongodb/mongodb-community-server:8.0 | 27017 | MongoDB database |
| `redis` | redis:8.4-alpine | 6379 | Redis cache + BullMQ broker |

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f hive

# Stop all services
docker compose down

# Rebuild after code changes
docker compose up -d --build
```

---

## Deployment

### CI/CD Pipeline

The project uses **GitHub Actions** (`.github/workflows/deploy.yml`) for automated deployment to an **EC2 instance** on pushes to `main`.

**Pipeline steps:**
1. Checkout code
2. Setup SSH connection to EC2
3. Rsync project files (excluding `.env`, `node_modules`, `logs`, `.github`)
4. Install dependencies and restart the server on EC2

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `EC2_SSH_KEY` | Private SSH key for EC2 access |
| `EC2_HOST` | EC2 instance hostname or IP |
| `EC2_USER` | SSH username (e.g., `ubuntu`) |

### Production Process Management

PM2 runs the app in **cluster mode with 2 instances** via `ecosystem.config.cjs`:

```bash
# Start production
yarn start:prod

# Stop production
yarn stop:prod

# View logs
pm2 logs hive-backend

# Monitor
pm2 monit
```

---

## Git Workflow

### Branch Protection

Direct commits to `main` and `master` are **blocked** via a Husky pre-commit hook. All changes must go through feature branches and pull requests.

### Branching Convention

```
main              ← production (auto-deploys to EC2)
├── feature/*     ← new features
├── fix/*         ← bug fixes
└── chore/*       ← maintenance tasks
```

### Pre-commit Hooks

On every commit, Husky + lint-staged automatically:
1. **Checks the branch** — rejects commits to `main`/`master`
2. **Runs Biome** on staged `*.{js,ts,jsx,tsx,json,jsonc}` files:
   - Auto-fixes formatting and lint issues (including unsafe fixes)
   - Fails the commit if any warnings or errors remain

---

## Code Quality

### Biome Configuration

- **Formatter:** Tabs for indentation, double quotes for strings
- **Linter:** Recommended rules enabled, with `noStaticOnlyClass` and `noUselessConstructor` turned off
- **Scope:** All `js/ts/jsx/tsx/json/jsonc` files, excluding `dist/`

```bash
# Manually run Biome on the entire project
yarn biome:fix
```

### Path Aliases

The project uses Node.js subpath imports for clean internal imports:

```javascript
// Instead of: import { config } from "../../config/config.js"
import { config } from "#config/config";
```

The `#*` alias maps to `./src/*.js` — configured in `package.json` under `"imports"`.

---

## License

ISC

---

*Maintained by [Arthurite Integrated](https://github.com/Arthurite-Integrated)*
