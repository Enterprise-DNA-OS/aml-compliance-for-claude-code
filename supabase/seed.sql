-- Fictional demo data: two New Zealand firms and two Australian firms, with deliberate gaps so /attention and /compliance have something to say.
-- Dates are relative to today so the demo never goes stale. Safe to run twice. Never load it into your real register.

insert into holidays (day, jurisdiction, name) values
  (make_date(extract(year from current_date)::int, 12, 25), 'NZ', 'Christmas Day'),
  (make_date(extract(year from current_date)::int, 12, 26), 'NZ', 'Boxing Day'),
  (make_date(extract(year from current_date)::int, 12, 25), 'AU', 'Christmas Day'),
  (make_date(extract(year from current_date)::int, 12, 26), 'AU', 'Boxing Day')
on conflict do nothing;

insert into entities (id, code, name, jurisdiction, sector, supervisor, enrolment_ref, compliance_officer, co_appointed_on, co_notified_on, services_started_on) values
  ('10000000-0000-4000-8000-000000000001', 'HSL', 'Harbourside Legal', 'NZ', 'law', 'DIA', null, 'Aroha Ngata', '2018-06-01', null, '2018-07-01'),
  ('10000000-0000-4000-8000-000000000002', 'KAC', 'Kauri Accounting', 'NZ', 'accounting', 'DIA', null, 'Mere Tane', '2019-09-01', null, '2019-10-01'),
  ('10000000-0000-4000-8000-000000000003', 'BCV', 'Banksia Conveyancing', 'AU', 'conveyancing', 'AUSTRAC', 'DEMO-ENROL-3', 'Olivia Brennan', current_date - 100, current_date - 74, current_date - 110),
  ('10000000-0000-4000-8000-000000000004', 'WTA', 'Wattle Tax Advisory', 'AU', 'accounting', 'AUSTRAC', 'DEMO-ENROL-4', null, null, null, current_date - 100)
on conflict do nothing;

insert into programme_events (id, entity_id, kind, done_on, period, reference, findings, by_whom) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'risk assessment', current_date - 400, null, 'RA v4', 'Trusts and overseas buyers rated high', 'Aroha Ngata'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'programme review', current_date - 100, null, 'Programme v6', 'Added source of funds steps for property', 'Aroha Ngata'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'audit', current_date - 1300, null, 'Audit 2023', 'Two findings, both closed', 'External auditor'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'annual report', least(last_year_end(current_date) + 50, current_date), year_label(last_year_end(current_date)), 'AML Online receipt DEMO-AR-1', null, 'Aroha Ngata'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'risk assessment', current_date - 90, null, 'RA 2026', null, 'Mere Tane'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'programme review', current_date - 90, null, 'Programme 2026', null, 'Mere Tane'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', 'audit', current_date - 700, null, 'Audit 2024', 'No findings', 'External auditor'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003', 'risk assessment', current_date - 120, null, 'ML/TF RA v1', 'Overseas buyers and off-the-plan rated high', 'Olivia Brennan'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000003', 'programme review', current_date - 115, null, 'AML/CTF program v1', null, 'Olivia Brennan')
on conflict do nothing;

insert into staff (id, entity_id, name, role, aml_role, vetted_on) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Aroha Ngata', 'Partner and compliance officer', true, '2018-05-20'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'James Liu', 'Senior solicitor', true, '2021-02-01'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Priya Shah', 'Legal executive', true, null),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Mere Tane', 'Director and compliance officer', true, '2019-08-15'),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'Olivia Brennan', 'Principal and compliance officer', true, current_date - 105),
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', 'Tom Reilly', 'Conveyancer', true, current_date - 90),
  ('30000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000004', 'Grace Kim', 'Partner', true, current_date - 95)
on conflict do nothing;

insert into training (id, staff_id, course, completed_on) values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'AML/CFT annual refresher', current_date - 200),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'AML/CFT annual refresher', current_date - 420),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'AML/CFT induction', current_date - 30),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'AML/CFT annual refresher', current_date - 100),
  ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Tranche 2 compliance officer course', current_date - 60)
on conflict do nothing;

