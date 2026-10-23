#!/usr/bin/env node
// Loads the fictional demo firms and customers. Safe to run twice. Never run it against your real register.
import fs from 'node:fs';
import path from 'node:path';
import { getDb, REPO_ROOT } from './lib/db.mjs';

const db = await getDb();
try {
  await db.exec('BEGIN');
  await db.exec(fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'seed.sql'), 'utf8'));
  await db.exec('COMMIT');
  const [{ n, e }] = await db.query('select count(*)::int as n, count(distinct entity_id)::int as e from customers');
  console.log(`seed: demo AML register loaded (${n} customers across ${e} firms)`);
} catch (e) {
  await db.exec('ROLLBACK');
  throw e;
} finally {
  await db.close();
}
