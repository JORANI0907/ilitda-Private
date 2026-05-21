/**
 * One-time migration runner for HR management columns.
 * Run: node scripts/run-migration.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const envContent = readFileSync(
  new URL('../.env.local', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  'utf-8'
)
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, '')]
    })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'ilitda' } }
)

// Run each statement via rpc if available, otherwise log
const statements = [
  `ALTER TABLE ilitda.workers ADD COLUMN IF NOT EXISTS resident_number text`,
  `ALTER TABLE ilitda.workers ADD COLUMN IF NOT EXISTS registration_number text`,
  `ALTER TABLE ilitda.workers ADD COLUMN IF NOT EXISTS company_name text`,
  `ALTER TABLE ilitda.connections ADD COLUMN IF NOT EXISTS manual_account_bank text`,
  `ALTER TABLE ilitda.connections ADD COLUMN IF NOT EXISTS manual_account_number text`,
  `ALTER TABLE ilitda.connections ADD COLUMN IF NOT EXISTS manual_registration_number text`,
  `ALTER TABLE ilitda.connections ADD COLUMN IF NOT EXISTS manual_resident_number text`,
  `ALTER TABLE ilitda.connections ADD COLUMN IF NOT EXISTS manual_company_name text`,
  `ALTER TABLE ilitda.service_applications ADD COLUMN IF NOT EXISTS assigned_connection_ids uuid[]`,
  `ALTER TABLE ilitda.service_applications ADD COLUMN IF NOT EXISTS worker_pay jsonb`,
  `ALTER TABLE ilitda.service_requests ADD COLUMN IF NOT EXISTS assigned_connection_ids uuid[]`,
  `ALTER TABLE ilitda.service_requests ADD COLUMN IF NOT EXISTS worker_pay jsonb`,
]

console.log('Migration 005 — HR Management Columns')
console.log('--------------------------------------')
console.log('The following ALTER TABLE statements need to be run in Supabase SQL Editor:')
console.log()
for (const stmt of statements) {
  console.log(stmt + ';')
}
console.log()
console.log('Paste the above into: https://supabase.com/dashboard/project/andmmbxhtufwvtsgdhti/sql/new')
