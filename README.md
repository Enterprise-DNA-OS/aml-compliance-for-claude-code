<h1 align="center">AML Compliance for Claude Code</h1>

<p align="center">
  <strong>The open-source AML compliance register that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your risk methodology, your offices, your First AML cases brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=first-aml">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/first-aml?utm_source=github&utm_medium=readme&utm_campaign=first-aml">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-first-aml">Instead of First AML</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

AML Compliance for Claude Code is the anti-money laundering register a law firm, accounting practice, conveyancer or real estate agency keeps under the New Zealand AML/CFT Act 2009 or the Australian AML/CTF Act 2006 (Tranche 2 from 1 July 2026), as a Postgres database and a set of agent commands. There is no web front end. Open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask: "what needs me today", "is the Volkov file ready", "draft the annual report pack".

**The bill it replaces.** First AML prices every plan on application: an annual platform fee, included and fixed units, pay-as-you-go overage and a one-off implementation fee. Published Australian rivals run to $999 a month for the top plan before any identity check is paid for. [Research and sources](docs/research.md).

**What it covers.** Customers and their beneficial owners, controllers and trustees; risk rating and CDD level; PEP, sanctions and identity check results from whichever provider you use; source of wealth and funds; senior manager approval; matters and cash over the threshold; unusual activity, the decision to report and the SAR, SMR, PTR or TTR clock; ongoing CDD reviews by risk; staff vetting and training; the risk assessment, programme review, audit or independent evaluation, officer report and annual report; and how long each file must be kept.

**What it does not do.** It does not verify identity documents electronically or screen names against PEP and sanctions lists: keep a check provider for that and record its results here. It does not lodge anything with the FIU, DIA or AUSTRAC. It is a records system, not legal advice.

Want the same register with a client upload portal, a web front end, or built on a different stack? That is a customisation, and it is what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=first-aml).

## Why no front end

