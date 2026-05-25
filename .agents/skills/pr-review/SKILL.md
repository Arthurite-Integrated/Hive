---
name: review
description: Review staged changes against Hive coding standards and generate a commit message
disable-model-invocation: true
---

Review the staged changes (`git diff --cached`). If nothing staged, review unstaged changes (`git diff`).

**Check against Hive standards:**
1. Security (exposed secrets, missing validation, unverified webhooks)
2. Data integrity (money as kobo, UTC dates, soft delete, `$inc` for counters)
3. Performance (missing indexes, N+1 queries, sync ops that should be in BullMQ)
4. Code quality (ESM imports with `.js`, thin controllers, error handling, no `console.log`)
5. Architecture (files in correct locations per project structure, enums from `src/enums/`)

**Then generate a commit message:**
```
[CATEGORY]: Short description. First word capitalized

* Detail 1
* Detail 2
```

**Then provide 📘 LEARNING NOTES** explaining what was built and key decisions.

Show the commit message and ask if I want to commit with it.