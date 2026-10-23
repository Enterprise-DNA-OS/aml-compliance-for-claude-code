---
description: "Raise unusual activity as a concern for the compliance officer to assess."
---

# flag

Raise unusual activity as a concern for the compliance officer to assess.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs flag <customer> --matter=<matter> --description="<what was seen>" --suspicion=<money laundering|terrorism financing|other offence> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Do not tell the customer. Do not decide here: /decide is the compliance officer's step. Nothing here runs a check, sends an email or lodges a report.
