---
description: "Open a matter or engagement for a customer: the service you will provide."
---

# open-matter

Open a matter or engagement for a customer: the service you will provide.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs open-matter <customer> --service="<service>" --owner="<who runs it>" --on=<date> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. If it warns that identity is not verified, say so first. Nothing here runs a check, sends an email or lodges a report.
