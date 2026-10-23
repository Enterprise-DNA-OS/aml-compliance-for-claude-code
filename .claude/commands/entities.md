---
description: "The firms and offices on the register, their supervisor and compliance officer."
---

# entities

The firms and offices on the register, their supervisor and compliance officer.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs entities --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Flag any with no compliance officer. Nothing here runs a check, sends an email or lodges a report.
