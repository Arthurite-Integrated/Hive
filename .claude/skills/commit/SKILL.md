---
name: commit
description: Generate a formatted commit message from current changes
disable-model-invocation: true
---

Look at staged changes (`git diff --cached`). If nothing staged, look at unstaged (`git diff`).

Generate a commit message in this EXACT format:

```
[CATEGORY]: Short description. First word capitalized

* Detail bullet 1
* Detail bullet 2
```

Categories:
- `[FEATURE⚡]` — New functionality
- `[FIX🐛]` — Bug fix
- `[REFACTOR♻️]` — Restructure, no behavior change
- `[SCHEMA📐]` — Database model changes
- `[AUTH🔐]` — Auth/authorization
- `[PAYMENT💰]` — Payment/financial
- `[TEST🧪]` — Tests
- `[CONFIG⚙️]` — Config, env, infra
- `[DOCS📝]` — Documentation
- `[CHORE🧹]` — Cleanup, deps
- `[PERF🚀]` — Performance

Rules:
- ONE category (most impactful)
- Short description max 60 chars
- 3-6 bullets starting with capital letters
- Schema changes: mention indexes
- Multi-category: use primary, mention others in bullets

Show the message and ask if I want to commit with it.