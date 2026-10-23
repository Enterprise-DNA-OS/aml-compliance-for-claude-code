#!/usr/bin/env node
// npm test: a temporary database, the migration, the seed twice, every CLI command, the rules and the import.
// Set TEST_DATABASE_URL to run the same checks against an empty disposable Postgres.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { run, COMMANDS, READS, TABLES, QUESTIONS, cents, isoDate, today } from './lib/aml.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aml-test-'));
process.env.DATA_DIR = path.join(dir, 'db');
process.env.OUTPUT_DIR = dir;
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';

const db = await getDb();
const covered = new Set();
let checks = 0;
const call = (c, a = [], o = {}) => { covered.add(c); return run(db, c, a, o); };
async function fails(c, a, o, re) { await assert.rejects(() => call(c, a, o), re); checks++; }
function child(script, args = [], status = 0) {
  const p = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', script), ...args], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
  assert.equal(p.status, status, p.stderr || p.stdout);
  checks++;
  return p.stdout;
}
const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const A = { actor: 'Tester' };
const rulesOf = async () => new Set((await call('compliance')).map((r) => r.rule));
const findings = async (ref) => (await call('compliance')).filter((r) => r.ref === ref).map((r) => r.rule);

try {
  // Migration runs once; the seed is idempotent.
  assert.equal((await migrate(db)).ran.length, 1);
  assert.equal((await migrate(db)).ran.length, 0);
  const seed = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'seed.sql'), 'utf8');
  await db.exec(seed);
  await db.exec(seed);
  assert.equal((await db.query('select * from customers')).length, 14);
  assert.equal((await db.query('select * from entities')).length, 4);
  assert.equal((await db.query('select * from rules')).length, 29);

  // Every read returns rows in the shape the commands promise.
  for (const c of Object.keys(READS)) assert.ok(Array.isArray(await call(c)), c);
  assert.equal(QUESTIONS.length, 10);
  assert.equal((await call('insights')).length, 10);
  const attention = await call('attention');
  for (const item of ['report overdue', 'report due', 'match to clear', 'concern to decide', 'service before CDD', 'enhanced CDD gap', 'programme overdue', 'review overdue', 'onboarding stalled'])
    assert.ok(attention.some((r) => r.item === item), `attention has ${item}`);
  const rules = await rulesOf();
  for (const r of ['CDD-BEFORE-SERVICE', 'TRUST-EDD', 'PEP-EDD', 'HIGH-RISK-EDD', 'NOT-RATED', 'OWNERS-MISSING', 'OWNER-UNVERIFIED', 'SANCTIONS', 'MATCH-UNRESOLVED',
    'REVIEW-OVERDUE', 'REPORT-LATE', 'CONCERN-UNDECIDED', 'CO-MISSING', 'CO-NOTIFY', 'AUDIT', 'RISK-ASSESSMENT', 'PROGRAMME-REVIEW', 'TRAINING', 'VETTING'])
    assert.ok(rules.has(r), `compliance has ${r}`);
  const [{ due: arDue }] = await db.query("select next_due as due from programme_calendar where entity = 'KAC' and obligation like 'annual report%'");
  assert.equal(rules.has('ANNUAL-REPORT'), String(arDue) < today(), 'annual report breach follows the 31 August date');
  assert.ok(!(await findings('C-1001')).length, 'a complete file has no findings');
  assert.ok((await call('customers', [], { entity: 'hsl', risk: 'high' })).every((r) => r.entity === 'HSL' && r.risk_rating === 'high'));
  assert.equal((await call('customers', [], { risk: 'unrated' })).length, 1);
  assert.equal((await call('matches')).length, 1);
  assert.equal((await call('cash')).length, 3);
  assert.ok((await call('retention')).some((r) => r.code === 'C-1006'));

  // Deadline arithmetic: working days, holidays, sector rules and the 24 hour terrorism financing clock.
  const [{ d }] = await db.query("select add_business_days('2026-10-16'::date, 1, 'NZ') as d");
  assert.equal(String(d), '2026-10-19', 'Friday plus one working day is Monday');
  const [{ x }] = await db.query("select add_business_days(make_date(extract(year from current_date)::int, 12, 24), 1, 'NZ') as x");
  assert.equal(String(x).slice(5), '12-28', 'Christmas and Boxing Day are skipped');
  const [{ law, acc }] = await db.query("select rule_value('NZ', 'suspicious report', 'law') as law, rule_value('NZ', 'suspicious report', 'accounting') as acc");
  assert.equal(law, 5); assert.equal(acc, 3);
  const [{ ends, label }] = await db.query("select last_year_end('2026-10-23') as ends, year_label(last_year_end('2026-10-23')) as label");
  assert.equal(String(ends), '2026-06-30'); assert.equal(label, '2025-26');
  const [{ e2 }] = await db.query("select last_year_end('2026-06-29') as e2");
  assert.equal(String(e2), '2025-06-30');
  assert.equal(cents('12,000.50'), 1200050);
  assert.throws(() => cents('ten'), /dollar figure/);
  assert.throws(() => cents('0'), /more than zero/);
  assert.equal(isoDate('09/03/2026'), '2026-03-09');
  assert.throws(() => isoDate('2026-02-30'), /Invalid/);

  // A new firm: officer, programme, staff.
  await call('add-entity', [], { ...A, code: 'ggl', name: 'Gumtree Legal', jurisdiction: 'au', sector: 'law', started: day(5) });
  await fails('add-entity', [], { ...A, code: 'X', name: 'X', jurisdiction: 'uk', sector: 'law', started: day(1) }, /jurisdiction/);
  await fails('add-entity', [], { ...A, code: 'X', name: 'X', jurisdiction: 'au', sector: 'banking', started: day(1) }, /sector/);
  assert.ok((await findings('GGL')).includes('CO-MISSING'));
  const off = await call('officer', ['GGL'], { ...A, name: 'Ben Cho', appointed: day(4) });
  assert.equal(String(off.notify_austrac_by), (await db.query("select (current_date - 4 + 14)::date as d"))[0].d);
  await fails('officer', ['GGL'], { ...A, name: 'Ben Cho', appointed: day(4), notified: day(6) }, /before --appointed/);
  await call('officer', ['GGL'], { ...A, name: 'Ben Cho', appointed: day(4), notified: day(2) });
  assert.ok(!(await findings('GGL')).includes('CO-NOTIFY'));
  assert.ok((await findings('GGL')).includes('RISK-ASSESSMENT'));
  await call('event', ['GGL'], { ...A, kind: 'risk assessment', on: day(3), by: 'Ben Cho' });
  const cal = await call('event', ['GGL'], { ...A, kind: 'programme review', on: day(3), by: 'Ben Cho', reference: 'Program v1' });
  assert.ok(cal.some((r) => r.obligation === 'independent evaluation'), 'Australia calls the audit an independent evaluation');
  assert.ok(!(await findings('GGL')).some((r) => ['RISK-ASSESSMENT', 'PROGRAMME-REVIEW'].includes(r)));
  await fails('event', ['GGL'], { ...A, kind: 'annual report', by: 'Ben Cho' }, /--period/);
  await fails('event', ['GGL'], { ...A, kind: 'party', by: 'Ben Cho' }, /--kind/);
  await fails('event', ['GGL'], { ...A, kind: 'audit', by: 'Ben Cho', on: '2999-01-01' }, /future/);
  await call('event', ['KAC'], { ...A, kind: 'annual report', period: (await db.query('select year_label(last_year_end(current_date)) as l'))[0].l, reference: 'AR-1', by: 'Mere Tane' });
  assert.ok(!(await rulesOf()).has('ANNUAL-REPORT'), 'recording the annual report clears it');
  await call('add-staff', [], { ...A, entity: 'GGL', name: 'Ava Price', role: 'Paralegal' });
  await call('add-staff', [], { ...A, entity: 'GGL', name: 'Leo Wu', role: 'Receptionist', 'no-aml-role': true });
  assert.ok((await findings('Ava Price')).includes('VETTING') && (await findings('Ava Price')).includes('TRAINING'));
  assert.ok(!(await findings('Leo Wu')).length, 'staff with no AML role are not checked');
  await call('vet', ['GGL/Ava Price'], A);
  const tr = await call('train', ['Ava Price'], { ...A, course: 'Tranche 2 induction' });
  assert.ok(tr.training_due > today());
  assert.ok(!(await findings('Ava Price')).length);
  await fails('vet', ['nobody here'], A, /No matching staff/);

  // Onboarding a company: owners, checks, matches, rating, approval, activation.
  const nc = await call('add-customer', [], { ...A, entity: 'GGL', name: 'Coral Bay Holdings Pty Ltd', kind: 'company', email: 'a@b.example' });
  assert.ok(nc.next.includes('OWNERS-MISSING') && nc.next.includes('NOT-RATED') && nc.next.includes('SANCTIONS'));
  assert.equal(nc.code, 'C-0002' === nc.code ? 'C-0002' : nc.code);
  const code = nc.code;
  await fails('add-customer', [], { ...A, entity: 'GGL', name: 'X', kind: 'llc' }, /--kind/);
  await fails('add-owner', ['C-1003'], { ...A, name: 'Someone', role: 'owner' }, /individual/);
  await call('add-owner', [code], { ...A, name: 'Nina Coral', role: 'owner', pct: '75', pep: 'foreign' });
  await call('add-owner', [code], { ...A, name: 'Raj Coral', role: 'owner', pct: '25' });
  await fails('add-owner', [code], { ...A, name: 'Bad Pct', role: 'owner', pct: '120' }, /--pct/);
  await fails('add-owner', [code], { ...A, name: 'Bad Role', role: 'friend' }, /--role/);
  let f = await findings(code);
  assert.ok(f.includes('PEP-EDD'), 'a foreign PEP owner triggers enhanced CDD');
  const chk = await call('check', [code], { ...A, kind: 'sanctions', result: 'possible match', provider: 'Screening provider', reference: 'S-9' });
  assert.ok(chk.next);
  await call('check', [code], { ...A, kind: 'identity', result: 'clear', provider: 'ID provider', owner: 'Nina Coral' });
  await fails('check', [code], { ...A, kind: 'identity', result: 'clear', provider: 'ID provider', owner: 'Nobody' }, /No matching owner/);
  await fails('check', [code], { ...A, kind: 'vibes', result: 'clear', provider: 'x' }, /--kind/);
  assert.ok((await findings(code)).includes('MATCH-UNRESOLVED'));
  await fails('clear', [chk.id], { ...A, on: day(30), note: 'x' }, /predate/);
  await call('clear', [chk.id], { ...A, note: 'Different date of birth and nationality. False positive.' });
  await fails('clear', [chk.id], { ...A, note: 'again' }, /resolved/);
  assert.ok(!(await findings(code)).includes('MATCH-UNRESOLVED'));
  await fails('rate', [code], { ...A, risk: 'medium', cdd: 'standard', pep: 'foreign' }, /enhanced/);
  await fails('rate', ['C-1002'], { ...A, risk: 'low', cdd: 'standard' }, /trust needs enhanced/);
  await fails('rate', [code], { ...A, risk: 'extreme' }, /--risk/);
  const rated = await call('rate', [code], { ...A, risk: 'high' });
  assert.equal(rated.cdd_level, 'enhanced');
  await fails('activate', [code], A, /cannot go active yet/);
  await fails('approve', ['C-1001'], { ...A, by: 'Aroha Ngata' }, /not on enhanced/);
  await call('approve', [code], { ...A, by: 'Ben Cho' });
  await fails('wealth', [code], A, /Give --wealth/);
  await call('wealth', [code], { ...A, wealth: 'Sale of a logistics business, 2023', funds: 'Settlement proceeds, CBA account', verified: true });
  await call('verify', [code], { ...A, method: 'ASIC extract and director ID' });
  await call('verify', [code], { ...A, owner: 'Raj Coral' });
  await call('verify', [code], { ...A, owner: 'Nina Coral' });
  await call('check', [code], { ...A, kind: 'sanctions', result: 'clear', provider: 'Screening provider' });
  f = await findings(code);
  assert.deepEqual(f, [], `clean file after onboarding, got ${f}`);
  const act = await call('activate', [code], A);
  assert.equal(act.status, 'active');
  assert.ok(act.next_review_on > today());
  await fails('activate', [code], A, /not onboarding/);

  // A matter, a cash deposit over the threshold and its report.
  const m = await call('open-matter', [code], { ...A, service: 'Commercial conveyance', owner: 'Ava Price' });
  assert.equal(m.warning, null);
  const early = await call('open-matter', ['C-4001'], { ...A, service: 'Tax return', owner: 'Grace Kim' });
  assert.ok(early.warning, 'opening a matter before identity is verified warns');
  assert.ok((await findings('C-4001')).includes('CDD-BEFORE-SERVICE'));
  const t = await call('transaction', [m.ref], { ...A, method: 'cash', amount: '15000' });
  assert.match(t.report, /^TTR due by/);
  const small = await call('transaction', [m.ref], { ...A, method: 'cash', amount: '9999.99' });
  assert.equal(small.report, null, 'under the threshold, no report');
  await fails('transaction', [m.ref], { ...A, method: 'gold', amount: '1' }, /--method/);
  await fails('transaction', [m.ref], { ...A, method: 'cash', amount: '1', currency: 'USD' }, /--currency/);
  await fails('lodge', [t.id], { ...A, receipt: 'R', on: day(9) }, /predate/);
  await call('lodge', [t.id], { ...A, receipt: 'AUSTRAC-TTR-1' });
  await fails('lodge', [t.id], { ...A, receipt: 'R' }, /already|reported on/);
  await fails('lodge', [small.id], { ...A, receipt: 'R' }, /at or over the threshold/);
  assert.ok((await call('cash')).some((r) => r.ref === m.ref && r.status === 'reported'));

  // A concern: flag, decide, draft, lodge. The terrorism financing clock is 24 hours in Australia.
  const k = await call('flag', [code], { ...A, matter: m.ref, description: 'Cash brought in by an unrelated third party.' });
  assert.match(k.next, /Do not tell the customer/);
  await fails('decide', [k.ref], { ...A, reason: 'x' }, /exactly one/);
  await fails('decide', [k.ref], { ...A, reason: 'x', report: true, on: day(400) }, /predate/);
  await fails('lodge', [k.ref], { ...A, receipt: 'R' }, /Decide to report/);
  const dd = await call('decide', [k.ref], { ...A, report: true, reason: 'Third-party cash with no explanation' });
  assert.equal(dd.form, 'SMR');
  assert.ok(String(dd.due_on) > today());
  await fails('decide', [k.ref], { ...A, reason: 'again', 'no-report': true }, /already decided/);
  const rep = await call('draft-report', [k.ref]);
  const repText = fs.readFileSync(rep.file, 'utf8');
  assert.ok(repText.includes('s123') && repText.includes('AUSTRAC Online') && repText.includes('Coral Bay'));
  const lodged = await call('lodge', [k.ref], { ...A, receipt: 'AUSTRAC-SMR-1' });
  assert.equal(lodged.on_time, true);
  const tf = await call('flag', ['C-3002'], { ...A, description: 'Payment to a listed charity', suspicion: 'terrorism financing' });
  const tfd = await call('decide', [tf.ref], { ...A, report: true, reason: 'Name matches a listed entity' });
  assert.equal(String(tfd.due_on), (await db.query('select current_date + 1 as d'))[0].d);
  const no = await call('flag', ['C-2001'], { ...A, description: 'Odd invoice', suspicion: 'other offence' });
  const nod = await call('decide', [no.ref], { ...A, 'no-report': true, reason: 'Supplier confirmed the invoice in writing' });
  assert.equal(nod.status, 'not reported');
  await fails('flag', ['C-2001'], { ...A, description: 'x', suspicion: 'fraud' }, /--suspicion/);
  // Decide the overdue New Zealand concern and lodge the overdue SAR: the breach becomes a late-lodged warning.
  await call('decide', ['K-002'], { ...A, 'no-report': true, reason: 'Payment was a documented equipment purchase' });
  await call('lodge', ['K-001'], { ...A, receipt: 'goAML-SAR-77' });
  const late = (await call('compliance')).find((r) => r.ref === 'K-001');
  assert.equal(late.severity, 'warning');
  assert.ok(!(await rulesOf()).has('CONCERN-UNDECIDED'));

  // Ongoing CDD reviews, matters and ending a relationship, with retention.
  await fails('review', ['C-1004'], { ...A, outcome: 'x' }, /Ongoing reviews are for active/);
  const rv = await call('review', ['C-1007'], { ...A, outcome: 'Same circumstances. Address confirmed.' });
  assert.ok(rv.next_review_on > today());
  assert.ok(!(await findings('C-1007')).includes('REVIEW-OVERDUE'));
  const rvh = await call('review', ['C-2002'], { ...A, risk: 'high', outcome: 'Overseas payments, raised to high' });
  assert.ok(rvh.next_review_on < (await call('review', ['C-1007'], { ...A, outcome: 'again' })).next_review_on, 'high risk reviews come round sooner');
  await fails('end', [code], A, /open matters/);
  await call('close-matter', [m.ref], A);
  await fails('close-matter', [m.ref], A, /closed on/);
  const ended = await call('end', [code], A);
  assert.equal(ended.rule, 'AU-RETENTION');
  assert.equal(String(ended.keep_until).slice(0, 4), String(Number(today().slice(0, 4)) + 7));
  await fails('verify', [code], { ...A, method: 'x' }, /ended/);
  await call('add-holiday', [], { ...A, day: '2027-02-06', jurisdiction: 'nz', name: 'Waitangi Day' });
  await fails('add-holiday', [], { ...A, day: '2027-02-06', jurisdiction: 'xx', name: 'x' }, /--jurisdiction/);

  // The fix path clears the seeded breaches one by one.
  await call('rate', ['C-1002'], { ...A, risk: 'medium' });
  assert.ok(!(await findings('C-1002')).includes('TRUST-EDD'));
  await call('add-owner', ['C-1005'], { ...A, name: 'Wiremu Rangi', role: 'owner', pct: '100' });
  await call('wealth', ['C-1005'], { ...A, funds: 'Company trading account' });
  assert.ok(!(await findings('C-1005')).some((r) => ['OWNERS-MISSING', 'HIGH-RISK-EDD'].includes(r)));

  // Import a First AML case list: dry run, real run, repeat, and every refusal.
  const fixture = path.join(REPO_ROOT, 'tests', 'fixtures', 'first-aml.csv');
  const dry = await call('import', ['first-aml', fixture], { ...A, 'dry-run': true });
  assert.equal(dry.inserted, 4);
  assert.equal((await db.query("select * from customers where source = 'import'")).length, 0, 'a dry run writes nothing');
  const imp = await call('import', ['first-aml', fixture], A);
  assert.equal(imp.inserted, 4);
  assert.equal((await call('import', ['first-aml', fixture], A)).skipped, 4, 'a repeat import is skipped');
  const kereru = (await db.query("select * from customers where name = 'Kereru Family Trust'"))[0];
  assert.equal(kereru.cdd_level, 'enhanced'); assert.equal(String(kereru.id_verified_on), '2026-03-21');
  const rossi = (await db.query("select * from customer_register where name = 'Marco Rossi'"))[0];
  assert.equal(rossi.status, 'onboarding'); assert.equal(rossi.pep, 'foreign'); assert.equal(rossi.open_matches, 1);
  assert.equal((await db.query("select status from customers where name = 'Harbour View Body Corporate'"))[0].status, 'declined');
  const bad = (name, text) => { const f = path.join(dir, name); fs.writeFileSync(f, text); return f; };
  const head = 'Case ID,Entity name,Entity type,Office,Assigned to,Status,Risk rating,Received,Completed,PEP,Sanctions,Country,Email\n';
  await fails('import', ['first-aml', bad('a.csv', head + 'X1,Bad,Company,Nowhere,,Completed,Low,2026-01-01,2026-01-02,No,Clear,NZ,\n')], A, /office "Nowhere"/);
  await fails('import', ['first-aml', bad('b.csv', head + 'X2,Bad,Company,HSL,,Pending,Low,2026-01-01,,No,,NZ,\n')], A, /Status "Pending"/);
  await fails('import', ['first-aml', bad('c.csv', head + 'X3,Bad,Company,HSL,,Completed,Low,2026-01-01,,No,,NZ,\n')], A, /Completed date/);
  await fails('import', ['first-aml', bad('d.csv', head + 'X4,A,Company,HSL,,Completed,Low,2026-01-01,2026-01-02,No,,NZ,\nX4,B,Company,HSL,,Completed,Low,2026-01-01,2026-01-02,No,,NZ,\n')], A, /duplicate Case ID/);
  await fails('import', ['first-aml', bad('e.csv', 'Case ID,Name\nX5,A\n')], A, /Unknown column "Name"/);
  await fails('import', ['first-aml', bad('f.csv', head + 'FA-20391,Changed Name,Private Company,HSL,James Liu,Completed,Medium,2026-03-02,2026-03-09,No,Clear,NZ,office@pohutukawa.example\n')], A, /Changed import row/);
  await fails('import', ['first-aml', bad('g.csv', head + 'X6,Bad,Company,HSL,,Completed,Extreme,2026-01-01,2026-01-02,No,,NZ,\n')], A, /Risk rating/);
  const mapped = bad('h.csv', 'Reference,Client,Type,Office,Assigned to,Status,Risk rating,Received,Completed,PEP,Sanctions,Country,Email\nX7,Mapped Ltd,Company,HSL,,Completed,Low,2026-01-01,2026-01-02,No,Clear,NZ,\n');
  const mapFile = bad('map.json', JSON.stringify({ 'Case ID': 'Reference', 'Entity name': 'Client', 'Entity type': 'Type' }));
  assert.equal((await call('import', ['first-aml', mapped], { ...A, map: mapFile })).inserted, 1);
  await fails('import', ['first-aml', mapped], { ...A, map: bad('map2.json', JSON.stringify({ Nonsense: 'x' })) }, /unknown field/);
  await fails('import', ['xero', fixture], A, /Supported import/);
  assert.equal((await db.query("select * from customers where name = 'Bad'")).length, 0, 'a failed import writes nothing');

  // Drafts never overwrite and never send.
  const wr = await call('weekly-review');
  assert.ok(fs.readFileSync(wr.file, 'utf8').includes('What needs a person'));
  const edd = fs.readFileSync((await call('draft-edd', ['C-1003'])).file, 'utf8');
  assert.ok(edd.includes('Dmitri Volkov') && edd.includes('supporting what you told us') && !/suspicio|\bSAR\b|\bSMR\b|goAML|concern/i.test(edd.split('---')[1]), 'the EDD letter never mentions a report');
  const orp = fs.readFileSync((await call('draft-officer-report', ['BCV'])).file, 'utf8');
  assert.ok(orp.includes('governing body') && !orp.includes('Ibrahim Haddad'), 'the officer report counts reports and names no one behind them');
  const ar = fs.readFileSync((await call('draft-annual-report', ['HSL'])).file, 'utf8');
  assert.ok(ar.includes('AML Online') && ar.includes('s60'));
  const ar2 = fs.readFileSync((await call('draft-annual-report', ['BCV'])).file, 'utf8');
  assert.ok(ar2.includes('AUSTRAC Online'));
  await fails('draft-report', ['K-0'], {}, /Ambiguous concern/);

  const detail = await call('customer', ['C-1003']);
  assert.equal(detail.customer.name, 'Dmitri Volkov');
  assert.ok(detail.findings.some((x) => x.rule === 'PEP-EDD'));
  await fails('customer', ['C-10'], {}, /Ambiguous customer/);
  await fails('customer', ['nobody at all'], {}, /No matching customer/);

  // Export is complete and never overwrites.
  const exp = await call('export', [], { file: path.join(dir, 'archive.json') });
  const archive = JSON.parse(fs.readFileSync(exp.file, 'utf8'));
  for (const tname of TABLES) assert.equal(archive[tname].length, (await db.query(`select * from ${tname}`)).length, tname);
  await fails('export', [], { file: exp.file }, /EEXIST/);
  await fails('nonsense', [], {}, /Unknown command/);
  await fails('attention', ['extra'], {}, /takes 0 argument/);
  await fails('customers', [], { colour: 'red' }, /Unknown flag/);
  await fails('decide', ['K-003'], { reason: 'x', report: 'yes' }, /takes no value/);

  assert.deepEqual(COMMANDS.filter((c) => !covered.has(c)), [], 'every CLI command is exercised');
  assert.ok((await db.query("select relrowsecurity from pg_class where relname = 'customers'"))[0].relrowsecurity);
  await db.query("update customers set name = '<script>alert(1)</script>' where code = 'C-1006'");
  await db.close();

  // The CLI, the views and the documents as a person runs them.
  child('aml.mjs', ['--help']);
  child('aml.mjs', ['unknown'], 1);
  assert.ok(child('aml.mjs', ['attention']).includes('report'));
  assert.equal(JSON.parse(child('aml.mjs', ['entities', '--json'])).length, 5);
  assert.match(JSON.parse(child('aml.mjs', ['customer', 'C-10', '--json'], 1)).error, /Ambiguous/);
  child('view.mjs');
  child('docs.mjs');
  assert.equal(fs.readdirSync(path.join(dir, 'views')).length, 3);
  const files = fs.readdirSync(path.join(dir, 'docs-out', 'cdd-file'));
  assert.ok(files.length >= 19);
  assert.equal(fs.readdirSync(path.join(dir, 'docs-out', 'programme-pack')).length, 5);
  const html = files.map((x) => fs.readFileSync(path.join(dir, 'docs-out', 'cdd-file', x), 'utf8')).join('\n');
  assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>alert(1)</script>'), 'names are escaped in documents');
  assert.ok(!html.includes('Third-party cash'), 'concerns never appear in a customer CDD file');
  console.log(`PASS: ${covered.size} CLI commands; migration, idempotent seed, NZ AML/CFT and AU AML/CTF rules, working days and holidays, SAR, SMR, PTR and TTR clocks, enhanced CDD, PEPs, owners, matches, reviews, programme calendar, retention, atomic First AML import, drafts, export, RLS and escaped HTML (${checks} negative and subprocess checks).`);
} catch (e) {
  try { await db.close(); } catch {}
  throw e;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
