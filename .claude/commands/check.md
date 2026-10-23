---
description: "Record the result of an identity, PEP, sanctions, adverse media, address or company register check from your check provider."
---

# check

Record the result of an identity, PEP, sanctions, adverse media, address or company register check from your check provider.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs check <customer> --kind=<identity|pep|sanctions|adverse media|address|company register> --result=<clear|possible match|match|failed> --provider="<provider>" --reference=<their reference> --owner="<owner name>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. This records a result; it does not run a check. Never record a result the operator has not seen. Nothing here runs a check, sends an email or lodges a report.