insert into customers (id, code, entity_id, name, kind, country, email, risk_rating, cdd_level, pep, id_verified_on, id_method,
    source_of_wealth, source_of_funds, sow_verified_on, approved_by, approved_on, status, started_on, ended_on, next_review_on, notes) values
  ('40000000-0000-4000-8000-000000000001', 'C-1001', '10000000-0000-4000-8000-000000000001', 'Tui Holdings Limited', 'company', 'NZ', 'accounts@tuiholdings.example', 'medium', 'standard', 'none',
    current_date - 300, 'NZ Companies Office extract and director ID', null, null, null, null, null, 'active', current_date - 310, null, current_date + 400, null),
  ('40000000-0000-4000-8000-000000000002', 'C-1002', '10000000-0000-4000-8000-000000000001', 'Walker Family Trust', 'trust', 'NZ', 'hemi@walker.example', 'medium', 'standard', 'none',
    current_date - 280, 'Trust deed and trustee ID', null, null, null, null, null, 'active', current_date - 290, null, current_date + 300, 'Settled by Hemi and Anna Walker'),
  ('40000000-0000-4000-8000-000000000003', 'C-1003', '10000000-0000-4000-8000-000000000001', 'Dmitri Volkov', 'individual', 'CY', 'dv@volkov.example', 'high', 'enhanced', 'foreign',
    current_date - 25, 'Passport, electronic verification', 'Proceeds of a business sale, 2024', 'Sale proceeds held in Cyprus', null, null, null, 'active', current_date - 30, null, current_date + 340, 'Buying a Queenstown property'),
  ('40000000-0000-4000-8000-000000000004', 'C-1004', '10000000-0000-4000-8000-000000000001', 'Lena Fischer', 'individual', 'DE', 'lena@fischer.example', null, null, 'none',
    null, null, null, null, null, null, null, 'onboarding', current_date - 30, null, null, 'ID documents requested twice'),
  ('40000000-0000-4000-8000-000000000005', 'C-1005', '10000000-0000-4000-8000-000000000001', 'Rangi Construction Ltd', 'company', 'NZ', 'office@rangiconstruction.example', 'high', 'enhanced', 'none',
    current_date - 200, 'NZ Companies Office extract', null, null, null, null, null, 'active', current_date - 210, null, current_date + 150, 'Pays deposits in cash'),
  ('40000000-0000-4000-8000-000000000006', 'C-1006', '10000000-0000-4000-8000-000000000001', 'Mason Clarke', 'individual', 'NZ', null, 'low', 'standard', 'none',
    current_date - 1100, 'NZ driver licence', null, null, null, null, null, 'ended', current_date - 1110, current_date - 700, null, 'Sale settled, file closed'),
  ('40000000-0000-4000-8000-000000000007', 'C-1007', '10000000-0000-4000-8000-000000000001', 'Sophie Tan', 'individual', 'NZ', 'sophie@tan.example', 'low', 'standard', 'none',
    current_date - 1150, 'NZ passport', null, null, null, null, null, 'active', current_date - 1160, null, current_date - 40, 'Will and estate planning'),
  ('40000000-0000-4000-8000-000000000008', 'C-2001', '10000000-0000-4000-8000-000000000002', 'Kowhai Cafe Ltd', 'company', 'NZ', 'hello@kowhaicafe.example', 'medium', 'standard', 'none',
    current_date - 150, 'NZ Companies Office extract', null, null, null, null, null, 'active', current_date - 160, null, current_date + 500, null),
  ('40000000-0000-4000-8000-000000000009', 'C-2002', '10000000-0000-4000-8000-000000000002', 'Bay Orchards Partnership', 'partnership', 'NZ', 'bay@orchards.example', 'low', 'standard', 'none',
    current_date - 900, 'Partnership agreement and partner ID', null, null, null, null, null, 'active', current_date - 910, null, current_date + 150, null),
  ('40000000-0000-4000-8000-000000000010', 'C-2003', '10000000-0000-4000-8000-000000000002', 'Peter Grant', 'individual', 'NZ', 'peter@grant.example', 'medium', 'standard', 'none',
    current_date - 400, 'NZ passport', null, null, null, null, null, 'active', current_date - 410, null, current_date + 300, null),
  ('40000000-0000-4000-8000-000000000011', 'C-3001', '10000000-0000-4000-8000-000000000003', 'Hayes Property Pty Ltd', 'company', 'AU', 'admin@hayesproperty.example', 'medium', 'standard', 'none',
    current_date - 60, 'ASIC extract and director ID', null, null, null, null, null, 'active', current_date - 65, null, current_date + 670, null),
  ('40000000-0000-4000-8000-000000000012', 'C-3002', '10000000-0000-4000-8000-000000000003', 'Chloe Nguyen', 'individual', 'AU', 'chloe@nguyen.example', 'low', 'standard', 'none',
    current_date - 40, 'Australian passport, electronic verification', null, null, null, null, null, 'active', current_date - 42, null, current_date + 1050, 'First home purchase'),
  ('40000000-0000-4000-8000-000000000013', 'C-3003', '10000000-0000-4000-8000-000000000003', 'Ibrahim Haddad', 'individual', 'AU', 'ih@haddad.example', 'medium', 'standard', 'none',
    current_date - 20, 'Australian driver licence', null, null, null, null, null, 'active', current_date - 22, null, current_date + 700, 'Off-the-plan purchase'),
  ('40000000-0000-4000-8000-000000000014', 'C-4001', '10000000-0000-4000-8000-000000000004', 'Jacaranda Super Fund', 'smsf', 'AU', 'trustee@jacaranda.example', 'low', 'simplified', 'none',
    null, null, null, null, null, null, null, 'onboarding', current_date - 8, null, null, 'Year-end tax return engagement')
