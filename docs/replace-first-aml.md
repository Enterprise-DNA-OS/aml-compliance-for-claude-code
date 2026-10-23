# Moving off First AML

Plan a day. Most of it is checking, not typing.

## 1. Get your cases out

In First AML, the Cases page lists every case for your firm with filters for status, office, who it is assigned to and entity type. Case reports and the regulatory reports download from the platform, and the reports can be saved to CSV. Download:

- the case list, as CSV, with every status (In Progress, Ready for Review, Completed, Abandoned);
- the case report PDF for every completed case you will keep acting for (identity results, structure, documents);
- your annual reporting figures, if you still need them for the year in progress.

If you cannot find an export you need, ask First AML support for a full case export before your contract ends.

## 2. Set up your firm

```bash
node scripts/aml.mjs add-entity --code=HSL --name="Your Firm" --jurisdiction=NZ --sector=law --started=2018-07-01
node scripts/aml.mjs officer HSL --name="Your Compliance Officer" --appointed=2018-06-01
node scripts/aml.mjs event HSL --kind="risk assessment" --on=<date> --by="<name>" --reference="RA v4"
```

One entity per office if your First AML account splits cases by office: the import matches the Office column to the entity code or name.

## 3. Import, dry run first

```bash
node scripts/aml.mjs import first-aml cases.csv --dry-run
node scripts/aml.mjs import first-aml cases.csv
```

The import expects these headings: `Case ID, Entity name, Entity type, Office, Assigned to, Status, Risk rating, Received, Completed, PEP, Sanctions, Country, Email`. Only the first five and `Received` are required. If your download uses other headings, write a map file and pass `--map=headings.json`:

```json
{ "Case ID": "Reference", "Entity name": "Client", "Entity type": "Type" }
```

The import is all or nothing: one bad row and nothing is written. Running it again skips rows already imported; a row that changed since is refused, so correct it with the commands instead.

## What maps

| First AML | Here |
|---|---|
| Case ID | `source_ref` (first-aml:<id>), shown in the activity log |
| Entity name, Entity type | customer name and kind (individual, company, trust, partnership, SMSF, incorporated society, charity, other) |
| Office | the firm or office (entity) |
| Status | Completed to active (identity verified on the Completed date), In Progress and Ready for Review to onboarding, Abandoned to declined |
| Risk rating | low, medium, high. High risk, foreign PEPs and New Zealand trusts go to enhanced CDD |
| PEP, Sanctions | a PEP check and a sanctions check on file, with First AML as the provider |
| Assigned to | a note on the customer |

## What does not carry over

- **Identity documents, biometric results and structure maps.** Keep the case report PDFs with the client file. Record owners and controllers with `add-owner` as you review each live customer.
- **Electronic verification and screening.** This system records results; it does not run checks. Keep a check provider, or have Enterprise DNA connect yours.
- **Client reminders and upload links.** Use `draft-edd` for the request letter, or have Enterprise DNA build a client upload page.

## After the import

Run `/compliance`. Expect OWNERS-MISSING and SANCTIONS findings on imported companies and trusts until you add their owners and re-record the screen. Work through `/attention` from the top.
