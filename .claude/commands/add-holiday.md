---
description: "Record a public holiday so working and business day deadlines skip it."
---

# add-holiday

Record a public holiday so working and business day deadlines skip it.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs add-holiday --day=<YYYY-MM-DD> --jurisdiction=<NZ|AU> --name="<name>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Add regional anniversary days the firm observes too. Nothing here runs a check, sends an email or lodges a report.
