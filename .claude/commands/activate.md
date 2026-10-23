---
description: "Move a customer from onboarding to active once identity, rating and every enhanced CDD step are on file."
---

# activate

Move a customer from onboarding to active once identity, rating and every enhanced CDD step are on file.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs activate <customer> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. If it refuses, read back each blocker and the command that clears it. Nothing here runs a check, sends an email or lodges a report.
