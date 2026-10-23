---
description: "Record the AML compliance officer for a firm, with appointment and AUSTRAC notification dates."
---

# officer

Record the AML compliance officer for a firm, with appointment and AUSTRAC notification dates.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs officer <firm> --name="<name>" --appointed=<date> --notified=<date AUSTRAC was told> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. In Australia read back the notify-by date: 14 days from appointment. Nothing here runs a check, sends an email or lodges a report.
