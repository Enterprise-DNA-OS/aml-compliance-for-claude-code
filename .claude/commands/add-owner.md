---
description: "Record a beneficial owner, controller, trustee, settlor, beneficiary, partner or someone acting on the customer's behalf."
---

# add-owner

Record a beneficial owner, controller, trustee, settlor, beneficiary, partner or someone acting on the customer's behalf.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs add-owner <customer> --name="<name>" --role=<owner|controller|trustee|settlor|beneficiary|protector|acting on behalf|partner> --pct=<ownership %> --pep=<none|domestic|foreign|international organisation> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. For a company, owners above 25 per cent and anyone with effective control. For a trust, trustees, settlors and named beneficiaries. Nothing here runs a check, sends an email or lodges a report.
