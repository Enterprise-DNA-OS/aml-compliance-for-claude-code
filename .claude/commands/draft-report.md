---
description: "Draft the confidential working note for a SAR (goAML, NZ) or SMR (AUSTRAC Online, AU)."
---

# draft-report

Draft the confidential working note for a SAR (goAML, NZ) or SMR (AUSTRAC Online, AU).

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs draft-report <concern> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. For the compliance officer only. Remind them of the due date and the tipping off rule. Nothing here runs a check, sends an email or lodges a report.
