// The AML desk: every read and write the CLI offers, in one place.
// scripts/aml.mjs parses the command line; scripts/smoke.mjs drives this directly.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { REPO_ROOT } from './db.mjs';
import { parseCsv } from './csv.mjs';
import { table } from './format.mjs';

export const TABLES = ['rules', 'holidays', 'entities', 'programme_events', 'staff', 'training', 'customers', 'beneficial_owners',
  'checks', 'matters', 'transactions', 'concerns', 'reviews', 'activity'];

// Reads with no arguments. Each is one query against the shared views.
export const READS = {
  entities: `select e.code, e.name, e.jurisdiction, e.sector, e.supervisor, e.compliance_officer, e.co_appointed_on, e.co_notified_on, e.services_started_on,
      (select count(*)::int from customers c where c.entity_id = e.id and c.status in ('onboarding','active')) as customers from entities e order by code`,
  owners: `select x.code, x.name as customer, b.name, b.role, b.ownership_pct, b.pep, b.id_verified_on from beneficial_owners b
      join customer_register x on x.id = b.customer_id order by x.code, b.role, b.name`,
  checks: `select x.code, x.name as customer, coalesce(b.name, x.name) as who, k.kind, k.result, k.provider, k.checked_on, k.reference, k.resolved_on
      from checks k join customer_register x on x.id = k.customer_id left join beneficial_owners b on b.id = k.owner_id order by k.checked_on desc, x.code`,
  matches: `select x.code, x.name as customer, k.id as check_id, k.kind, k.result, k.provider, k.checked_on, k.reference from checks k
      join customer_register x on x.id = k.customer_id where k.result in ('possible match','match') and k.resolved_on is null order by k.checked_on`,
  matters: `select m.ref, x.code, x.name as customer, x.entity, m.service, m.owner, m.opened_on, m.closed_on, x.id_verified_on from matters m
      join customer_register x on x.id = m.customer_id order by m.opened_on desc`,
  cash: `select form, ref, entity, customer, clock_from as received_on, due_on, lodged_on, receipt_ref, status from report_deadlines
      where report = 'cash over threshold' order by clock_from desc`,
  concerns: `select k.ref, x.code, x.name as customer, x.entity, k.noticed_on, k.raised_by, k.suspicion, k.status, k.decided_on, k.lodged_on from concerns k
      join customer_register x on x.id = k.customer_id order by k.noticed_on desc`,
  reports: 'select form, report, ref, entity, customer, clock_from, due_on, lodged_on, receipt_ref, status, rule from report_deadlines order by due_on desc',
  'reviews-due': 'select code, name, entity, risk_rating, last_reviewed, next_review_on, days_left from review_schedule where next_review_on <= current_date + 60 order by next_review_on',
  programme: 'select entity, obligation, last_done, next_due, next_due - current_date as days_left, rule from programme_calendar order by next_due',
  staff: 'select entity, name, role, aml_role, vetted_on, last_trained, training_due, active from staff_register order by entity, name',
  'training-due': `select entity, name, role, last_trained, training_due from staff_register
      where active and aml_role and (last_trained is null or training_due <= current_date + 30) order by training_due nulls first, name`,
  retention: 'select code, name, entity, ended_on, keep_until, rule from retention order by keep_until',
  rules: 'select code, jurisdiction, topic, value, unit, applies_to, policy_default, rule, source from rules order by jurisdiction, topic, code',
  attention: 'select item, entity, ref, detail, due_on from attention_queue order by rank, due_on nulls last, ref',
  compliance: `select rule, severity, entity, ref, finding, source from compliance_findings
      order by case severity when 'breach' then 0 else 1 end, rule, entity, ref`,
  activity: 'select entity_id, action, actor, detail, created_at from activity order by created_at desc, id desc limit 50',
};

// Ten questions, each one query. /insights runs them all.
export const QUESTIONS = [
  ['How many customers sit at each risk rating, by firm?',
    `select entity, coalesce(risk_rating, 'unrated') as risk, count(*)::int as customers from customer_register where status in ('onboarding','active') group by 1, 2 order by 1, 2`],
  ['How long does onboarding take, from first contact to identity verified?',
    `select entity, count(*)::int as verified, round(avg(id_verified_on - started_on))::int as avg_days, max(id_verified_on - started_on) as worst_days
     from customer_register where id_verified_on is not null group by entity order by entity`],
  ['Which customers are on enhanced CDD, and why?',
    `select code, name, entity, kind, risk_rating, pep from customer_register where cdd_level = 'enhanced' order by entity, code`],
  ['Which matters started before the customer was verified?',
    `select m.ref, x.code, x.name, m.opened_on, x.id_verified_on from matters m join customer_register x on x.id = m.customer_id
     where x.id_verified_on is null or x.id_verified_on > m.opened_on order by m.opened_on`],
  ['Which customers bring the most cash?',
    `select x.code, x.name, t.currency, count(*)::int as cash_payments, sum(t.amount_cents)::bigint as cash_cents from transactions t
     join matters m on m.id = t.matter_id join customer_register x on x.id = m.customer_id where t.method = 'cash' group by 1, 2, 3 order by cash_cents desc`],
  ['How many concerns were raised, and how many became a report?',
    `select x.entity, count(*)::int as raised, count(*) filter (where k.status = 'reported')::int as reported,
       count(*) filter (where k.status = 'not reported')::int as not_reported, count(*) filter (where k.status in ('assessing','to report'))::int as open
     from concerns k join customer_register x on x.id = k.customer_id group by 1 order by 1`],
  ['How many days from noticing something to lodging the report?',
    `select k.ref, x.name, k.noticed_on, k.decided_on, k.lodged_on, k.lodged_on - k.noticed_on as days_noticed_to_lodged from concerns k
     join customer_register x on x.id = k.customer_id where k.lodged_on is not null order by k.lodged_on desc`],
  ['Which staff with AML duties are untrained or unvetted?',
    `select entity, name, role, last_trained, vetted_on from staff_register where active and aml_role and (last_trained is null or vetted_on is null or training_due < current_date) order by entity, name`],
  ['Which countries do our customers come from, and at what risk?',
    `select country, count(*)::int as customers, count(*) filter (where risk_rating = 'high')::int as high_risk from customers where status in ('onboarding','active') group by 1 order by 2 desc, 1`],
  ['Which records can we lawfully dispose of this year?',
    `select code, name, entity, ended_on, keep_until from retention where keep_until <= make_date(extract(year from current_date)::int, 12, 31) order by keep_until`],
];

