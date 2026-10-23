---
description: "Record that a customer's or an owner's identity was verified, and how."
---

# verify

Record that a customer's or an owner's identity was verified, and how.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs verify <customer> --method="<documents or electronic source>" --on=<date> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. For an owner, pass --owner="<name>" instead of --method. Nothing here runs a check, sends an email or lodges a report.
