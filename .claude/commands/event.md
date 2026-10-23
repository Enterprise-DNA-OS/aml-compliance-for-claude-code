---
description: "Record a risk assessment, programme review, audit or independent evaluation, governing body report or annual report."
---

# event

Record a risk assessment, programme review, audit or independent evaluation, governing body report or annual report.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs event <firm> --kind=<risk assessment|programme review|audit|governing body report|annual report> --on=<date> --by="<name>" --reference=<doc or receipt> --period=<YYYY-YY for an annual report> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Read back the updated programme calendar. Nothing here runs a check, sends an email or lodges a report.
