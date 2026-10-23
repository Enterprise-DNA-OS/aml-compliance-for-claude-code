---
description: "Start a customer file: name, type and which firm or office holds it."
---

# add-customer

Start a customer file: name, type and which firm or office holds it.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs add-customer --entity=<firm> --name="<name>" --kind=<individual|company|trust|partnership|smsf|incorporated society|charity|other> --country=<NZ|AU|..> --email=<email> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Read back the next steps it lists (owners, rating, checks) as a short to-do. Nothing here runs a check, sends an email or lodges a report.
