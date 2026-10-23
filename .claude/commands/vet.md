---
description: "Record that a person with AML duties was vetted."
---

# vet

Record that a person with AML duties was vetted.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs vet <firm/name> --on=<date> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Vetting covers senior managers, the compliance officer and anyone with AML duties. Nothing here runs a check, sends an email or lodges a report.
