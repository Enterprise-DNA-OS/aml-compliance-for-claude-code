---
description: "Set a customer's risk rating, CDD level and PEP status. High risk, foreign PEPs and NZ trusts go to enhanced CDD."
---

# rate

Set a customer's risk rating, CDD level and PEP status. High risk, foreign PEPs and NZ trusts go to enhanced CDD.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs rate <customer> --risk=<low|medium|high> --cdd=<simplified|standard|enhanced> --pep=<none|domestic|foreign|international organisation> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Ask for the reason behind the rating and log it with /customise if the firm wants it stored. Nothing here runs a check, sends an email or lodges a report.