// Command name -> [positional args, allowed flags]. Unknown flags fail before anything is written.
const SPECS = {
  ...Object.fromEntries(Object.keys(READS).map((k) => [k, [0, []]])),
  customers: [0, ['entity', 'risk', 'status']],
  customer: [1, []],
  insights: [0, []],
  'add-entity': [0, ['actor', 'code', 'name', 'jurisdiction', 'sector', 'supervisor', 'enrolment', 'started']],
  officer: [1, ['actor', 'name', 'appointed', 'notified']],
  event: [1, ['actor', 'kind', 'on', 'period', 'reference', 'findings', 'by']],
  'add-staff': [0, ['actor', 'entity', 'name', 'role', 'no-aml-role']],
  vet: [1, ['actor', 'on']],
  train: [1, ['actor', 'course', 'on']],
  'add-customer': [0, ['actor', 'entity', 'code', 'name', 'kind', 'country', 'email', 'notes']],
  'add-owner': [1, ['actor', 'name', 'role', 'pct', 'pep']],
  check: [1, ['actor', 'kind', 'result', 'provider', 'on', 'reference', 'owner']],
  clear: [1, ['actor', 'on', 'note']],
  verify: [1, ['actor', 'on', 'method', 'owner']],
  rate: [1, ['actor', 'risk', 'cdd', 'pep']],
  wealth: [1, ['actor', 'wealth', 'funds', 'verified']],
  approve: [1, ['actor', 'by', 'on']],
  activate: [1, ['actor']],
  'open-matter': [1, ['actor', 'ref', 'service', 'owner', 'on']],
  'close-matter': [1, ['actor', 'on']],
  transaction: [1, ['actor', 'on', 'method', 'direction', 'amount', 'currency', 'note']],
  review: [1, ['actor', 'on', 'risk', 'outcome']],
  end: [1, ['actor', 'on']],
  flag: [1, ['actor', 'matter', 'on', 'description', 'suspicion']],
  decide: [1, ['actor', 'on', 'report', 'no-report', 'reason']],
  lodge: [1, ['actor', 'on', 'receipt']],
  'add-holiday': [0, ['actor', 'day', 'jurisdiction', 'name']],
  import: [2, ['actor', 'entity', 'map', 'dry-run']],
  export: [0, ['file']],
  'weekly-review': [0, []],
  'draft-edd': [1, []],
  'draft-report': [1, []],
  'draft-officer-report': [1, []],
  'draft-annual-report': [1, []],
};
export const COMMANDS = Object.keys(SPECS);

export function help() {
  return `AML desk. node scripts/aml.mjs <command> [arguments] [--key=value] [--json]
${COMMANDS.join(', ')}
Exact syntax: docs/cli.md. Nothing here runs an identity check, sends an email or lodges a report with the FIU, DIA or AUSTRAC.`;
}

// ---------- small helpers ----------

