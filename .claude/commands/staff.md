---
description: "Everyone at each firm, with vetting and training dates."
---

# staff

Everyone at each firm, with vetting and training dates.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs staff --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Flag AML roles with no vetting. Nothing here runs a check, sends an email or lodges a report.
