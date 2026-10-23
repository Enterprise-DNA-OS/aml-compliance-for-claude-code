-- AML Compliance for Claude Code: the AML/CFT (NZ) and AML/CTF (AU) programme and customer due diligence records.
-- Runs on PostgreSQL 15+ and on embedded PGlite. No extensions.
-- The rules (deadlines, review cycles, retention, thresholds) are rows, not code: /customise changes them with a new migration.

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- One row per rule parameter. applies_to narrows a rule to one sector (a NZ law firm reports a SAR in 5 working days, not 3).
-- unit 'working days' and 'business days' skip weekends and the holidays table; 'months after year end' counts from 30 June.
create table rules (
  code text primary key,
  jurisdiction text not null check (jurisdiction in ('AU','NZ')),
  topic text not null,
  value int not null check (value > 0),
  unit text not null check (unit in ('working days','business days','hours','days','months','years','dollars','months after year end')),
  applies_to text,
  policy_default boolean not null default false,
  rule text not null,
  source text not null
);

create table holidays (
  day date not null,
  jurisdiction text not null check (jurisdiction in ('AU','NZ')),
  name text not null,
  primary key (day, jurisdiction)
);

-- A reporting entity: the firm or office that holds the AML obligations.
create table entities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  jurisdiction text not null check (jurisdiction in ('AU','NZ')),
  sector text not null check (sector in ('law','accounting','conveyancing','real estate','trust and company services','other')),
  supervisor text not null,
  enrolment_ref text,
  compliance_officer text,
  co_appointed_on date,
  co_notified_on date,
  services_started_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Risk assessment, programme review, audit or independent evaluation, governing body report, annual report.
create table programme_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  kind text not null check (kind in ('risk assessment','programme review','audit','governing body report','annual report')),
  done_on date not null,
  period text,
  reference text,
  findings text,
  by_whom text not null,
  created_at timestamptz not null default now(),
  check (kind <> 'annual report' or period is not null)
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  name text not null,
  role text not null,
  aml_role boolean not null default true,
  vetted_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, name)
);

create table training (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id),
  course text not null,
  completed_on date not null,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  entity_id uuid not null references entities(id),
  name text not null,
  kind text not null check (kind in ('individual','company','trust','partnership','smsf','incorporated society','charity','other')),
  country text not null default 'NZ',
  email text,
  risk_rating text check (risk_rating in ('low','medium','high')),
  cdd_level text check (cdd_level in ('simplified','standard','enhanced')),
  pep text not null default 'none' check (pep in ('none','domestic','foreign','international organisation')),
  id_verified_on date,
  id_method text,
  source_of_wealth text,
  source_of_funds text,
  sow_verified_on date,
  approved_by text,
  approved_on date,
  status text not null default 'onboarding' check (status in ('onboarding','active','ended','declined')),
  started_on date not null default current_date,
  ended_on date,
  next_review_on date,
  notes text,
  source text not null default 'manual' check (source in ('manual','import')),
  source_ref text,
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'ended' or ended_on is not null)
);
create index customers_entity_idx on customers(entity_id);
create unique index customers_source_ref_idx on customers(source_ref) where source_ref is not null;

-- Beneficial owners, controllers, trustees and people acting on the customer's behalf.
create table beneficial_owners (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  name text not null,
  role text not null check (role in ('owner','controller','trustee','settlor','beneficiary','protector','acting on behalf','partner')),
  ownership_pct numeric(5,2) check (ownership_pct between 0 and 100),
  pep text not null default 'none' check (pep in ('none','domestic','foreign','international organisation')),
  id_verified_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, name, role)
);

-- Results recorded from whichever check provider the firm uses. This system records them; it does not run them.
create table checks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  owner_id uuid references beneficial_owners(id),
  kind text not null check (kind in ('identity','pep','sanctions','adverse media','address','company register')),
  result text not null check (result in ('clear','possible match','match','failed')),
  provider text not null,
  checked_on date not null,
  reference text,
  resolved_on date,
  resolution text,
  created_at timestamptz not null default now()
);

