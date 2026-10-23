---
description: "Render the branded paperwork: a CDD file per customer and a programme pack per firm."
---

# documents

Render the branded paperwork: a CDD file per customer and a programme pack per firm.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
npm run docs
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Files land in docs-out/. Concerns and reports are kept out of customer files on purpose. Nothing here runs a check, sends an email or lodges a report.
