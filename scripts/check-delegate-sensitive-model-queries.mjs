#!/usr/bin/env node
/**
 * CI guard: delegated assistants must not list/count/group tenant-linked rows
 * (PropertyInquiry, HomeEstimate, ViewingRequest) without applying VIP exclusion
 * via mergeWhereOmitExcludedUserLink or mergeWhereOmitExcludedUserLinkRequired.
 *
 * Scope: server/api/admin only. Public routes and create/update-by-id handlers are out of scope.
 *
 * Run: node scripts/check-delegate-sensitive-model-queries.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const adminApiRoot = path.join(repoRoot, 'server', 'api', 'admin')

const MODEL_READ_RE =
  /(?:\(prisma\s+as\s+any\)|prisma)\.(propertyInquiry|homeEstimate|viewingRequest)\s*\.\s*(findMany|findFirst|count|groupBy|aggregate)\s*\(/g

const SAFETY_RE =
  /\b(mergeWhereOmitExcludedUserLink|mergeWhereOmitExcludedUserLinkRequired)\b/

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

function main() {
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
      '\nDelegate VIP scoping guard failed. Admin routes that read PropertyInquiry / HomeEstimate / ViewingRequest in bulk must use mergeWhereOmitExcludedUserLink or mergeWhereOmitExcludedUserLinkRequired (see server/utils/delegateUserManagement.ts).\n'
    )
    for (const { file, hits } of failures) {
      console.error(`  ${file}`)
      console.error(`    Detected: ${hits.join(', ')}`)
    }
    console.error('\nSee docs/delegation-vip-scoping.md\n')
    process.exit(1)
  }

  console.log(
    `OK: delegate-sensitive model reads under ${relative(adminApiRoot)} use exclusion merge helpers.`
  )
}

main()