on conflict do nothing;

insert into beneficial_owners (id, customer_id, name, role, ownership_pct, pep, id_verified_on) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Hemi Walker', 'owner', 60, 'none', current_date - 300),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Anna Walker', 'owner', 40, 'none', current_date - 300),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'Hemi Walker', 'trustee', null, 'none', current_date - 280),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', 'Anna Walker', 'settlor', null, 'none', current_date - 280),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000008', 'Lucy Park', 'owner', 100, 'none', null),
  ('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000009', 'Tom Bay', 'partner', 50, 'none', current_date - 900),
  ('50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000009', 'Rua Bay', 'partner', 50, 'none', current_date - 900),
  ('50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000011', 'Daniel Hayes', 'owner', 100, 'none', current_date - 60),
  ('50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000014', 'Ruth Lee', 'trustee', null, 'none', null)
on conflict do nothing;

insert into checks (id, customer_id, owner_id, kind, result, provider, checked_on, reference, resolved_on, resolution) values
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', null, 'sanctions', 'clear', 'Screening provider', current_date - 300, 'SCR-1001', null, null),
  ('60000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', null, 'sanctions', 'clear', 'Screening provider', current_date - 280, 'SCR-1002', null, null),
  ('60000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', null, 'identity', 'clear', 'ID provider', current_date - 25, 'ID-1003', null, null),
  ('60000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', null, 'pep', 'match', 'Screening provider', current_date - 25, 'SCR-1003A', current_date - 24, 'Confirmed: former deputy minister, Cyprus. Rated foreign PEP.'),
  ('60000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', null, 'sanctions', 'possible match', 'Screening provider', current_date - 25, 'SCR-1003B', null, null),
  ('60000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000005', null, 'sanctions', 'clear', 'Screening provider', current_date - 200, 'SCR-1005', null, null),
  ('60000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', null, 'sanctions', 'clear', 'Screening provider', current_date - 1150, 'SCR-1007', null, null),
  ('60000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000008', null, 'sanctions', 'clear', 'Screening provider', current_date - 150, 'SCR-2001', null, null),
  ('60000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000009', null, 'sanctions', 'clear', 'Screening provider', current_date - 900, 'SCR-2002', null, null),
  ('60000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000010', null, 'sanctions', 'clear', 'Screening provider', current_date - 400, 'SCR-2003', null, null),
  ('60000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000011', null, 'sanctions', 'clear', 'Screening provider', current_date - 60, 'SCR-3001', null, null),
  ('60000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000012', null, 'sanctions', 'clear', 'Screening provider', current_date - 40, 'SCR-3002', null, null),
  ('60000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000013', null, 'sanctions', 'clear', 'Screening provider', current_date - 20, 'SCR-3003', null, null),
  ('60000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000014', null, 'sanctions', 'clear', 'Screening provider', current_date - 8, 'SCR-4001', null, null)
on conflict do nothing;