const BOOL_FLAGS = new Set(['dry-run', 'no-aml-role', 'report', 'no-report', 'verified']);
function flag(o, k) { return o[k] === true; }
function required(o, k) {
  const v = o[k];
  if (typeof v !== 'string' || !v.trim()) throw Error(`Required --${k}=value`);
  return v.trim();
}
function optional(o, k) {
  const v = o[k];
  if (v === undefined) return null;
  if (typeof v !== 'string' || !v.trim()) throw Error(`--${k} needs a value`);
  return v.trim();
}
function oneOf(v, list, label) {
  const s = String(v).toLowerCase();
  if (!list.includes(s)) throw Error(`${label} must be one of: ${list.join(', ')}`);
  return s;
}
export function today() { return new Date().toISOString().slice(0, 10); }
export function isoDate(s, label = 'date') {
  const v = String(s ?? '');
  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = dmy ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` : v.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) !== iso) throw Error(`Invalid ${label}: ${s} (use YYYY-MM-DD)`);
  return iso;
}
function dateOpt(o, k = 'on') {
  const d = isoDate(o[k] ?? today(), `--${k}`);
  if (d > today()) throw Error(`--${k} cannot be in the future`);
  return d;
}
export function cents(value) {
  const s = String(value ?? '').replace(/^\$/, '').replaceAll(',', '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(s)) throw Error('Amount must be a dollar figure like 12000 or 12000.00');
  const [a, b = ''] = s.split('.');
  const c = Number(a) * 100 + Number(b.padEnd(2, '0'));
  if (c <= 0) throw Error('Amount must be more than zero');
  return c;
}
function actor(o) { return optional(o, 'actor') || 'operator'; }
const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

const KINDS = ['individual', 'company', 'trust', 'partnership', 'smsf', 'incorporated society', 'charity', 'other'];
const ROLES = ['owner', 'controller', 'trustee', 'settlor', 'beneficiary', 'protector', 'acting on behalf', 'partner'];
const PEPS = ['none', 'domestic', 'foreign', 'international organisation'];
const CHECK_KINDS = ['identity', 'pep', 'sanctions', 'adverse media', 'address', 'company register'];
const RESULTS = ['clear', 'possible match', 'match', 'failed'];
const METHODS = ['cash', 'bank transfer', 'trust deposit', 'cheque', 'international wire'];
const EVENTS = ['risk assessment', 'programme review', 'audit', 'governing body report', 'annual report'];
const SECTORS = ['law', 'accounting', 'conveyancing', 'real estate', 'trust and company services', 'other'];

async function audit(db, id, action, who, detail = {}) {
  await db.query('insert into activity (entity_id, action, actor, detail) values ($1, $2, $3, $4)', [String(id), action, who, JSON.stringify(detail)]);
}
async function one(db, sql, params) { return (await db.query(sql, params))[0]; }

// Find one record by code, id prefix or name. Ambiguous or missing: list and stop.
async function pick(db, kind, ref) {
  if (!ref) throw Error(`Missing ${kind} reference`);
  const q = {
    customer: 'select id, code as key, name from customers order by code',
    entity: 'select id, code as key, name from entities order by code',
    staff: "select s.id, e.code || '/' || s.name as key, s.name from staff s join entities e on e.id = s.entity_id order by 2",
    matter: 'select id, ref as key, service as name from matters order by ref',
    concern: 'select id, ref as key, description as name from concerns order by ref',
    check: "select k.id, k.id::text as key, c.name || ' ' || k.kind as name from checks k join customers c on c.id = k.customer_id order by k.checked_on",
    transaction: "select t.id, t.id::text as key, m.ref || ' ' || t.method as name from transactions t join matters m on m.id = t.matter_id order by t.on_date",
  }[kind];
  const rows = await db.query(q);
  const r = String(ref).toLowerCase();
  let hits = rows.filter((x) => same(x.key, ref) || same(x.id, ref) || same(x.name, ref));
  if (!hits.length) hits = rows.filter((x) => String(x.id).toLowerCase().startsWith(r) || String(x.key).toLowerCase().endsWith(r) || String(x.key).toLowerCase().startsWith(r) || String(x.name).toLowerCase().includes(r));
  if (hits.length !== 1) {
    throw Error(`${hits.length ? 'Ambiguous' : 'No matching'} ${kind}: ${ref}\n${(hits.length ? hits : rows).slice(0, 30).map((x) => `  ${x.key}  ${x.name}`).join('\n')}`);
  }
  return hits[0];
}
async function customerRow(db, ref) {
  const hit = await pick(db, 'customer', ref);
  return one(db, 'select c.*, e.jurisdiction, e.sector, e.code as entity from customers c join entities e on e.id = c.entity_id where c.id = $1', [hit.id]);
}
async function ownerOf(db, c, name) {
  const rows = await db.query('select id, name, role from beneficial_owners where customer_id = $1 order by name', [c.id]);
  const hits = rows.filter((b) => same(b.name, name) || String(b.id).startsWith(String(name).toLowerCase()));
  if (hits.length !== 1) throw Error(`${hits.length ? 'Ambiguous' : 'No matching'} owner of ${c.code}: ${name}\n${rows.map((b) => `  ${b.name} (${b.role})`).join('\n')}`);
  return hits[0];
}
async function update(db, tableName, id, values) {
  const keys = Object.keys(values);
  return one(db, `update ${tableName} set ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1 returning *`, [id, ...Object.values(values)]);
}
async function insert(db, tableName, values) {
  const keys = Object.keys(values);
  return one(db, `insert into ${tableName} (${keys.join(', ')}) values (${keys.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`, Object.values(values));
}
async function nextCode(db, tableName, column, prefix, width) {
  const rows = await db.query(`select ${column} as code from ${tableName} where ${column} like $1`, [prefix + '%']);
  const max = rows.map((x) => Number(String(x.code).slice(prefix.length))).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(max + 1).padStart(width, '0');
}
async function nextReview(db, c, rating, from) {
  const r = await one(db, "select (($1::date) + make_interval(months => rule_value($2, 'review ' || $3, $4)))::date as d", [from, c.jurisdiction, rating, c.sector]);
  return r.d;
}
function live(c) { if (['ended', 'declined'].includes(c.status)) throw Error(`${c.code} is ${c.status}. Its record cannot change through the CLI.`); }

function writeFile(file, content) {
  const f = path.resolve(file);
  fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 });
  fs.writeFileSync(f, content, { flag: 'wx', mode: 0o600 });
  return f;
}
function outDir() { return process.env.OUTPUT_DIR || REPO_ROOT; }
function draft(name, body) {
  return { file: writeFile(path.join(outDir(), 'drafts', `${name}-${today()}-${randomUUID().slice(0, 8)}.md`), body) };
}

// ---------- output ----------

function show(v, key) {
  if (v == null) return '';
  if (key.endsWith('_cents')) return (Number(v) / 100).toFixed(2);
  if (typeof v === 'object') return v instanceof Date ? v.toISOString().slice(0, 10) : JSON.stringify(v);
  return v;
}
function render(rows) {
  if (!rows.length) return '(none)';
  return table(rows, Object.keys(rows[0]).map((key) => ({ key, label: key.replace(/_cents$/, '').replaceAll('_', ' '), format: (v) => show(v, key) })));
}
export function human(result) {
  if (Array.isArray(result) && result[0]?.question) return result.map((x) => `${x.question}\n${render(x.rows)}`).join('\n\n');
  if (Array.isArray(result)) return render(result);
  if (result && result.customer) {
    const c = result.customer;
    const head = Object.entries(c).filter(([k, v]) => v != null && v !== false && k !== 'id').map(([k, v]) => `  ${k.replaceAll('_', ' ').padEnd(22)} ${show(v, k)}`).join('\n');
    return `${c.code}  ${c.name}\n${head}\n\nOwners and controllers\n${render(result.owners)}\n\nChecks\n${render(result.checks)}\n\nMatters\n${render(result.matters)}\n\nConcerns\n${render(result.concerns)}\n\nRule findings\n${render(result.findings)}\n\nHistory\n${render(result.history)}`;
  }
  return JSON.stringify(result, null, 2);
}

// ---------- import: a First AML case list saved as CSV ----------

// Headings in plain words. First AML's case and report downloads differ by report and jurisdiction: point yours at these with --map=file.json.
export const IMPORT_COLUMNS = ['Case ID', 'Entity name', 'Entity type', 'Office', 'Assigned to', 'Status', 'Risk rating', 'Received', 'Completed',
  'PEP', 'Sanctions', 'Country', 'Email'];
const IMPORT_REQUIRED = ['Case ID', 'Entity name', 'Entity type', 'Status', 'Received'];
const TYPE_MAP = { individual: 'individual', person: 'individual', 'private company': 'company', company: 'company', 'public company': 'company',
  'limited company': 'company', trust: 'trust', 'family trust': 'trust', partnership: 'partnership', 'limited partnership': 'partnership',
  smsf: 'smsf', 'self managed super fund': 'smsf', 'incorporated society': 'incorporated society', charity: 'charity', 'registered charity': 'charity' };
const STATUS_MAP = { completed: 'active', approved: 'active', 'in progress': 'onboarding', 'ready for review': 'onboarding', 'awaiting client': 'onboarding',
  abandoned: 'declined', rejected: 'declined', archived: 'ended' };

async function importCases(db, args, o) {
  const [kind, file] = args;
  if (kind !== 'first-aml') throw Error('Supported import: first-aml (a First AML case list saved as CSV)');
  const dry = flag(o, 'dry-run');
  const who = actor(o);
  const map = o.map ? JSON.parse(fs.readFileSync(path.resolve(String(o.map)), 'utf8')) : {};
  for (const k of Object.keys(map)) if (!IMPORT_COLUMNS.includes(k)) throw Error(`--map names an unknown field: ${k}`);
  const rows = parseCsv(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!rows.length) throw Error('The file has no rows');
  const heading = (k) => map[k] || k;
  const known = new Set(IMPORT_COLUMNS.map(heading));
  for (const h of Object.keys(rows[0])) if (!known.has(h)) throw Error(`Unknown column "${h}". Map it with --map or remove it.`);
  for (const k of IMPORT_REQUIRED) if (!(heading(k) in rows[0])) throw Error(`Missing column "${heading(k)}"`);
  const get = (r, k) => String(r[heading(k)] ?? '').trim();
  const entities = await db.query('select id, code, name, jurisdiction, sector from entities');
  const fallback = o.entity ? await pick(db, 'entity', String(o.entity)) : null;
  const seen = new Set();
  const result = { file: path.resolve(file), rows: rows.length, inserted: 0, skipped: 0, dry_run: dry };

  await db.exec('BEGIN');
  try {
    for (const [i, r] of rows.entries()) {
      const line = `row ${i + 2}`;
      const ref = get(r, 'Case ID');
      if (!ref) throw Error(`${line}: no Case ID`);
      if (seen.has(ref.toLowerCase())) throw Error(`${line}: duplicate Case ID ${ref}`);
      seen.add(ref.toLowerCase());
      for (const k of IMPORT_REQUIRED) if (!get(r, k)) throw Error(`${line}: ${k} is empty`);
      const hash = createHash('sha256').update(JSON.stringify(IMPORT_COLUMNS.map((k) => get(r, k)))).digest('hex');
      const existing = await one(db, 'select id, source_hash from customers where source_ref = $1', ['first-aml:' + ref]);
      if (existing) {
        if (existing.source_hash === hash) { result.skipped++; continue; }
        throw Error(`${line}: Changed import row for case ${ref}. It is already in the register with different values; correct it with the commands, not a re-import.`);
      }
      const office = get(r, 'Office');
      const ent = office ? entities.find((e) => same(e.code, office) || same(e.name, office)) || fallback : fallback;
      if (!ent) throw Error(`${line}: office "${office}" is not set up. Add it with add-entity or pass --entity.`);
      const kindText = get(r, 'Entity type').toLowerCase();
      const ckind = TYPE_MAP[kindText] || (KINDS.includes(kindText) ? kindText : 'other');
      const status = STATUS_MAP[get(r, 'Status').toLowerCase()];
      if (!status) throw Error(`${line}: Status "${get(r, 'Status')}" is not one of ${Object.keys(STATUS_MAP).join(', ')}`);
      const received = isoDate(get(r, 'Received'), `${line} Received`);
      const completed = get(r, 'Completed') ? isoDate(get(r, 'Completed'), `${line} Completed`) : null;
      if (status === 'active' && !completed) throw Error(`${line}: a completed case needs a Completed date`);
      const riskText = get(r, 'Risk rating').toLowerCase();
      const risk = !riskText ? null : riskText.startsWith('low') ? 'low' : riskText.startsWith('med') ? 'medium' : riskText.startsWith('high') ? 'high' : null;
      if (riskText && !risk) throw Error(`${line}: Risk rating must be Low, Medium or High`);
      const pepText = get(r, 'PEP').toLowerCase();
      const pep = !pepText || ['no', 'none', 'false', 'n'].includes(pepText) ? 'none' : pepText.includes('domestic') ? 'domestic'
        : pepText.includes('international') ? 'international organisation' : 'foreign';
      const country = (get(r, 'Country') || ent.jurisdiction).toUpperCase();
      const code = await nextCode(db, 'customers', 'code', 'IMP-', 4);
      const ended = status === 'ended' ? (completed || received) : null;
      const c = await insert(db, 'customers', {
        code, entity_id: ent.id, name: get(r, 'Entity name'), kind: ckind, country, email: get(r, 'Email') || null,
        risk_rating: risk, cdd_level: risk === 'high' || pep === 'foreign' || pep === 'international organisation' || (ent.jurisdiction === 'NZ' && ckind === 'trust') ? 'enhanced' : risk ? 'standard' : null,
        pep, id_verified_on: status === 'active' || status === 'ended' ? completed : null, id_method: status === 'active' ? 'First AML case ' + ref : null,
        status, started_on: received, ended_on: ended, notes: get(r, 'Assigned to') ? 'Assigned to ' + get(r, 'Assigned to') + ' in First AML' : null,
        source: 'import', source_ref: 'first-aml:' + ref, source_hash: hash,
      });
      if (status === 'active' && risk) await update(db, 'customers', c.id, { next_review_on: await nextReview(db, { ...ent }, risk, completed) });
      const sanctions = get(r, 'Sanctions').toLowerCase();
      if (sanctions) {
        const res = sanctions.startsWith('clear') || sanctions === 'no match' || sanctions === 'none' ? 'clear' : sanctions.includes('possible') ? 'possible match' : 'match';
        await insert(db, 'checks', { customer_id: c.id, kind: 'sanctions', result: res, provider: 'First AML', checked_on: completed || received, reference: ref });
      }
      if (pep !== 'none') await insert(db, 'checks', { customer_id: c.id, kind: 'pep', result: 'match', provider: 'First AML', checked_on: completed || received, reference: ref,
        resolved_on: completed || received, resolution: `Imported as ${pep} PEP` });
      await audit(db, c.id, 'import', who, { case: ref, file: path.basename(file) });
      result.inserted++;
    }
    await db.exec(dry ? 'ROLLBACK' : 'COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
  return result;
}

// ---------- the commands ----------

export async function run(db, cmd, args = [], o = {}) {
  const spec = SPECS[cmd];
  if (!spec) throw Error(`Unknown command: ${cmd}\n${help()}`);
  if (args.length !== spec[0]) throw Error(`${cmd} takes ${spec[0]} argument(s), got ${args.length}`);
  for (const k of Object.keys(o)) {
    if (!spec[1].includes(k)) throw Error(`Unknown flag --${k} for ${cmd}`);
    if (!BOOL_FLAGS.has(k) && o[k] === true) throw Error(`--${k} needs a value`);
    if (BOOL_FLAGS.has(k) && o[k] !== true) throw Error(`--${k} takes no value`);
  }
  if (READS[cmd]) return db.query(READS[cmd]);
  const who = () => actor(o);

  switch (cmd) {
    case 'customers': {
      const where = [];
      const params = [];
      for (const [k, col] of [['entity', 'entity'], ['risk', "coalesce(risk_rating, 'unrated')"], ['status', 'status']]) {
        if (o[k]) { params.push(String(o[k]).toLowerCase()); where.push(`lower(${col}) = $${params.length}`); }
      }
      return db.query(`select code, name, entity, kind, status, risk_rating, cdd_level, pep, id_verified_on, owners, open_matters, next_review_on
        from customer_register ${where.length ? 'where ' + where.join(' and ') : ''} order by entity, code`, params);
    }
    case 'insights': {
      const out = [];
      for (const [question, sql] of QUESTIONS) out.push({ question, rows: await db.query(sql) });
      return out;
    }
    case 'customer': {
      const c = await customerRow(db, args[0]);
      return {
        customer: await one(db, `select x.*, c.email, c.id_method, c.source_of_wealth, c.source_of_funds, c.approved_by, c.notes
          from customer_register x join customers c on c.id = x.id where x.id = $1`, [c.id]),
        owners: await db.query('select name, role, ownership_pct, pep, id_verified_on from beneficial_owners where customer_id = $1 order by role, name', [c.id]),
        checks: await db.query(`select k.kind, coalesce(b.name, 'customer') as who, k.result, k.provider, k.checked_on, k.reference, k.resolved_on, k.resolution
          from checks k left join beneficial_owners b on b.id = k.owner_id where k.customer_id = $1 order by k.checked_on`, [c.id]),
        matters: await db.query('select ref, service, owner, opened_on, closed_on from matters where customer_id = $1 order by opened_on', [c.id]),
        concerns: await db.query('select ref, noticed_on, status, decided_on, lodged_on from concerns where customer_id = $1 order by noticed_on', [c.id]),
        findings: await db.query('select rule, severity, finding from compliance_findings where ref = $1 order by rule', [c.code]),
        history: await db.query('select action, actor, detail, created_at from activity where entity_id = $1 order by created_at, id', [c.id]),
      };
    }

    case 'add-entity': {
      const jurisdiction = oneOf(required(o, 'jurisdiction'), ['au', 'nz'], '--jurisdiction').toUpperCase();
      const e = await insert(db, 'entities', { code: required(o, 'code').toUpperCase(), name: required(o, 'name'), jurisdiction,
        sector: oneOf(required(o, 'sector'), SECTORS, '--sector'), supervisor: optional(o, 'supervisor') || (jurisdiction === 'NZ' ? 'DIA' : 'AUSTRAC'),
        enrolment_ref: optional(o, 'enrolment'), services_started_on: isoDate(required(o, 'started'), '--started') });
      await audit(db, e.id, 'add-entity', who(), { code: e.code });
      return e;
    }
    case 'officer': {
      const e = await pick(db, 'entity', args[0]);
      const appointed = isoDate(o.appointed ?? today(), '--appointed');
      const notified = o.notified ? isoDate(o.notified, '--notified') : null;
      if (notified && notified < appointed) throw Error('--notified cannot be before --appointed');
      const row = await update(db, 'entities', e.id, { compliance_officer: required(o, 'name'), co_appointed_on: appointed, co_notified_on: notified });
      await audit(db, e.id, 'officer', who(), { name: row.compliance_officer, appointed, notified });
      const due = await one(db, "select ($1::date + rule_value('AU', 'compliance officer notice', $2))::date as d", [appointed, row.sector]);
      return { ...row, notify_austrac_by: row.jurisdiction === 'AU' ? due.d : null };
    }
    case 'event': {
      const e = await pick(db, 'entity', args[0]);
      const kind = oneOf(required(o, 'kind'), EVENTS, '--kind');
      const period = optional(o, 'period');
      if (kind === 'annual report' && !/^\d{4}-\d{2}$/.test(period || '')) throw Error('An annual report needs --period=YYYY-YY, the year to 30 June it covers');
      const row = await insert(db, 'programme_events', { entity_id: e.id, kind, done_on: dateOpt(o), period, reference: optional(o, 'reference'),
        findings: optional(o, 'findings'), by_whom: required(o, 'by') });
      await audit(db, e.id, 'event', who(), { kind, on: row.done_on, period });
      return db.query('select obligation, last_done, next_due, rule from programme_calendar where entity = $1 order by next_due', [e.key]);
    }
    case 'add-staff': {
      const e = await pick(db, 'entity', required(o, 'entity'));
      const s = await insert(db, 'staff', { entity_id: e.id, name: required(o, 'name'), role: required(o, 'role'), aml_role: !flag(o, 'no-aml-role') });
      await audit(db, s.id, 'add-staff', who(), { entity: e.key, name: s.name });
      return s;
    }
    case 'vet': {
      const s = await pick(db, 'staff', args[0]);
      const row = await update(db, 'staff', s.id, { vetted_on: dateOpt(o) });
      await audit(db, s.id, 'vet', who(), { on: row.vetted_on });
      return row;
    }
    case 'train': {
      const s = await pick(db, 'staff', args[0]);
      const row = await insert(db, 'training', { staff_id: s.id, course: required(o, 'course'), completed_on: dateOpt(o) });
      await audit(db, s.id, 'train', who(), { course: row.course, on: row.completed_on });
      return one(db, 'select entity, name, last_trained, training_due from staff_register where id = $1', [s.id]);
    }
    case 'add-customer': {
      const e = await pick(db, 'entity', required(o, 'entity'));
      const ent = await one(db, 'select jurisdiction from entities where id = $1', [e.id]);
      const code = optional(o, 'code') || await nextCode(db, 'customers', 'code', 'C-', 4);
      const c = await insert(db, 'customers', { code, entity_id: e.id, name: required(o, 'name'), kind: oneOf(required(o, 'kind'), KINDS, '--kind'),
        country: (optional(o, 'country') || ent.jurisdiction).toUpperCase(), email: optional(o, 'email'), notes: optional(o, 'notes') });
      await audit(db, c.id, 'add-customer', who(), { code });
      const gaps = await db.query('select rule, finding from compliance_findings where ref = $1 order by rule', [code]);
      return { code, name: c.name, kind: c.kind, status: c.status, next: gaps.map((g) => g.rule) };
    }
    case 'add-owner': {
      const c = await customerRow(db, args[0]);
      live(c);
      if (c.kind === 'individual' && required(o, 'role') !== 'acting on behalf') throw Error(`${c.code} is an individual. Record someone acting on their behalf with --role="acting on behalf".`);
      const pct = o.pct !== undefined ? Number(o.pct) : null;
      if (pct != null && !(pct >= 0 && pct <= 100)) throw Error('--pct must be from 0 to 100');
      const b = await insert(db, 'beneficial_owners', { customer_id: c.id, name: required(o, 'name'), role: oneOf(required(o, 'role'), ROLES, '--role'),
        ownership_pct: pct, pep: oneOf(o.pep ?? 'none', PEPS, '--pep') });
      await audit(db, c.id, 'add-owner', who(), { name: b.name, role: b.role, pct });
      return b;
    }
    case 'check': {
      const c = await customerRow(db, args[0]);
      live(c);
      const owner = o.owner ? await ownerOf(db, c, required(o, 'owner')) : null;
      const k = await insert(db, 'checks', { customer_id: c.id, owner_id: owner?.id ?? null, kind: oneOf(required(o, 'kind'), CHECK_KINDS, '--kind'),
        result: oneOf(required(o, 'result'), RESULTS, '--result'), provider: required(o, 'provider'), checked_on: dateOpt(o), reference: optional(o, 'reference') });
      await audit(db, c.id, 'check', who(), { kind: k.kind, result: k.result, provider: k.provider, owner: owner?.name });
      return { ...k, next: k.result === 'clear' ? null : 'Clear it with a note (clear <check id>) or escalate. The service does not go ahead until it is resolved.' };
    }
    case 'clear': {
      const k = await pick(db, 'check', args[0]);
      const row = await one(db, 'select * from checks where id = $1', [k.id]);
      if (row.result === 'clear') throw Error('That check was clear. Nothing to resolve.');
      if (row.resolved_on) throw Error(`That check was resolved on ${row.resolved_on}`);
      const on = dateOpt(o);
      if (on < String(row.checked_on)) throw Error('Resolution cannot predate the check');
      const out = await update(db, 'checks', k.id, { resolved_on: on, resolution: required(o, 'note') });
      await audit(db, row.customer_id, 'clear', who(), { check: k.id, note: out.resolution });
      return out;
    }
    case 'verify': {
      const c = await customerRow(db, args[0]);
      live(c);
      const on = dateOpt(o);
      if (o.owner) {
        const b = await ownerOf(db, c, required(o, 'owner'));
        const out = await update(db, 'beneficial_owners', b.id, { id_verified_on: on });
        await audit(db, c.id, 'verify-owner', who(), { owner: b.name, on });
        return out;
      }
      const out = await update(db, 'customers', c.id, { id_verified_on: on, id_method: required(o, 'method') });
      await audit(db, c.id, 'verify', who(), { on, method: out.id_method });
      return one(db, 'select code, name, id_verified_on, owners_unverified, status from customer_register where id = $1', [c.id]);
    }
    case 'rate': {
      const c = await customerRow(db, args[0]);
      live(c);
      const risk = oneOf(required(o, 'risk'), ['low', 'medium', 'high'], '--risk');
      const pep = oneOf(o.pep ?? c.pep, PEPS, '--pep');
      const cdd = oneOf(o.cdd ?? (risk === 'high' || ['foreign', 'international organisation'].includes(pep) || (c.jurisdiction === 'NZ' && c.kind === 'trust') ? 'enhanced' : 'standard'), ['simplified', 'standard', 'enhanced'], '--cdd');
      if (cdd !== 'enhanced' && (risk === 'high' || ['foreign', 'international organisation'].includes(pep))) throw Error('A high risk customer or a foreign PEP needs --cdd=enhanced');
      if (cdd !== 'enhanced' && c.jurisdiction === 'NZ' && c.kind === 'trust') throw Error('In New Zealand a trust needs enhanced CDD (AML/CFT Act 2009 s22(1)(a))');
      await update(db, 'customers', c.id, { risk_rating: risk, cdd_level: cdd, pep });
      await audit(db, c.id, 'rate', who(), { risk, cdd, pep });
      const gaps = await db.query('select rule, finding from compliance_findings where ref = $1 order by rule', [c.code]);
      return { code: c.code, risk_rating: risk, cdd_level: cdd, pep, open_findings: gaps };
    }
    case 'wealth': {
      const c = await customerRow(db, args[0]);
      live(c);
      const values = {};
      if (o.wealth !== undefined) values.source_of_wealth = required(o, 'wealth');
      if (o.funds !== undefined) values.source_of_funds = required(o, 'funds');
      if (flag(o, 'verified')) values.sow_verified_on = today();
      if (!Object.keys(values).length) throw Error('Give --wealth, --funds or --verified');
      const out = await update(db, 'customers', c.id, values);
      await audit(db, c.id, 'wealth', who(), values);
      return { code: out.code, source_of_wealth: out.source_of_wealth, source_of_funds: out.source_of_funds, sow_verified_on: out.sow_verified_on };
    }
    case 'approve': {
      const c = await customerRow(db, args[0]);
      live(c);
      if (c.cdd_level !== 'enhanced') throw Error(`${c.code} is not on enhanced CDD. Senior manager approval is recorded for enhanced CDD customers.`);
      const out = await update(db, 'customers', c.id, { approved_by: required(o, 'by'), approved_on: dateOpt(o) });
      await audit(db, c.id, 'approve', who(), { by: out.approved_by, on: out.approved_on });
      return { code: out.code, approved_by: out.approved_by, approved_on: out.approved_on };
    }
    case 'activate': {
      const c = await customerRow(db, args[0]);
      if (c.status !== 'onboarding') throw Error(`${c.code} is ${c.status}, not onboarding`);
      const blockers = (await db.query(`select rule, finding from compliance_findings where ref = $1 and severity = 'breach'
        and rule not in ('REVIEW-OVERDUE')`, [c.code]));
      if (!c.id_verified_on) blockers.unshift({ rule: 'IDENTITY', finding: 'identity not verified' });
      if (!c.risk_rating) blockers.unshift({ rule: 'NOT-RATED', finding: 'no risk rating' });
      if (blockers.length) throw Error(`${c.code} cannot go active yet:\n${blockers.map((b) => `  ${b.rule}: ${b.finding}`).join('\n')}`);
      const out = await update(db, 'customers', c.id, { status: 'active', next_review_on: c.next_review_on || await nextReview(db, c, c.risk_rating, today()) });
      await audit(db, c.id, 'activate', who(), {});
      return { code: out.code, status: out.status, next_review_on: out.next_review_on };
    }
    case 'open-matter': {
      const c = await customerRow(db, args[0]);
      live(c);
      const on = dateOpt(o);
      const ref = optional(o, 'ref') || await nextCode(db, 'matters', 'ref', 'M-', 3);
      const m = await insert(db, 'matters', { ref, customer_id: c.id, service: required(o, 'service'), owner: required(o, 'owner'), opened_on: on });
      await audit(db, m.id, 'open-matter', who(), { ref, customer: c.code });
      const warn = !c.id_verified_on || String(c.id_verified_on) > on ? `Identity for ${c.code} is not verified. Verify before the service is provided, or record why the exception applies.` : null;
      return { ...m, warning: warn };
    }
    case 'close-matter': {
      const m = await pick(db, 'matter', args[0]);
      const row = await one(db, 'select * from matters where id = $1', [m.id]);
      if (row.closed_on) throw Error(`${row.ref} closed on ${row.closed_on}`);
      const out = await update(db, 'matters', m.id, { closed_on: dateOpt(o) });
      await audit(db, m.id, 'close-matter', who(), { on: out.closed_on });
      return out;
    }
    case 'transaction': {
      const m = await pick(db, 'matter', args[0]);
      const c = await one(db, 'select x.jurisdiction, x.sector from matters m join customer_register x on x.id = m.customer_id where m.id = $1', [m.id]);
      const currency = (optional(o, 'currency') || (c.jurisdiction === 'NZ' ? 'NZD' : 'AUD')).toUpperCase();
      if (!['NZD', 'AUD'].includes(currency)) throw Error('--currency must be NZD or AUD');
      const t = await insert(db, 'transactions', { matter_id: m.id, on_date: dateOpt(o), method: oneOf(required(o, 'method'), METHODS, '--method'),
        direction: oneOf(o.direction ?? 'in', ['in', 'out'], '--direction'), amount_cents: cents(required(o, 'amount')), currency, note: optional(o, 'note') });
      await audit(db, m.id, 'transaction', who(), { id: t.id, method: t.method, amount_cents: Number(t.amount_cents) });
      const d = await one(db, 'select form, due_on from report_deadlines where record_id = $1', [t.id]);
      return { ...t, report: d ? `${d.form} due by ${d.due_on}` : null };
    }
    case 'review': {
      const c = await customerRow(db, args[0]);
      if (c.status !== 'active') throw Error(`${c.code} is ${c.status}. Ongoing reviews are for active customers.`);
      const on = dateOpt(o);
      const risk = oneOf(o.risk ?? c.risk_rating ?? '', ['low', 'medium', 'high'], '--risk');
      const next = await nextReview(db, c, risk, on);
      await db.exec('BEGIN');
      try {
        await insert(db, 'reviews', { customer_id: c.id, reviewed_on: on, risk_rating: risk, outcome: required(o, 'outcome'), by_whom: who() });
        await update(db, 'customers', c.id, { risk_rating: risk, next_review_on: next, cdd_level: risk === 'high' ? 'enhanced' : c.cdd_level });
        await audit(db, c.id, 'review', who(), { on, risk, next });
        await db.exec('COMMIT');
      } catch (e) { await db.exec('ROLLBACK'); throw e; }
      return { code: c.code, reviewed_on: on, risk_rating: risk, next_review_on: next };
    }
    case 'end': {
      const c = await customerRow(db, args[0]);
      live(c);
      const open = await db.query('select ref from matters where customer_id = $1 and closed_on is null', [c.id]);
      if (open.length) throw Error(`${c.code} still has open matters: ${open.map((m) => m.ref).join(', ')}. Close them first.`);
      const on = dateOpt(o);
      await update(db, 'customers', c.id, { status: 'ended', ended_on: on });
      await audit(db, c.id, 'end', who(), { on });
      return one(db, 'select code, name, ended_on, keep_until, rule from retention where code = $1', [c.code]);
    }
    case 'flag': {
      const c = await customerRow(db, args[0]);
      const m = o.matter ? await pick(db, 'matter', required(o, 'matter')) : null;
      const ref = await nextCode(db, 'concerns', 'ref', 'K-', 3);
      const k = await insert(db, 'concerns', { ref, customer_id: c.id, matter_id: m?.id ?? null, noticed_on: dateOpt(o), raised_by: who(),
        description: required(o, 'description'), suspicion: oneOf(o.suspicion ?? 'money laundering', ['money laundering', 'terrorism financing', 'other offence'], '--suspicion') });
      await audit(db, k.id, 'flag', who(), { ref, customer: c.code });
      return { ref, customer: c.code, status: k.status, next: 'The compliance officer decides whether there are grounds to report (decide). Do not tell the customer.' };
    }
    case 'decide': {
      const k = await pick(db, 'concern', args[0]);
      const row = await one(db, 'select * from concerns where id = $1', [k.id]);
      if (row.status !== 'assessing') throw Error(`${row.ref} was already decided: ${row.status}`);
      if (flag(o, 'report') === flag(o, 'no-report')) throw Error('Give exactly one of --report or --no-report');
      const on = dateOpt(o);
      if (on < String(row.noticed_on)) throw Error('A decision cannot predate the concern');
      await update(db, 'concerns', k.id, { status: flag(o, 'report') ? 'to report' : 'not reported', decided_on: on, decided_by: who(), reason: required(o, 'reason') });
      await audit(db, k.id, 'decide', who(), { report: flag(o, 'report'), on });
      if (!flag(o, 'report')) return one(db, 'select ref, status, decided_on, decided_by, reason from concerns where id = $1', [k.id]);
      return one(db, 'select ref, form, customer, clock_from, due_on, rule from report_deadlines where ref = $1', [row.ref]);
    }
    case 'lodge': {
      let k = null;
      try { k = await pick(db, 'concern', args[0]); } catch { k = null; }
      const on = dateOpt(o);
      const receipt = required(o, 'receipt');
      if (k) {
        const row = await one(db, 'select * from concerns where id = $1', [k.id]);
        if (row.status !== 'to report') throw Error(`${row.ref} is ${row.status}. Decide to report it first.`);
        if (on < String(row.decided_on)) throw Error('Lodgement cannot predate the decision');
        await update(db, 'concerns', k.id, { status: 'reported', lodged_on: on, receipt_ref: receipt });
        await audit(db, k.id, 'lodge', who(), { on, receipt });
        const d = await one(db, 'select ref, form, due_on, lodged_on, receipt_ref from report_deadlines where ref = $1', [row.ref]);
        return { ...d, on_time: String(d.lodged_on) <= String(d.due_on) };
      }
      const t = await pick(db, 'transaction', args[0]);
      const row = await one(db, 'select * from transactions where id = $1', [t.id]);
      if (row.reported_on) throw Error(`That transaction was reported on ${row.reported_on}`);
      if (!(await one(db, 'select 1 as ok from report_deadlines where record_id = $1', [t.id]))) throw Error('Only cash received at or over the threshold is lodged here (PTR in New Zealand, TTR in Australia)');
      if (on < String(row.on_date)) throw Error('Lodgement cannot predate the transaction');
      await update(db, 'transactions', t.id, { reported_on: on, receipt_ref: receipt });
      await audit(db, t.id, 'lodge', who(), { on, receipt });
      return { transaction: t.id, reported_on: on, receipt_ref: receipt };
    }
    case 'add-holiday': {
      const h = await insert(db, 'holidays', { day: isoDate(required(o, 'day')), jurisdiction: oneOf(required(o, 'jurisdiction'), ['au', 'nz'], '--jurisdiction').toUpperCase(), name: required(o, 'name') });
      await audit(db, h.day, 'add-holiday', who(), h);
      return h;
    }
    case 'import':
      return importCases(db, args, o);
    case 'export': {
      const archive = {};
      for (const t of TABLES) archive[t] = await db.query(`select * from ${t}`);
      const file = o.file ? String(o.file) : path.join(outDir(), 'exports', `aml-${today()}-${randomUUID().slice(0, 8)}.json`);
      return { file: writeFile(file, JSON.stringify(archive, null, 2)), tables: TABLES.length, customers: archive.customers.length };
    }

    case 'weekly-review': {
      const attention = await run(db, 'attention');
      const reports = (await run(db, 'reports')).filter((r) => !r.lodged_on);
      const compliance = await run(db, 'compliance');
      const breaches = compliance.filter((r) => r.severity === 'breach');
      const body = `# AML review, week of ${today()}

Drafted from three commands: attention, reports and compliance. For the compliance officer. Keep it inside the firm: it names reports that must never reach the customer.

## What needs a person (${attention.length})

${render(attention)}

## Reports not yet lodged (${reports.length})

${render(reports.map(({ form, ref, customer, due_on, rule }) => ({ form, ref, customer, due_on, rule })))}

## Rule checks: ${breaches.length} breach(es), ${compliance.length - breaches.length} warning(s)

${render(compliance.map(({ rule, severity, entity, ref, finding }) => ({ rule, severity, entity, ref, finding })))}

## For the meeting

- Reports past their deadline: ${attention.filter((a) => a.item === 'report overdue').map((a) => a.ref).join(', ') || 'none'}.
- Services that started before identity was verified: ${attention.filter((a) => a.item === 'service before CDD').map((a) => a.ref).join(', ') || 'none'}.
- Enhanced CDD gaps to close: ${[...new Set(attention.filter((a) => a.item === 'enhanced CDD gap').map((a) => a.ref))].join(', ') || 'none'}.
- Programme dates passed: ${attention.filter((a) => a.item === 'programme overdue').map((a) => `${a.entity} ${a.detail}`).join(', ') || 'none'}.
`;
      return draft('weekly-review', body);
    }
    case 'draft-edd': {
      const c = await customerRow(db, args[0]);
      const e = await one(db, 'select * from entities where id = $1', [c.entity_id]);
      const owners = await db.query("select name, role from beneficial_owners where customer_id = $1 and id_verified_on is null and role in ('owner','controller','trustee','partner','acting on behalf') order by name", [c.id]);
      const needs = [
        !c.id_verified_on && 'proof of identity: a current passport or driver licence, sighted or certified',
        ...owners.map((b) => `proof of identity for ${b.name} (${b.role})`),
        !c.source_of_wealth && 'how you came to hold your overall wealth, for example a business sale, inheritance or salary, with a supporting document',
        !c.source_of_funds && 'where the money for this transaction is coming from, with a bank statement showing the funds',
        c.source_of_wealth && !c.sow_verified_on && `a document supporting what you told us about your wealth (${c.source_of_wealth})`,
      ].filter(Boolean);
      const body = `# DRAFT request for information: ${c.code} ${c.name}

Draft for ${e.compliance_officer || 'the compliance officer'} to check and send. Nothing sends from here. This asks for CDD information only: never mention a concern or a report.

---

${e.name}

${today()}

Dear ${c.name},

**Information we need before we can act for you**

${e.jurisdiction === 'NZ' ? 'As a reporting entity under the Anti-Money Laundering and Countering Financing of Terrorism Act 2009' : 'As a reporting entity under the Anti-Money Laundering and Counter-Terrorism Financing Act 2006'}, we must confirm who our clients are and, in some cases, where their money comes from. We ask every client in your situation for the same information.

Please send us:

${needs.length ? needs.map((n) => `- ${n}`).join('\n') : '- [nothing outstanding on the file: check before sending]'}

We keep this information securely and only for as long as the law requires.

Kind regards,

[Name]
${e.name}

---

When the documents arrive, record them: verify, wealth --verified, then approve if a senior manager signs off.
`;
      return draft(`edd-${c.code}`, body);
    }
    case 'draft-report': {
      const k = await pick(db, 'concern', args[0]);
      const row = await one(db, `select k.*, x.code, x.name, x.kind, x.country, x.entity, x.jurisdiction, m.ref as matter_ref, m.service
        from concerns k join customer_register x on x.id = k.customer_id left join matters m on m.id = k.matter_id where k.id = $1`, [k.id]);
      const d = await one(db, 'select form, due_on, rule from report_deadlines where ref = $1', [row.ref]);
      const tx = row.matter_id ? await db.query('select on_date, method, direction, amount_cents, currency, note from transactions where matter_id = $1 order by on_date', [row.matter_id]) : [];
      const owners = await db.query('select name, role, ownership_pct from beneficial_owners where customer_id = $1 order by role, name', [row.customer_id]);
      const form = d?.form || (row.jurisdiction === 'NZ' ? 'SAR' : 'SMR');
      const body = `# CONFIDENTIAL working note for the ${form}: ${row.ref}

For the compliance officer only. It gathers the facts for the ${row.jurisdiction === 'NZ' ? 'goAML suspicious activity report to the NZ Police Financial Intelligence Unit' : 'AUSTRAC Online suspicious matter report'}. Nothing lodges from here.
Do not tell the customer or anyone outside the firm that a report is being considered or made (${row.jurisdiction === 'NZ' ? 'AML/CFT Act 2009 s46' : 'AML/CTF Act 2006 s123'}).

${d ? `Due by **${d.due_on}** (${d.rule}).` : 'Not yet decided: record the decision with decide before the clock starts.'}

## Who

${render([{ code: row.code, name: row.name, kind: row.kind, country: row.country, entity: row.entity }])}

Owners and controllers:

${render(owners)}

## What happened

- Noticed ${row.noticed_on} by ${row.raised_by}: ${row.description}
- Suspicion: ${row.suspicion}. Grounds: ${row.reason || '[the grounds for suspicion, in your own words]'}
- Matter: ${row.matter_ref ? `${row.matter_ref}, ${row.service}` : '[matter]'}

## Transactions on the matter

${render(tx)}

## Before lodging

- [ ] Grounds for suspicion written in plain words, with dates and amounts
- [ ] Identity documents and the CDD file attached
- [ ] Lodged, then recorded: lodge ${row.ref} --receipt=<reference>
`;
      return draft(`report-${row.ref}`, body);
    }
    case 'draft-officer-report': {
      const e = await pick(db, 'entity', args[0]);
      const ent = await one(db, 'select * from entities where id = $1', [e.id]);
      const risk = await db.query(`select coalesce(risk_rating, 'unrated') as risk, count(*)::int as customers from customer_register
        where entity = $1 and status in ('onboarding','active') group by 1 order by 1`, [ent.code]);
      const programme = await db.query('select obligation, last_done, next_due from programme_calendar where entity = $1 order by next_due', [ent.code]);
      const reports = await db.query('select form, count(*)::int as total, count(lodged_on)::int as lodged from report_deadlines where entity = $1 group by form order by form', [ent.code]);
      const findings = await db.query('select rule, severity, ref, finding from compliance_findings where entity = $1 order by severity, rule', [ent.code]);
      const training = await db.query('select name, role, last_trained, training_due, vetted_on from staff_register where entity = $1 and active and aml_role order by name', [ent.code]);
      const body = `# DRAFT compliance officer report to the ${ent.jurisdiction === 'AU' ? 'governing body' : 'senior managers'}: ${ent.name}

Drafted from the register on ${today()} by ${ent.compliance_officer || '[compliance officer]'}. ${ent.jurisdiction === 'AU' ? 'AUSTRAC expects the AML/CTF compliance officer to report to the governing body at least once every 12 months.' : 'For the partners or directors, alongside the annual report to DIA.'}
Report counts only. Never name the customers behind suspicious activity reports in a document that leaves the compliance file.

## Customers by risk

${render(risk)}

## The programme

${render(programme)}

## Reports made

${render(reports)}

## Staff with AML duties

${render(training)}

## Open findings (${findings.length})

${render(findings)}

## What I need from you

- [decisions, budget or sign-off the compliance officer is asking for]
`;
      return draft(`officer-report-${ent.code}`, body);
    }
    case 'draft-annual-report': {
      const e = await pick(db, 'entity', args[0]);
      const ent = await one(db, 'select * from entities where id = $1', [e.id]);
      const y = await one(db, 'select last_year_end(current_date) as ends, year_label(last_year_end(current_date)) as label');
      const starts = `${Number(String(y.ends).slice(0, 4)) - 1}-07-01`;
      const due = (await db.query("select next_due from programme_calendar where entity = $1 and obligation like 'annual report%'", [ent.code]))[0]?.next_due;
      const n = await one(db, `select
          count(*) filter (where started_on between $2 and $3)::int as new_customers,
          count(*) filter (where status in ('active','onboarding'))::int as customers_now,
          count(*) filter (where cdd_level = 'enhanced' and status in ('active','onboarding'))::int as enhanced,
          count(*) filter (where cdd_level = 'simplified' and status in ('active','onboarding'))::int as simplified,
          count(*) filter (where pep <> 'none' and status in ('active','onboarding'))::int as peps,
          count(*) filter (where kind = 'trust' and status in ('active','onboarding'))::int as trusts,
          count(*) filter (where country <> $4 and status in ('active','onboarding'))::int as overseas
        from customer_register where entity = $1`, [ent.code, starts, y.ends, ent.jurisdiction]);
      const r = await db.query('select form, count(*)::int as lodged from report_deadlines where entity = $1 and lodged_on between $2 and $3 group by form order by form', [ent.code, starts, y.ends]);
      const ev = await db.query('select kind, max(done_on) as last_done from programme_events where entity_id = $1 group by kind order by kind', [e.id]);
      const body = `# DRAFT annual report working pack: ${ent.name}, ${y.label}

The year ${starts} to ${y.ends}. ${ent.jurisdiction === 'NZ' ? 'For the annual AML/CFT report to DIA through AML Online (AML/CFT Act 2009 s60)' : 'For the AUSTRAC compliance report through AUSTRAC Online (AML/CTF Act 2006 s47)'}, due ${due || '[due date]'}.
The counts come from the register. Check them against the form's questions before you submit. Nothing submits from here.

## Customers

${render([n])}

## Reports lodged in the year

${render(r)}

## Programme dates

${render(ev)}

## Compliance officer

${render([{ name: ent.compliance_officer, appointed: ent.co_appointed_on, austrac_notified: ent.co_notified_on }])}

When it is submitted, record it: event ${ent.code} --kind="annual report" --period=${y.label} --reference=<receipt> --by=<name>
`;
      return draft(`annual-report-${ent.code}-${y.label}`, body);
    }
  }
  throw Error(`Unhandled command ${cmd}`);
}
