---
description: "Set up a reporting entity: the firm or office that holds the AML obligations."
---

# add-entity

Set up a reporting entity: the firm or office that holds the AML obligations.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs add-entity --code=<code> --name="<name>" --jurisdiction=<NZ|AU> --sector=<law|accounting|conveyancing|real estate|trust and company services|other> --started=<date services began> --enrolment=<AUSTRAC enrolment> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Then record the compliance officer (/officer) and the risk assessment and programme (/event). Nothing here runs a check, sends an email or lodges a report.