insert into matters (id, ref, customer_id, service, owner, opened_on, closed_on) values
  ('70000000-0000-4000-8000-000000000001', 'M-101', '40000000-0000-4000-8000-000000000001', 'Commercial property purchase', 'James Liu', current_date - 295, current_date - 200),
  ('70000000-0000-4000-8000-000000000002', 'M-102', '40000000-0000-4000-8000-000000000002', 'Trust restructure', 'Aroha Ngata', current_date - 275, null),
  ('70000000-0000-4000-8000-000000000003', 'M-103', '40000000-0000-4000-8000-000000000003', 'Residential property purchase', 'James Liu', current_date - 20, null),
  ('70000000-0000-4000-8000-000000000004', 'M-104', '40000000-0000-4000-8000-000000000004', 'Residential property purchase', 'Priya Shah', current_date - 10, null),
  ('70000000-0000-4000-8000-000000000005', 'M-105', '40000000-0000-4000-8000-000000000005', 'Land purchase for development', 'James Liu', current_date - 190, null),
  ('70000000-0000-4000-8000-000000000006', 'M-201', '40000000-0000-4000-8000-000000000008', 'Annual accounts and tax', 'Mere Tane', current_date - 140, null),
  ('70000000-0000-4000-8000-000000000007', 'M-202', '40000000-0000-4000-8000-000000000009', 'Partnership accounts', 'Mere Tane', current_date - 880, null),
  ('70000000-0000-4000-8000-000000000008', 'M-203', '40000000-0000-4000-8000-000000000010', 'Company formation and trust account', 'Mere Tane', current_date - 390, null),
  ('70000000-0000-4000-8000-000000000009', 'M-301', '40000000-0000-4000-8000-000000000011', 'Commercial conveyance', 'Tom Reilly', current_date - 55, null),
  ('70000000-0000-4000-8000-000000000010', 'M-302', '40000000-0000-4000-8000-000000000012', 'Residential conveyance', 'Olivia Brennan', current_date - 38, current_date - 5),
  ('70000000-0000-4000-8000-000000000011', 'M-303', '40000000-0000-4000-8000-000000000013', 'Off-the-plan conveyance', 'Tom Reilly', current_date - 18, null)
on conflict do nothing;

insert into transactions (id, matter_id, on_date, method, direction, amount_cents, currency, note, reported_on, receipt_ref) values
  ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000005', current_date - 40, 'cash', 'in', 1500000, 'NZD', 'Deposit paid in cash at reception', null, null),
  ('80000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000005', current_date - 180, 'trust deposit', 'in', 25000000, 'NZD', 'Purchase price from ASB account', null, null),
  ('80000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', current_date - 12, 'international wire', 'in', 120000000, 'NZD', 'Funds from Cyprus', null, null),
  ('80000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000009', current_date - 3, 'cash', 'in', 1200000, 'AUD', 'Deposit top-up in cash', null, null),
  ('80000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000008', current_date - 300, 'cash', 'in', 1100000, 'NZD', 'Cash for company capital', current_date - 290, 'goAML DEMO-PTR-1')
on conflict do nothing;

insert into concerns (id, ref, customer_id, matter_id, noticed_on, raised_by, description, suspicion, status, decided_on, decided_by, reason, lodged_on, receipt_ref) values
  ('90000000-0000-4000-8000-000000000001', 'K-001', '40000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000005', current_date - 14, 'James Liu',
    'Second cash deposit request. Director could not explain where the cash came from.', 'money laundering', 'to report', current_date - 10, 'Aroha Ngata', 'Cash with no explained source, pattern of structuring', null, null),
  ('90000000-0000-4000-8000-000000000002', 'K-002', '40000000-0000-4000-8000-000000000009', '70000000-0000-4000-8000-000000000007', current_date - 12, 'Mere Tane',
    'Large payment to an overseas account not linked to the orchard business.', 'money laundering', 'assessing', null, null, null, null, null),
  ('90000000-0000-4000-8000-000000000003', 'K-003', '40000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000008', current_date - 60, 'Mere Tane',
    'Asked to route funds through the firm trust account.', 'money laundering', 'not reported', current_date - 58, 'Mere Tane', 'Funds were a documented property settlement; bank statements on file', null, null),
  ('90000000-0000-4000-8000-000000000004', 'K-004', '40000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000008', current_date - 32, 'Mere Tane',
    'Second request to route third-party funds through the trust account, no documents.', 'money laundering', 'reported', current_date - 30, 'Mere Tane', 'Third-party funds with no explanation', current_date - 20, 'goAML DEMO-SAR-4'),
  ('90000000-0000-4000-8000-000000000005', 'K-005', '40000000-0000-4000-8000-000000000013', '70000000-0000-4000-8000-000000000011', current_date - 1, 'Tom Reilly',
    'Deposit paid by an unrelated company, purchaser changed twice.', 'money laundering', 'to report', current_date, 'Olivia Brennan', 'Third-party payer, nominee pattern', null, null)
on conflict do nothing;

insert into reviews (id, customer_id, reviewed_on, risk_rating, outcome, by_whom) values
  ('a0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000009', current_date - 210, 'low', 'No change. Same partners, same business.', 'Mere Tane'),
  ('a0000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000007', current_date - 1135, 'low', 'Onboarding review', 'Aroha Ngata')
on conflict do nothing;
