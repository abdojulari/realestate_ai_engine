#!/usr/bin/env node
/**
 * Consolidated CI / pre-deploy check CLI.
 *
 * Replaces two previous standalone scripts:
 *   - check-delegate-sensitive-model-queries.mjs
 *   - check-prisma-migration-drift.sh
 *
 * Each subcommand below preserves the exact behaviour of the old script it
 * replaces. Run with --help on any subcommand to see its flags.
 *
 * Usage:
 *   node scripts/check.mjs <subcommand> [options]
 *
 * Subcommands:
 *   delegate-sensitive-queries  CI guard: admin routes that read
 *                               PropertyInquiry / HomeEstimate / ViewingRequest
 *                               must use mergeWhereOmitExcludedUserLink helpers.
 *                               Exits 1 on violation.
 *   prisma-migration-drift      Diff applied migrations vs prisma/schema.prisma
 *                               via the shadow DB. Empty output = in sync.
 *
 * Examples:
 *   node scripts/check.mjs delegate-sensitive-queries
 *   node scripts/check.mjs prisma-migration-drift
 *   node scripts/check.mjs prisma-migration-drift --exit-code
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// Hoisted above the dispatcher because top-level `await sub.run()` executes
// before any subsequent `const` declarations are initialized — referencing
// them from a hoisted function would hit the TDZ.
const MODEL_READ_RE =
  /(?:\(prisma\s+as\s+any\)|prisma)\.(propertyInquiry|homeEstimate|viewingRequest)\s*\.\s*(findMany|findFirst|count|groupBy|aggregate)\s*\(/g

const SAFETY_RE = /\b(mergeWhereOmitExcludedUserLink|mergeWhereOmitExcludedUserLinkRequired)\b/

// ─── Subcommand registry ───────────────────────────────────────────────────

const SUBCOMMANDS = {
  'delegate-sensitive-queries': {
    summary: 'Static guard for VIP exclusion on tenant-linked admin reads.',
    run: runDelegateSensitiveQueries,
    help: helpDelegateSensitiveQueries,
  },
  'prisma-migration-drift': {
    summary: 'Diff applied migrations against prisma/schema.prisma.',
    run: runPrismaMigrationDrift,
    help: helpPrismaMigrationDrift,
  },
}

// ─── Top-level dispatcher ──────────────────────────────────────────────────

const [, , rawSub, ...rest] = process.argv

if (!rawSub || rawSub === '--help' || rawSub === '-h') {
  showTopHelp()
  process.exit(0)
}

const sub = SUBCOMMANDS[rawSub]
if (!sub) {
  console.error(`Unknown subcommand: ${rawSub}\n`)
  showTopHelp()
  process.exit(1)
}

if (rest.includes('--help') || rest.includes('-h')) {
  sub.help()
  process.exit(0)
}

const exit = await sub.run(rest)
process.exit(typeof exit === 'number' ? exit : 0)

function showTopHelp() {
  console.log(`
check — consolidated CI / pre-deploy check CLI

Usage:
  node scripts/check.mjs <subcommand> [options]

Subcommands:`)
  for (const [name, def] of Object.entries(SUBCOMMANDS)) {
    console.log(`  ${name.padEnd(28)} ${def.summary}`)
  }
  console.log(`
Run \`node scripts/check.mjs <subcommand> --help\` for subcommand options.
`)
}

// ─── Subcommand: delegate-sensitive-queries ────────────────────────────────

function helpDelegateSensitiveQueries() {
  console.log(`
check delegate-sensitive-queries — VIP exclusion guard for admin reads

Usage:
  node scripts/check.mjs delegate-sensitive-queries

Scans server/api/admin/**/*.ts for findMany / findFirst / count / groupBy /
aggregate calls on PropertyInquiry, HomeEstimate, or ViewingRequest, and
fails (exit 1) if the file does not use mergeWhereOmitExcludedUserLink or
mergeWhereOmitExcludedUserLinkRequired (see server/utils/delegateUserManagement.ts).

Public routes and create/update-by-id handlers are out of scope.

Options:
  --help, -h       Show this help
`)
}

function stripTsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
}

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walkTsFiles(full, out)
    else if (name.isFile() && name.name.endsWith('.ts') && !name.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}

function relative(p) {
  return path.relative(repoRoot, p)
}

function runDelegateSensitiveQueries() {
  const adminApiRoot = path.join(repoRoot, 'server', 'api', 'admin')
  const files = walkTsFiles(adminApiRoot)
  const failures = []

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const source = stripTsComments(raw)
    MODEL_READ_RE.lastIndex = 0
    if (!MODEL_READ_RE.test(source)) continue
    if (SAFETY_RE.test(source)) continue

    const hits = []
    MODEL_READ_RE.lastIndex = 0
    let m
    while ((m = MODEL_READ_RE.exec(source)) !== null) {
      hits.push(`${m[1]}.${m[2]}()`)
    }
    failures.push({
      file: relative(file),
      hits: [...new Set(hits)],
    })
  }

  if (failures.length) {
    console.error(
      '\nDelegate VIP scoping guard failed. Admin routes that read PropertyInquiry / HomeEstimate / ViewingRequest in bulk must use mergeWhereOmitExcludedUserLink or mergeWhereOmitExcludedUserLinkRequired (see server/utils/delegateUserManagement.ts).\n',
    )
    for (const { file, hits } of failures) {
      console.error(`  ${file}`)
      console.error(`    Detected: ${hits.join(', ')}`)
    }
    console.error('\nSee docs/delegation-vip-scoping.md\n')
    return 1
  }

  console.log(`OK: delegate-sensitive model reads under ${relative(adminApiRoot)} use exclusion merge helpers.`)
  return 0
}

// ─── Subcommand: prisma-migration-drift ────────────────────────────────────

function helpPrismaMigrationDrift() {
  console.log(`
check prisma-migration-drift — compare migrations to schema.prisma

Usage:
  node scripts/check.mjs prisma-migration-drift              # print SQL diff
  node scripts/check.mjs prisma-migration-drift --exit-code  # exit 2 if drift (CI)

Empty stdout means migrations are in sync with prisma/schema.prisma.
Requires Postgres where the user may create shadow DBs (same as Prisma Migrate).

Env:
  SHADOW_DATABASE_URL   Defaults to postgresql://postgres:postgres@127.0.0.1:5433/postgres

Options:
  --exit-code      Exit 2 (instead of 0) if drift is detected. For CI.
  --help, -h       Show this help
`)
}

function runPrismaMigrationDrift(args) {
  const shadowUrl =
    process.env.SHADOW_DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:5433/postgres'

  const cmd = [
    'prisma',
    'migrate',
    'diff',
    '--from-migrations',
    './prisma/migrations',
    '--to-schema-datamodel',
    './prisma/schema.prisma',
    '--shadow-database-url',
    shadowUrl,
    '--script',
  ]

  if (args.includes('--exit-code')) cmd.push('--exit-code')

  const result = spawnSync('npx', cmd, {
    cwd: repoRoot,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error('Failed to spawn npx prisma:', result.error.message)
    return 1
  }
  return result.status ?? 0
}
