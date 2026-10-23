---
description: "Add a person to a firm, with or without AML duties."
---

# add-staff

Add a person to a firm, with or without AML duties.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs add-staff --entity=<firm> --name="<name>" --role="<role>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Pass --no-aml-role only for people who never touch customers, funds or the programme. Nothing here runs a check, sends an email or lodges a report.