- The front end was only there because the database was hard to talk to. That is no longer true.
- Your CDD files sit in plain Postgres tables you own, for the 5 or 7 years the law says to keep them, whether or not you still pay a vendor.
- No seats, no units. Every fee earner can check a file. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for what you give up too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/aml-compliance-for-claude-code.git
cd aml-compliance-for-claude-code
npm install
npm test
npm run demo
```

`npm run demo` loads two fictional New Zealand firms and two Australian ones, with an overdue SAR and PTR, a foreign PEP with no senior manager approval, a trust on standard CDD, a matter opened before identity was verified, a sanctions possible match nobody cleared, an audit past three years and a compliance officer AUSTRAC heard about late. Then open the folder in Claude Code and type `/attention`.

`npm run view` renders three read-only dashboards (this week, the customer risk register, the programme). `npm run docs` renders a CDD file per customer and a programme pack per firm, in your brand from `brand.json`.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared register, no per-seat or per-unit fee. Never load the demo seed into your real register.

## Five things a compliance officer does every week

1. **Onboard properly** before the work starts: identity, owners, rating, checks, approval (`/add-customer`, `/add-owner`, `/check`, `/rate`, `/activate`).
2. **Clear the matches** a screening provider raised (`/matches`, `/clear`).
3. **Decide and report** inside the clock: 3 working days in New Zealand (5 for a law firm), 3 business days in Australia, 24 hours for terrorism financing (`/concerns`, `/decide`, `/draft-report`, `/lodge`).
4. **Keep files current** with ongoing CDD reviews by risk (`/reviews-due`, `/review`).
5. **Run the programme**: risk assessment, programme review, audit or independent evaluation, training, the annual report (`/programme`, `/training-due`, `/draft-annual-report`).

`/weekly-review` drafts the Monday note from `/attention`, `/reports` and `/compliance`.

## The commands

53 slash commands over one CLI (`node scripts/aml.mjs`, 52 commands, [reference](docs/cli.md)).

| Command | What it does |
|---|---|
| `/activate` | Move a customer from onboarding to active once identity, rating and every enhanced CDD step are on file. |
| `/activity` | The last 50 changes and who made them. |
| `/add-customer` | Start a customer file: name, type and which firm or office holds it. |
| `/add-entity` | Set up a reporting entity: the firm or office that holds the AML obligations. |
| `/add-holiday` | Record a public holiday so working and business day deadlines skip it. |
| `/add-owner` | Record a beneficial owner, controller, trustee, settlor, beneficiary, partner or someone acting on the customer's behalf. |
| `/add-staff` | Add a person to a firm, with or without AML duties. |
| `/approve` | Record senior manager approval for an enhanced CDD customer (foreign PEPs, high risk). |
| `/attention` | What needs the compliance officer today across every firm, worst first. |
| `/cash` | Cash received at or over the threshold, and whether its PTR (NZ) or TTR (AU) was lodged. |
| `/check` | Record the result of an identity, PEP, sanctions, adverse media, address or company register check from your check provider. |
| `/checks` | Every check on file, newest first. |
| `/clear` | Resolve a possible match with the reason it is a false positive, or the escalation. |
| `/close-matter` | Close a matter or engagement. |
| `/compliance` | Check every record against the NZ AML/CFT Act and the AU AML/CTF Act, with the rule cited. |
| `/concerns` | Every unusual activity concern: being assessed, to report, reported or not reported. |
| `/customer` | One customer in full: risk, CDD, owners, checks, matters, findings and history. |
| `/customers` | The customer register, filtered by firm, risk or status. |
| `/customise` | Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. |
| `/decide` | Record the compliance officer's decision on a concern: report it, or not, with the reason. Reporting starts the clock. |
| `/documents` | Render the branded paperwork: a CDD file per customer and a programme pack per firm. |
| `/draft-annual-report` | Draft the working pack for the annual AML/CFT report to DIA or the AUSTRAC compliance report, with the counts. |
| `/draft-edd` | Draft the letter asking a customer for identity, source of wealth or source of funds documents. |
| `/draft-officer-report` | Draft the compliance officer's report to the governing body or senior managers. |
| `/draft-report` | Draft the confidential working note for a SAR (goAML, NZ) or SMR (AUSTRAC Online, AU). |
| `/end` | End a customer relationship and start the record retention clock. |
| `/entities` | The firms and offices on the register, their supervisor and compliance officer. |
| `/event` | Record a risk assessment, programme review, audit or independent evaluation, governing body report or annual report. |
| `/export` | Archive every record to one JSON file. |
| `/flag` | Raise unusual activity as a concern for the compliance officer to assess. |
| `/import` | Bring customers across from a First AML case list saved as CSV. |
| `/insights` | Ten questions answered across the whole register. |
| `/matches` | Possible and confirmed matches from PEP and sanctions screening that nobody has resolved. |
| `/matters` | Every matter or engagement, with when the customer was verified. |
| `/new-view` | Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. |
| `/officer` | Record the AML compliance officer for a firm, with appointment and AUSTRAC notification dates. |
| `/open-matter` | Open a matter or engagement for a customer: the service you will provide. |
| `/owners` | Every beneficial owner, controller and trustee, with verification and PEP status. |
| `/programme` | The AML programme calendar per firm: risk assessment, programme review, audit or independent evaluation, officer report, annual report. |
| `/rate` | Set a customer's risk rating, CDD level and PEP status. High risk, foreign PEPs and NZ trusts go to enhanced CDD. |
| `/reports` | The register of suspicious activity and cash reports: due, lodged, on time or late. |
| `/retention` | Ended relationships and the date each file can be destroyed. |
| `/review` | Record an ongoing CDD review and set the next one by risk. |
| `/reviews-due` | Ongoing CDD reviews overdue or due in the next 60 days. |
| `/rules` | The rules in force: deadlines, thresholds, review cycles and retention, with their source. |
| `/staff` | Everyone at each firm, with vetting and training dates. |
| `/train` | Record AML training a person completed. |
| `/training-due` | People with AML duties whose training is missing, overdue or due in 30 days. |
| `/verify` | Record that a customer's or an owner's identity was verified, and how. |
| `/vet` | Record that a person with AML duties was vetted. |
| `/view` | Render the read-only dashboards: this week, the customer risk register and the programme. |
| `/wealth` | Record a customer's source of wealth and source of funds, and mark them verified. |
| `/weekly-review` | Draft the Monday AML review from attention, reports and compliance. |

## Ten questions your register answers today

`/insights` answers all ten from your own records. They are shipped queries, not a claim that another system cannot be configured to answer them.

1. How many customers sit at each risk rating, by firm?
2. How long does onboarding take, from first contact to identity verified?
3. Which customers are on enhanced CDD, and why?
4. Which matters started before the customer was verified?
5. Which customers bring the most cash?
6. How many concerns were raised, and how many became a report?
7. How many days from noticing something to lodging the report?
8. Which staff with AML duties are untrained or unvetted?
9. Which countries do our customers come from, and at what risk?
10. Which records can we lawfully dispose of this year?

## The rules, with sources

`/compliance` checks every record against the AML/CFT Act 2009 in New Zealand (CDD timing, enhanced CDD for trusts and high risk customers, foreign PEPs, ongoing CDD, SAR and PTR deadlines, audit every three years, the annual report to DIA by 31 August, vetting and training) and the AML/CTF Act 2006 as amended in 2024 in Australia (initial CDD, PEPs, SMR and TTR deadlines, the compliance officer notified within 14 days, independent evaluation and policy review every three years, the officer's yearly report to the governing body, the compliance report to AUSTRAC by 30 September). Every finding cites its rule. The rules are rows in a table, so a change in the law is a one-line migration. [docs/compliance.md](docs/compliance.md). It is a records check, not legal advice.

## Your first hour: ten things to ask for

1. "Put our firm's name and colours on the CDD files and programme pack."
2. "Set up our two offices, our compliance officer and the date we were appointed."
3. "Add this year's public holidays and Auckland Anniversary Day."
4. "Import our First AML case list from this CSV. Dry run first."
5. "What needs me today?"
6. "Which files would fail an audit tomorrow?"
7. "Draft the source of wealth request for C-1003."
8. "Draft the working note for the SAR on K-001, and tell me the deadline."
9. "Draft our annual report pack for DIA."
10. "Add a field for the risk factors behind each rating" (through `/customise`).

## Instead of First AML

First AML's case list and its regulatory reports download to CSV. Save the case list as CSV and run `import first-aml` with a dry run first. Headings differ by report, so they can be mapped. The import is all or nothing and safe to repeat. Identity documents, biometric results and company structure maps stay in First AML's case report downloads: keep those PDFs with the file. [docs/replace-first-aml.md](docs/replace-first-aml.md) covers what carries over and what does not.

## Architecture

```
aml-compliance-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         one slash command per recurring job
  scripts/aml.mjs           the one CLI
  scripts/lib/aml.mjs       every read, write, rule and import
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      the register, the rules and the views, plain SQL
  supabase/seed.sql         fictional demo firms and customers
  views.json, documents.json the dashboards and paperwork
  docs/                     the rules, the CLI, the migration guide
