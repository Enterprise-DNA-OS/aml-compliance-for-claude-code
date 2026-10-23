---
description: "Archive every record to one JSON file."
---

# export

Archive every record to one JSON file.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs export --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Say where the file went. It holds personal information: keep it inside the firm. Nothing here runs a check, sends an email or lodges a report.
