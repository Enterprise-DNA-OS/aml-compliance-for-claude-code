---
description: "Record an ongoing CDD review and set the next one by risk."
---

# review

Record an ongoing CDD review and set the next one by risk.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs review <customer> --outcome="<what changed or did not>" --risk=<low|medium|high> --on=<date> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Read back the next review date. Nothing here runs a check, sends an email or lodges a report.
