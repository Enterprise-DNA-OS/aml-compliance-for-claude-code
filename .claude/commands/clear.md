---
description: "Resolve a possible match with the reason it is a false positive, or the escalation."
---

# clear

Resolve a possible match with the reason it is a false positive, or the escalation.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs clear <check id> --note="<why it is or is not the same person>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Get the check id from /matches. The note is what an auditor reads: dates of birth, nationality, the evidence. Nothing here runs a check, sends an email or lodges a report.
