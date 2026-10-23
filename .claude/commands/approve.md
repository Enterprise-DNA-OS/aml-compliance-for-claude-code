---
description: "Record senior manager approval for an enhanced CDD customer (foreign PEPs, high risk)."
---

# approve

Record senior manager approval for an enhanced CDD customer (foreign PEPs, high risk).

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs approve <customer> --by="<senior manager>" --on=<date> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Only record approval the person has actually given. Nothing here runs a check, sends an email or lodges a report.
