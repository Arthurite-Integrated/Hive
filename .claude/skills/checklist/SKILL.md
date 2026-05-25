---
name: checklist
description: Check project progress against the Hive engineering breakdown
disable-model-invocation: true
---

Scan the project and report progress against the Hive engineering plan.

1. Check `src/models/` for existing schemas
2. Check `src/modules/` for existing feature modules
3. Check `src/services/` for shared services
4. Check `src/middlewares/` for auth, RBAC, rate limiting, upload middleware
5. Compare against the full task list (19 sections)

Output format:
```
✅ COMPLETED
- [list completed items]

🔨 IN PROGRESS
- [partially built items]

📋 NEXT UP (phase-appropriate)
- [recommended next tasks]

📊 PROGRESS: X% through current phase
```

Phase order:
1. Auth + Users + Communities + Courses + Enrollment
2. Payments + Subscriptions + Progress Tracking
3. Assessments + Certificates + Messaging
4. Real-time + Notifications + Analytics + Admin