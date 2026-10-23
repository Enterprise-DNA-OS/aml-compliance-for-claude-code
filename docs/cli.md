# CLI reference

`node scripts/aml.mjs <command> [arguments] [--key=value] [--json]`

Human tables by default, `--json` for machines. References match exactly first (customer code or name, firm code, matter ref, concern ref, staff as `FIRM/Name`), then by prefix, suffix or part of a name. More than one match lists the candidates and exits 1. Unknown flags fail before anything is written. Dates are `YYYY-MM-DD` (imports also accept `DD/MM/YYYY`). `--on` defaults to today and can never be in the future. `--actor=<name>` labels any write in the activity log.

## Reads

| Command | Returns |
|---|---|
| `attention` | Everything that needs the compliance officer, worst first |
| `compliance` | Rule findings with the rule cited (docs/compliance.md) |
| `customers [--entity] [--risk] [--status]` | The customer register |
| `customer <code>` | One customer: risk, CDD, owners, checks, matters, concerns, findings, history |
| `owners` | Beneficial owners, controllers and trustees |
| `checks`, `matches` | Every check on file; unresolved PEP and sanctions matches |
| `matters`, `cash` | Matters with verification dates; cash at or over the threshold and its report |
| `concerns`, `reports` | Unusual activity; the SAR, SMR, PTR and TTR register with due dates |
| `reviews-due` | Ongoing CDD reviews due in 60 days or overdue |
| `programme` | Risk assessment, programme review, audit or evaluation, officer report, annual report per firm |
| `staff`, `training-due` | People, vetting and training |
| `retention` | Ended relationships and their keep-until date |
| `entities`, `rules`, `activity` | Firms, the rules in force, the change log |
| `insights` | Ten questions across the register |

## Writes

| Command | Does |
|---|---|
| `add-entity --code --name --jurisdiction=NZ\|AU --sector --started [--supervisor] [--enrolment]` | Set up a reporting entity |
| `officer <firm> --name [--appointed] [--notified]` | Record the compliance officer and AUSTRAC notification |
| `event <firm> --kind --by [--on] [--period=YYYY-YY] [--reference] [--findings]` | Record a programme event |
| `add-staff --entity --name --role [--no-aml-role]`, `vet <staff> [--on]`, `train <staff> --course [--on]` | People |
| `add-customer --entity --name --kind [--country] [--email] [--notes] [--code]` | Start a customer file |
| `add-owner <customer> --name --role [--pct] [--pep]` | Owners, controllers, trustees |
| `check <customer> --kind --result --provider [--owner] [--reference] [--on]` | Record a check result |
| `clear <check id> --note [--on]` | Resolve a match |
| `verify <customer> --method [--on]`, `verify <customer> --owner=<name> [--on]` | Identity verified |
| `rate <customer> --risk [--cdd] [--pep]` | Risk and CDD level (refuses standard CDD for high risk, foreign PEPs and NZ trusts) |
| `wealth <customer> [--wealth] [--funds] [--verified]` | Source of wealth and funds |
| `approve <customer> --by [--on]` | Senior manager approval for enhanced CDD |
| `activate <customer>` | Onboarding to active (refuses while any breach is open on the file) |
| `open-matter <customer> --service --owner [--ref] [--on]`, `close-matter <matter> [--on]` | Matters |
| `transaction <matter> --method --amount [--direction=in] [--currency] [--note] [--on]` | Money in or out; cash at or over the threshold starts the PTR or TTR clock |
| `review <customer> --outcome [--risk] [--on]` | Ongoing CDD review; sets the next one by risk |
| `end <customer> [--on]` | End the relationship; starts retention |
| `flag <customer> --description [--matter] [--suspicion] [--on]` | Raise a concern |
| `decide <concern> --report\|--no-report --reason [--on]` | The compliance officer's decision; reporting starts the clock |
| `lodge <concern or transaction id> --receipt [--on]` | Record a lodged SAR, SMR, PTR or TTR |
| `add-holiday --day --jurisdiction --name` | Public holidays for working and business day clocks |
| `import first-aml <file.csv> [--entity] [--map=headings.json] [--dry-run]` | Bring First AML cases across |
| `export [--file]` | Every table to one JSON file (never overwrites) |

## Drafts (to `drafts/`, never sent)

`weekly-review`, `draft-edd <customer>`, `draft-report <concern>`, `draft-officer-report <firm>`, `draft-annual-report <firm>`.
