# AML Compliance for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR FIRM AND OFFICES]
- **Operator:** [YOUR NAME], [AML compliance officer, partner or practice manager]
- **What matters most:** no service before CDD is done, every suspicious activity and cash report lodged inside its clock, and a programme that is reviewed, audited and reported on time.

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a customer, run `/customer <code>` and read its owners, checks and history.
3. **Plain language.** Short sentences. Numbers and dates in tables. Say the deadline and how many days are left.
4. **Silent success, loud problems.** Lead with any report past its deadline, then matches nobody has cleared.
5. **Stop at the line.** Anything that sends, deletes, lodges or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Move a customer from onboarding to active once identity, rating and every enhanced CDD step are on file. | `/activate` |
| The last 50 changes and who made them. | `/activity` |
| Start a customer file: name, type and which firm or office holds it. | `/add-customer` |
| Set up a reporting entity: the firm or office that holds the AML obligations. | `/add-entity` |
| Record a public holiday so working and business day deadlines skip it. | `/add-holiday` |
| Record a beneficial owner, controller, trustee, settlor, beneficiary, partner or someone acting on the customer's behalf. | `/add-owner` |
| Add a person to a firm, with or without AML duties. | `/add-staff` |
| Record senior manager approval for an enhanced CDD customer (foreign PEPs, high risk). | `/approve` |
| What needs the compliance officer today across every firm, worst first. | `/attention` |
| Cash received at or over the threshold, and whether its PTR (NZ) or TTR (AU) was lodged. | `/cash` |
| Record the result of an identity, PEP, sanctions, adverse media, address or company register check from your check provider. | `/check` |
| Every check on file, newest first. | `/checks` |
| Resolve a possible match with the reason it is a false positive, or the escalation. | `/clear` |
| Close a matter or engagement. | `/close-matter` |
| Check every record against the NZ AML/CFT Act and the AU AML/CTF Act, with the rule cited. | `/compliance` |
| Every unusual activity concern: being assessed, to report, reported or not reported. | `/concerns` |
| One customer in full: risk, CDD, owners, checks, matters, findings and history. | `/customer` |
| The customer register, filtered by firm, risk or status. | `/customers` |
| Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Record the compliance officer's decision on a concern: report it, or not, with the reason. Reporting starts the clock. | `/decide` |
| Render the branded paperwork: a CDD file per customer and a programme pack per firm. | `/documents` |
| Draft the working pack for the annual AML/CFT report to DIA or the AUSTRAC compliance report, with the counts. | `/draft-annual-report` |
| Draft the letter asking a customer for identity, source of wealth or source of funds documents. | `/draft-edd` |
| Draft the compliance officer's report to the governing body or senior managers. | `/draft-officer-report` |
| Draft the confidential working note for a SAR (goAML, NZ) or SMR (AUSTRAC Online, AU). | `/draft-report` |
| End a customer relationship and start the record retention clock. | `/end` |
| The firms and offices on the register, their supervisor and compliance officer. | `/entities` |
| Record a risk assessment, programme review, audit or independent evaluation, governing body report or annual report. | `/event` |
| Archive every record to one JSON file. | `/export` |
| Raise unusual activity as a concern for the compliance officer to assess. | `/flag` |
| Bring customers across from a First AML case list saved as CSV. | `/import` |
| Ten questions answered across the whole register. | `/insights` |
| Possible and confirmed matches from PEP and sanctions screening that nobody has resolved. | `/matches` |
| Every matter or engagement, with when the customer was verified. | `/matters` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. | `/new-view` |
| Record the AML compliance officer for a firm, with appointment and AUSTRAC notification dates. | `/officer` |
| Open a matter or engagement for a customer: the service you will provide. | `/open-matter` |
| Every beneficial owner, controller and trustee, with verification and PEP status. | `/owners` |
| The AML programme calendar per firm: risk assessment, programme review, audit or independent evaluation, officer report, annual report. | `/programme` |
| Set a customer's risk rating, CDD level and PEP status. High risk, foreign PEPs and NZ trusts go to enhanced CDD. | `/rate` |
| The register of suspicious activity and cash reports: due, lodged, on time or late. | `/reports` |
| Ended relationships and the date each file can be destroyed. | `/retention` |
| Record an ongoing CDD review and set the next one by risk. | `/review` |
| Ongoing CDD reviews overdue or due in the next 60 days. | `/reviews-due` |
| The rules in force: deadlines, thresholds, review cycles and retention, with their source. | `/rules` |
| Everyone at each firm, with vetting and training dates. | `/staff` |
| Record AML training a person completed. | `/train` |
| People with AML duties whose training is missing, overdue or due in 30 days. | `/training-due` |
| Record that a customer's or an owner's identity was verified, and how. | `/verify` |
| Record that a person with AML duties was vetted. | `/vet` |
| Render the read-only dashboards: this week, the customer risk register and the programme. | `/view` |
| Record a customer's source of wealth and source of funds, and mark them verified. | `/wealth` |
| Draft the Monday AML review from attention, reports and compliance. | `/weekly-review` |

If an ask fits nothing here, run the CLI directly (`node scripts/aml.mjs --help`) and then propose a new command for it.

## Hard rules

- Never tip off. Never tell a customer, or anyone outside the compliance file, that a concern was raised or a report is being considered or made (AML/CFT Act 2009 s46, AML/CTF Act 2006 s123). Customer letters ask for CDD information only.
- Never lodge with the FIU, DIA or AUSTRAC, and never send a letter or email from here. Draft to `drafts/`; a person lodges or sends, then records it with `/lodge` or `/event`.
- Never run an identity, PEP or sanctions check, and never record a result the operator has not seen. This system records results from the firm's check provider.
- Record what happened, never what should have happened. Do not record approval, verification or a lodgement until the operator confirms it.
- Never decide a concern. The compliance officer decides; the register records the decision and the reason.
- Never work around a refusal from `activate`, `rate` or `lodge`. It refuses because a step is missing.
- These records hold identity documents, PEP status and suspicions. Keep output inside the firm.
- Never delete records: retention is 5 years in New Zealand and 7 in Australia. Never edit an applied migration. Use `/customise` for new fields and rules, with a test.
- Read `docs/compliance.md` before explaining a finding. It is a records check, not legal advice.

## Where things live

- `scripts/aml.mjs` the one CLI; `scripts/lib/aml.mjs` every read, write, rule and the import. `docs/cli.md` has the syntax.
- `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the register, the rules and the views, plain SQL. `npm run migrate` applies it.
- `views.json` and `documents.json` the dashboards (`npm run view`) and paperwork (`npm run docs`); `brand.json` the business name and colours on both.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the rules with sources, the CLI reference and the guide for moving off First AML.

Run `npm test` after any change. It must print PASS.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/first-aml
