---
description: "Close a matter or engagement."
---

# close-matter

Close a matter or engagement.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs close-matter <matter> --on=<date> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Closing a matter does not end the customer relationship: use /end for that. Nothing here runs a check, sends an email or lodges a report.