-- Matters, engagements or files: the designated service (AU) or captured activity (NZ) for a customer.
create table matters (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  customer_id uuid not null references customers(id),
  service text not null,
  owner text not null,
  opened_on date not null,
  closed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references matters(id),
  on_date date not null,
  method text not null check (method in ('cash','bank transfer','trust deposit','cheque','international wire')),
  direction text not null check (direction in ('in','out')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null check (currency in ('NZD','AUD')),
  note text,
  reported_on date,
  receipt_ref text,
  created_at timestamptz not null default now()
);

-- Unusual activity: raised, assessed, then reported (SAR in NZ, SMR in AU) or recorded as not reported, with the reason.
create table concerns (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  customer_id uuid not null references customers(id),
  matter_id uuid references matters(id),
  noticed_on date not null,
  raised_by text not null,
  description text not null,
  suspicion text not null default 'money laundering' check (suspicion in ('money laundering','terrorism financing','other offence')),
  status text not null default 'assessing' check (status in ('assessing','to report','reported','not reported')),
  decided_on date,
  decided_by text,
  reason text,
  lodged_on date,
  receipt_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'assessing' or decided_on is not null),
  check (status <> 'reported' or lodged_on is not null)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  reviewed_on date not null,
  risk_rating text not null check (risk_rating in ('low','medium','high')),
  outcome text not null,
  by_whom text not null,
  created_at timestamptz not null default now()
);

