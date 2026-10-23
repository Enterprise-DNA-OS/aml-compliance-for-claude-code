---
description: "Bring customers across from a First AML case list saved as CSV."
---

# import

Bring customers across from a First AML case list saved as CSV.

Read fresh data. Never invent a customer, a check result, a date or command output. These records hold personal information and must stay inside the firm.

```bash
node scripts/aml.mjs import first-aml <file.csv> --entity=<default firm> --map=<headings.json> --dry-run --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a name or reference is ambiguous, list the candidates and ask. Always run with --dry-run first and report the counts. Then run without it. Guide: docs/replace-first-aml.md. Nothing here runs a check, sends an email or lodges a report.
