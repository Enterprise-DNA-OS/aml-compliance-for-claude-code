---
description: "Record the compliance officer's decision on a concern: report it, or not, with the reason. Reporting starts the clock."
---

# decide

Record the compliance officer's decision on a concern: report it, or not, with the reason. Reporting starts the clock.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs decide <concern> --report --reason="<grounds for suspicion>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Use --no-report instead of --report when there are no grounds, and write the reason an auditor would accept. Read back the due date if reporting. Nothing here runs a check, sends an email or lodges a report.