create table activity (
  id bigint generated always as identity primary key,
  entity_id text not null,
  action text not null,
  actor text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create trigger entities_touch before update on entities for each row execute function touch_updated_at();
create trigger staff_touch before update on staff for each row execute function touch_updated_at();
create trigger customers_touch before update on customers for each row execute function touch_updated_at();
create trigger owners_touch before update on beneficial_owners for each row execute function touch_updated_at();
create trigger matters_touch before update on matters for each row execute function touch_updated_at();
create trigger concerns_touch before update on concerns for each row execute function touch_updated_at();

-- ---------- the rules in force ----------
-- policy_default rows are this system's starting settings for what the law leaves to your programme. Change them with /customise.
insert into rules (code, jurisdiction, topic, value, unit, applies_to, policy_default, rule, source) values
('NZ-SAR', 'NZ', 'suspicious report', 3, 'working days', null, false, 'Report suspicious activity to the FIU no later than 3 working days after forming the suspicion.', 'AML/CFT Act 2009 s40; NZ Police FIU, Suspicious Activity and Transaction Reports'),
('NZ-SAR-LAW', 'NZ', 'suspicious report', 5, 'working days', 'law', false, 'A law firm reports suspicious activity no later than 5 working days after forming the suspicion.', 'AML/CFT Act 2009 s40, as amended by the Statutes Amendment Act 2025 (in force 27 November 2025)'),
('NZ-PTR', 'NZ', 'cash report', 20, 'working days', null, false, 'Report a large cash transaction (a prescribed transaction report) within 20 working days.', 'AML/CFT Act 2009 s48A, as amended by the Statutes Amendment Act 2025'),
('NZ-CASH', 'NZ', 'cash threshold', 10000, 'dollars', null, false, 'A cash transaction of NZ$10,000 or more is a large cash transaction.', 'AML/CFT Act 2009 s5 (large cash transaction) and s48A'),
('NZ-RETENTION', 'NZ', 'retention', 5, 'years', null, false, 'Keep CDD and transaction records for at least 5 years after the business relationship ends or the transaction completes.', 'AML/CFT Act 2009 s49 to s51'),
('NZ-AUDIT', 'NZ', 'audit', 36, 'months', null, false, 'Have the risk assessment and AML/CFT programme audited every 3 years (every 4 if DIA says so).', 'AML/CFT Act 2009 s59(2); AML/CFT (Requirements and Compliance) Amendment Regulations 2021'),
('NZ-RISK', 'NZ', 'risk assessment review', 12, 'months', null, true, 'Review the written risk assessment and keep it current. 12 months is this system''s default.', 'AML/CFT Act 2009 s58 and s59(1)'),
('NZ-PROGRAMME', 'NZ', 'programme review', 12, 'months', null, true, 'Review and maintain the AML/CFT programme. 12 months is this system''s default.', 'AML/CFT Act 2009 s57 and s59(1)'),
('NZ-ANNUAL', 'NZ', 'annual report', 2, 'months after year end', null, false, 'File the annual AML/CFT report for the year to 30 June with DIA by 31 August.', 'AML/CFT Act 2009 s60; DIA Annual AML/CFT Report'),
('NZ-TRAINING', 'NZ', 'training', 12, 'months', null, true, 'Train senior managers, the compliance officer and staff with AML/CFT duties. Yearly is this system''s default.', 'AML/CFT Act 2009 s57(1)(b)'),
('NZ-CONCERN', 'NZ', 'concern decision', 5, 'days', null, true, 'Decide whether unusual activity gives grounds to report. 5 days is this system''s default.', 'Your AML/CFT programme'),
('NZ-REVIEW-HIGH', 'NZ', 'review high', 12, 'months', null, true, 'Ongoing CDD review for a high risk customer every 12 months.', 'AML/CFT Act 2009 s31'),
('NZ-REVIEW-MEDIUM', 'NZ', 'review medium', 24, 'months', null, true, 'Ongoing CDD review for a medium risk customer every 24 months.', 'AML/CFT Act 2009 s31'),
('NZ-REVIEW-LOW', 'NZ', 'review low', 36, 'months', null, true, 'Ongoing CDD review for a low risk customer every 36 months.', 'AML/CFT Act 2009 s31'),
('AU-SMR', 'AU', 'suspicious report', 3, 'business days', null, false, 'Lodge a suspicious matter report within 3 business days of forming the suspicion (24 hours for terrorism financing).', 'AML/CTF Act 2006 s41; AUSTRAC, suspicious matter reports'),
('AU-TTR', 'AU', 'cash report', 10, 'business days', null, false, 'Lodge a threshold transaction report within 10 business days of a cash transaction of A$10,000 or more.', 'AML/CTF Act 2006 s43; AUSTRAC, threshold transaction reports'),
('AU-CASH', 'AU', 'cash threshold', 10000, 'dollars', null, false, 'Physical currency of A$10,000 or more is a threshold transaction.', 'AML/CTF Act 2006 s5 (threshold transaction)'),
('AU-RETENTION', 'AU', 'retention', 7, 'years', null, false, 'Keep customer identification, transaction and programme records for 7 years.', 'AML/CTF Act 2006 Part 10'),
('AU-EVALUATION', 'AU', 'audit', 36, 'months', null, false, 'Have the AML/CTF program independently evaluated at least once every 3 years.', 'AUSTRAC reform guidance, Step 5: conduct independent evaluation'),
('AU-POLICY', 'AU', 'programme review', 36, 'months', null, false, 'Review the AML/CTF policies at least once every 3 years, and record updates within 14 days.', 'AUSTRAC reform guidance, Step 4: review and update your AML/CTF program'),
('AU-RISK', 'AU', 'risk assessment review', 12, 'months', null, true, 'Review the ML/TF risk assessment when things change, and after adverse evaluation findings. 12 months is this system''s default.', 'AUSTRAC reform guidance, Step 4: review and update your AML/CTF program'),
('AU-GOVERNING-BODY', 'AU', 'governing body report', 12, 'months', null, false, 'The AML/CTF compliance officer reports to the governing body at least once every 12 months.', 'AUSTRAC reform guidance: AML/CTF compliance officer'),
('AU-CO-NOTIFY', 'AU', 'compliance officer notice', 14, 'days', null, false, 'Notify AUSTRAC of the AML/CTF compliance officer within 14 days of the appointment.', 'AUSTRAC reform guidance: AML/CTF compliance officer'),
('AU-ANNUAL', 'AU', 'annual report', 3, 'months after year end', null, false, 'Submit the compliance report for the year to 30 June to AUSTRAC by 30 September.', 'AML/CTF Act 2006 s47(2); AML/CTF Rules s9-9; AUSTRAC, annual compliance reports'),
('AU-TRAINING', 'AU', 'training', 12, 'months', null, true, 'Train personnel on the AML/CTF program. Yearly is this system''s default.', 'AML/CTF Act 2006 as amended 2024: personnel training'),
('AU-CONCERN', 'AU', 'concern decision', 3, 'days', null, true, 'Decide whether an unusual matter gives grounds to report. 3 days is this system''s default.', 'Your AML/CTF program'),
('AU-REVIEW-HIGH', 'AU', 'review high', 12, 'months', null, true, 'Ongoing CDD review for a high risk customer every 12 months.', 'AML/CTF Act 2006 as amended 2024: ongoing CDD'),
('AU-REVIEW-MEDIUM', 'AU', 'review medium', 24, 'months', null, true, 'Ongoing CDD review for a medium risk customer every 24 months.', 'AML/CTF Act 2006 as amended 2024: ongoing CDD'),
('AU-REVIEW-LOW', 'AU', 'review low', 36, 'months', null, true, 'Ongoing CDD review for a low risk customer every 36 months.', 'AML/CTF Act 2006 as amended 2024: ongoing CDD');

-- ---------- rule arithmetic ----------

create function rule_value(j text, t text, s text) returns int language sql stable as $$
  select value from rules where jurisdiction = j and topic = t and (applies_to is null or applies_to = s)
  order by applies_to is null limit 1
$$;

create function add_business_days(start_on date, n int, j text) returns date language sql stable as $$
  select d::date from generate_series(start_on + 1, start_on + n * 2 + 30, interval '1 day') d
  where extract(isodow from d) < 6 and not exists (select 1 from holidays h where h.day = d::date and h.jurisdiction = j)
  order by d offset greatest(n, 1) - 1 limit 1
$$;

-- The reporting year (1 July to 30 June) that ended most recently, as a label like 2025-26.
create function last_year_end(on_day date) returns date language sql immutable as $$
  select make_date(case when extract(month from on_day) >= 7 then extract(year from on_day)::int else extract(year from on_day)::int - 1 end, 6, 30)
$$;
create function year_label(year_end date) returns text language sql immutable as $$
  select (extract(year from year_end)::int - 1)::text || '-' || to_char(year_end, 'YY')
$$;

-- ---------- views ----------

create view customer_register as
select c.id, c.code, c.name, c.kind, c.country, c.status, e.code as entity, e.jurisdiction, e.sector,
       c.risk_rating, c.cdd_level, c.pep, c.id_verified_on, c.sow_verified_on, c.approved_on, c.started_on, c.ended_on, c.next_review_on,
       (select count(*)::int from beneficial_owners b where b.customer_id = c.id) as owners,
       (select count(*)::int from beneficial_owners b where b.customer_id = c.id and b.id_verified_on is null
          and b.role in ('owner','controller','trustee','partner','acting on behalf')) as owners_unverified,
       (select max(k.checked_on) from checks k where k.customer_id = c.id and k.kind = 'sanctions') as sanctions_checked_on,
       (select count(*)::int from checks k where k.customer_id = c.id and k.result in ('possible match','match') and k.resolved_on is null) as open_matches,
       (select count(*)::int from matters m where m.customer_id = c.id and m.closed_on is null) as open_matters,
       exists (select 1 from beneficial_owners b where b.customer_id = c.id and b.pep in ('foreign','international organisation')) as owner_foreign_pep
from customers c join entities e on e.id = c.entity_id;

create view report_deadlines as
select k.id as record_id, 'suspicious activity' as report, case x.jurisdiction when 'NZ' then 'SAR' else 'SMR' end as form, k.ref, x.entity, x.code as customer_code, x.name as customer,
       x.jurisdiction, k.decided_on as clock_from,
       case when x.jurisdiction = 'AU' and k.suspicion = 'terrorism financing' then k.decided_on + 1
            else add_business_days(k.decided_on, rule_value(x.jurisdiction, 'suspicious report', x.sector), x.jurisdiction) end as due_on,
       k.lodged_on, k.receipt_ref, k.status,
       (select code from rules r where r.jurisdiction = x.jurisdiction and r.topic = 'suspicious report' and (r.applies_to is null or r.applies_to = x.sector) order by r.applies_to is null limit 1) as rule
from concerns k join customer_register x on x.id = k.customer_id
where k.status in ('to report','reported')
union all
select t.id, 'cash over threshold', case x.jurisdiction when 'NZ' then 'PTR' else 'TTR' end, m.ref, x.entity, x.code, x.name, x.jurisdiction, t.on_date,
       add_business_days(t.on_date, rule_value(x.jurisdiction, 'cash report', x.sector), x.jurisdiction),
       t.reported_on, t.receipt_ref, case when t.reported_on is null then 'to report' else 'reported' end,
       (select code from rules r where r.jurisdiction = x.jurisdiction and r.topic = 'cash report' limit 1)
from transactions t join matters m on m.id = t.matter_id join customer_register x on x.id = m.customer_id
where t.method = 'cash' and t.direction = 'in' and t.amount_cents >= rule_value(x.jurisdiction, 'cash threshold', x.sector)::bigint * 100;

-- When each programme obligation was last met and when it is next due, per entity.
-- A risk assessment and a programme are needed before the first service, so with none on file they are due from that day.
create view programme_calendar as
with last as (
  select e.id, e.code, e.name, e.jurisdiction, e.sector, e.services_started_on, k.kind,
         (select max(p.done_on) from programme_events p where p.entity_id = e.id and p.kind = k.kind) as last_done,
         k.topic
  from entities e cross join (values ('risk assessment','risk assessment review'), ('programme review','programme review'),
    ('audit','audit'), ('governing body report','governing body report')) k(kind, topic)
)
select l.code as entity, l.name, l.jurisdiction,
       case when l.kind = 'audit' and l.jurisdiction = 'AU' then 'independent evaluation' else l.kind end as obligation,
       l.last_done,
       case when l.last_done is null and l.kind in ('risk assessment','programme review') then l.services_started_on
            else (coalesce(l.last_done, l.services_started_on) + make_interval(months => rule_value(l.jurisdiction, l.topic, l.sector)))::date end as next_due,
       (select code from rules r where r.jurisdiction = l.jurisdiction and r.topic = l.topic limit 1) as rule
from last l
where rule_value(l.jurisdiction, l.topic, l.sector) is not null
union all
select e.code, e.name, e.jurisdiction, 'annual report ' || year_label(last_year_end(current_date)),
       (select max(p.done_on) from programme_events p where p.entity_id = e.id and p.kind = 'annual report' and p.period = year_label(last_year_end(current_date))),
       ((last_year_end(current_date) + 1) + make_interval(months => rule_value(e.jurisdiction, 'annual report', e.sector)) - interval '1 day')::date,
       (select code from rules r where r.jurisdiction = e.jurisdiction and r.topic = 'annual report' limit 1)
from entities e
where last_year_end(current_date) >= e.services_started_on;

create view review_schedule as
select x.code, x.name, x.entity, x.jurisdiction, x.risk_rating, x.next_review_on, x.next_review_on - current_date as days_left,
       (select max(r.reviewed_on) from reviews r where r.customer_id = x.id) as last_reviewed
from customer_register x where x.status = 'active';

create view retention as
select x.code, x.name, x.entity, x.jurisdiction, x.ended_on,
       (x.ended_on + make_interval(years => rule_value(x.jurisdiction, 'retention', x.sector)))::date as keep_until,
       (select code from rules r where r.jurisdiction = x.jurisdiction and r.topic = 'retention' limit 1) as rule
from customer_register x where x.status = 'ended';

create view staff_register as
select s.id, e.code as entity, e.jurisdiction, s.name, s.role, s.aml_role, s.vetted_on, s.active,
       (select max(t.completed_on) from training t where t.staff_id = s.id) as last_trained,
       ((select max(t.completed_on) from training t where t.staff_id = s.id) + make_interval(months => rule_value(e.jurisdiction, 'training', e.sector)))::date as training_due
from staff s join entities e on e.id = s.entity_id;

-- Every rule check, one row per finding. severity 'breach' means the record shows a rule broken today.
create view compliance_findings as
  select 'CDD-BEFORE-SERVICE' as rule, 'breach' as severity, x.entity, x.code as ref,
         m.ref || ' opened ' || m.opened_on || ' before identity was verified' || coalesce(' (' || x.id_verified_on || ')', ' (still not verified)') as finding,
         case x.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s16' else 'AML/CTF Act 2006 s28, initial CDD' end as source
  from matters m join customer_register x on x.id = m.customer_id
  where x.id_verified_on is null or x.id_verified_on > m.opened_on
union all
  select 'TRUST-EDD', 'breach', x.entity, x.code, x.name || ' is a trust on ' || coalesce(x.cdd_level, 'no') || ' CDD. Trusts need enhanced CDD.', 'AML/CFT Act 2009 s22(1)(a)'
  from customer_register x where x.jurisdiction = 'NZ' and x.kind = 'trust' and x.status in ('onboarding','active') and coalesce(x.cdd_level, '') <> 'enhanced'
union all
  select 'PEP-EDD', 'breach', x.entity, x.code,
         x.name || case when x.pep in ('foreign','international organisation') then ' is a ' || x.pep || ' PEP' else ' has a foreign PEP as owner' end || ': ' ||
         concat_ws(', ', case when coalesce(x.cdd_level, '') <> 'enhanced' then 'not on enhanced CDD' end,
                         case when x.approved_on is null then 'no senior manager approval' end,
                         case when x.sow_verified_on is null then 'source of wealth not verified' end),
         case x.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s26' else 'AML/CTF Act 2006 as amended 2024: politically exposed persons' end
  from customer_register x
  where x.status in ('onboarding','active') and (x.pep in ('foreign','international organisation') or x.owner_foreign_pep)
    and (coalesce(x.cdd_level, '') <> 'enhanced' or x.approved_on is null or x.sow_verified_on is null)
union all
  select 'HIGH-RISK-EDD', 'breach', x.entity, x.code,
         x.name || ' is rated high risk: ' || concat_ws(', ', case when coalesce(x.cdd_level, '') <> 'enhanced' then 'not on enhanced CDD' end,
                                                          case when c.source_of_wealth is null and c.source_of_funds is null then 'no source of wealth or funds recorded' end),
         case x.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s22 and s23' else 'AML/CTF Act 2006 as amended 2024: enhanced CDD' end
  from customer_register x join customers c on c.id = x.id
  where x.status in ('onboarding','active') and x.risk_rating = 'high'
    and (coalesce(x.cdd_level, '') <> 'enhanced' or (c.source_of_wealth is null and c.source_of_funds is null))
union all
  select 'NOT-RATED', 'warning', x.entity, x.code, x.name || ' has no risk rating or CDD level', case x.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s58 and s14' else 'AML/CTF Act 2006 as amended 2024: customer risk' end
  from customer_register x where x.status in ('onboarding','active') and (x.risk_rating is null or x.cdd_level is null)
union all
  select 'OWNERS-MISSING', 'breach', x.entity, x.code, x.name || ' is a ' || x.kind || ' with no beneficial owners or controllers recorded',
         case x.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s15 and s17' else 'AML/CTF Act 2006 as amended 2024: beneficial owners' end
  from customer_register x where x.kind <> 'individual' and x.status in ('onboarding','active') and x.owners = 0
union all
  select 'OWNER-UNVERIFIED', 'warning', x.entity, x.code, x.owners_unverified || ' owner(s) or controller(s) of ' || x.name || ' not verified',
         case x.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s16' else 'AML/CTF Act 2006 as amended 2024: beneficial owners' end
  from customer_register x where x.status = 'active' and x.owners_unverified > 0
union all
  select 'SANCTIONS', 'warning', x.entity, x.code, x.name || ' has no sanctions screen on file',
         case x.jurisdiction when 'NZ' then 'Terrorism Suppression Act 2002, United Nations Act 1946 and Russia Sanctions Act 2022' else 'Autonomous Sanctions Act 2011 and Charter of the United Nations Act 1945' end
  from customer_register x where x.status in ('onboarding','active') and x.sanctions_checked_on is null
union all
  select 'MATCH-UNRESOLVED', 'breach', x.entity, x.code, k.kind || ' ' || k.result || ' from ' || k.provider || ' on ' || k.checked_on || ' not resolved',
         'Your programme: a possible match is cleared or escalated before the service goes ahead'
  from checks k join customer_register x on x.id = k.customer_id where k.result in ('possible match','match') and k.resolved_on is null
union all
  select 'REVIEW-OVERDUE', 'warning', x.entity, x.code, x.name || ' (' || coalesce(x.risk_rating, 'unrated') || ' risk) review was due ' || x.next_review_on,
         case x.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s31, ongoing CDD' else 'AML/CTF Act 2006 as amended 2024: ongoing CDD' end
  from customer_register x where x.status = 'active' and x.next_review_on < current_date
union all
  select 'REPORT-LATE', case when d.lodged_on is null then 'breach' else 'warning' end, d.entity, d.ref,
         d.form || ' for ' || d.customer || ' due ' || d.due_on || case when d.lodged_on is null then ', not lodged' else ', lodged late on ' || d.lodged_on end,
         (select source from rules r where r.code = d.rule)
  from report_deadlines d where (d.lodged_on is null and d.due_on < current_date) or d.lodged_on > d.due_on
union all
  select 'CONCERN-UNDECIDED', 'warning', x.entity, k.ref, 'raised ' || k.noticed_on || ' by ' || k.raised_by || ', still being assessed',
         'Your programme: decide within ' || rule_value(x.jurisdiction, 'concern decision', x.sector) || ' days whether there are grounds to report'
  from concerns k join customer_register x on x.id = k.customer_id
  where k.status = 'assessing' and k.noticed_on + rule_value(x.jurisdiction, 'concern decision', x.sector) < current_date
union all
  select 'CO-MISSING', 'breach', e.code, e.code, e.name || ' has no AML compliance officer recorded',
         case e.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s56(2)' else 'AUSTRAC reform guidance: AML/CTF compliance officer' end
  from entities e where e.compliance_officer is null
union all
  select 'CO-NOTIFY', 'breach', e.code, e.code,
         'compliance officer appointed ' || e.co_appointed_on || case when e.co_notified_on is null then ', AUSTRAC not notified' else ', AUSTRAC notified ' || e.co_notified_on end,
         (select source from rules r where r.code = 'AU-CO-NOTIFY')
  from entities e where e.jurisdiction = 'AU' and e.co_appointed_on is not null
    and coalesce(e.co_notified_on, current_date) > e.co_appointed_on + rule_value('AU', 'compliance officer notice', e.sector)
union all
  select case when p.obligation like 'annual report%' then 'ANNUAL-REPORT' else upper(replace(p.obligation, ' ', '-')) end,
         case when p.obligation like 'annual report%' or p.obligation in ('audit','independent evaluation') or p.last_done is null and p.obligation = 'risk assessment' then 'breach' else 'warning' end,
         p.entity, p.entity, p.obligation || ' was due ' || p.next_due || coalesce(', last done ' || p.last_done, ', none recorded'),
         (select source from rules r where r.code = p.rule)
  from programme_calendar p where p.next_due < current_date and (p.last_done is null or p.obligation not like 'annual report%')
union all
  select 'TRAINING', 'warning', s.entity, s.name, s.name || ' (' || s.role || ') ' || coalesce('last trained ' || s.last_trained || ', due ' || s.training_due, 'has no AML training recorded'),
         case s.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s57(1)(b)' else 'AML/CTF Act 2006 as amended 2024: personnel training' end
  from staff_register s where s.active and s.aml_role and (s.last_trained is null or s.training_due < current_date)
union all
  select 'VETTING', 'warning', s.entity, s.name, s.name || ' (' || s.role || ') has an AML role and no vetting recorded',
         case s.jurisdiction when 'NZ' then 'AML/CFT Act 2009 s57(1)(a)' else 'AML/CTF Act 2006 as amended 2024: personnel due diligence' end
  from staff_register s where s.active and s.aml_role and s.vetted_on is null;

-- What needs a person, worst first.
create view attention_queue as
  select 1 as rank, 'report overdue' as item, d.entity, d.ref, d.form || ' for ' || d.customer as detail, d.due_on
  from report_deadlines d where d.lodged_on is null and d.due_on < current_date
union all
  select 2, 'report due', d.entity, d.ref, d.form || ' for ' || d.customer, d.due_on
  from report_deadlines d where d.lodged_on is null and d.due_on >= current_date
union all
  select 3, 'match to clear', x.entity, x.code, k.kind || ' ' || k.result || ' (' || k.provider || ')', k.checked_on
  from checks k join customer_register x on x.id = k.customer_id where k.result in ('possible match','match') and k.resolved_on is null
union all
  select 4, 'concern to decide', x.entity, k.ref, x.name || ': ' || left(k.description, 60), k.noticed_on
  from concerns k join customer_register x on x.id = k.customer_id where k.status = 'assessing'
union all
  select 5, 'service before CDD', f.entity, f.ref, f.finding, null::date from compliance_findings f where f.rule = 'CDD-BEFORE-SERVICE'
union all
  select 6, 'enhanced CDD gap', f.entity, f.ref, f.finding, null::date from compliance_findings f where f.rule in ('PEP-EDD','HIGH-RISK-EDD','TRUST-EDD')
union all
  select 7, 'programme overdue', p.entity, p.entity, p.obligation, p.next_due from programme_calendar p
  where p.next_due < current_date and (p.last_done is null or p.obligation not like 'annual report%')
union all
  select 8, 'review overdue', r.entity, r.code, r.name || ' (' || coalesce(r.risk_rating, 'unrated') || ')', r.next_review_on
  from review_schedule r where r.next_review_on < current_date
union all
  select 9, 'onboarding stalled', x.entity, x.code, x.name || ' onboarding since ' || x.started_on, x.started_on
  from customer_register x where x.status = 'onboarding' and x.started_on < current_date - 14;

alter table rules enable row level security;
alter table holidays enable row level security;
alter table entities enable row level security;
alter table programme_events enable row level security;
alter table staff enable row level security;
alter table training enable row level security;
alter table customers enable row level security;
alter table beneficial_owners enable row level security;
alter table checks enable row level security;
alter table matters enable row level security;
alter table transactions enable row level security;
alter table concerns enable row level security;
alter table reviews enable row level security;
alter table activity enable row level security;
