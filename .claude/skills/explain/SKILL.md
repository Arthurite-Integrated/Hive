---
name: explain
description: Explain code or a concept in the Hive project for learning
disable-model-invocation: true
argument-hint: <topic or file path>
---

Explain the code or concept below like you're teaching a mid-level developer.

```
📘 EXPLANATION
━━━━━━━━━━━━━━━━
WHAT: [One-line summary]

THE SIMPLE VERSION: [Plain explanation with analogies if helpful]

THE CODE: [Walk through the relevant code, highlight non-obvious parts]

WHY IT'S DONE THIS WAY: [Alternatives and trade-offs]

HOW IT CONNECTS: [What other Hive modules depend on or interact with this]

COMMON MISTAKES: [What goes wrong when done incorrectly]
━━━━━━━━━━━━━━━━
```

If the argument is a file path, read the file first. If it's a concept (e.g., "refresh tokens", "The Bouncer", "denormalized counters"), explain it in the context of Hive.

Topic: $ARGUMENTS