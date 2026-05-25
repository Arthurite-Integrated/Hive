---
name: implement
description: Implement a Hive feature following project architecture
disable-model-invocation: true
argument-hint: <feature description>
---

Implement the feature described below following Hive's architecture:

1. **Model** (`src/models/`) — Mongoose schema with indexes, soft-delete middleware, virtuals, methods. Money in kobo. Enums from `src/enums/`.
2. **Validator** (`src/validator/`) — Zod schema for request validation.
3. **Service** (`src/modules/{feature}/`) — Business logic. Throw error classes from `src/errors/`. Use `$inc` for counters.
4. **Controller** (`src/modules/{feature}/`) — Thin. Call service, return `{ status, data }`.
5. **Routes** (`src/modules/{feature}/`) — Wire endpoints with `verifyAccessToken` from `jwt.service.js` and validation.
6. **Register** — Add routes to `src/routes/router.js`.
7. **Side effects** — Update denormalized counters, trigger BullMQ jobs for heavy ops.

After implementation:
- Generate a commit message in `[CATEGORY]:` format
- Provide `📘 LEARNING NOTES` explaining what was built, patterns used, and gotchas

Feature: $ARGUMENTS