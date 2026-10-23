---
description: "End a customer relationship and start the record retention clock."
---

# end

End a customer relationship and start the record retention clock.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs end <customer> --on=<date> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Read back the keep-until date. Nothing here runs a check, sends an email or lodges a report.