```

`npm test` runs every CLI command against a temporary database: working and business days with holidays, sector rules, the SAR, SMR, PTR and TTR clocks, enhanced CDD, PEPs, owners, matches, reviews, the programme calendar, retention, an all-or-nothing import, drafts, export and escaped HTML. The CI workflow runs it on Windows and Linux, Node 20 and 22, and Postgres 17 (manual trigger).

## Privacy

These records hold identity details, PEP status and suspicions. The free version assumes a trusted operator on a protected machine or a dedicated database with its own access controls. Actor labels in the activity log are labels, not signed identities. Concerns and reports are kept out of customer CDD files on purpose. Keep `.data`, `exports`, `drafts`, `views` and `docs-out` out of git (the `.gitignore` does). Shared use needs real sign-in and permissions so only the compliance officer sees the concerns: that is part of what Enterprise DNA builds.

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, one small CLI, a slash command per recurring job, no front end, and a test for every rule.

## Want it installed and run for you?

Enterprise DNA installs AML Compliance for Claude Code for your firm, brings your First AML (or spreadsheet) history across, sets your risk methodology and offices, connects your check provider and practice system, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=first-aml)
- Read more: [enterprisedna.co/omni/instead-of/first-aml](https://enterprisedna.co/omni/instead-of/first-aml?utm_source=github&utm_medium=readme&utm_campaign=first-aml)

## License

MIT. Copyright (c) 2026 Enterprise DNA. First AML is a trademark of its owner. This independent project is not affiliated with First AML, the Department of Internal Affairs, the NZ Police Financial Intelligence Unit or AUSTRAC.
