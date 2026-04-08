'use strict'

/**
 * Nitro/Rollup bundling of @verdocs/js-sdk turns `require('axios-retry')` into a broken interop
 * for axios-retry v4 (namespace object instead of the default function). This shim always
 * requires the real CJS file from disk and exports the callable plugin.
 *
 * @see https://github.com/softonic/axios-retry/issues/259
 */

const path = require('node:path')
const fs = require('node:fs')
const { createRequire } = require('node:module')

function resolveProjectRoot() {
  const cwd = process.cwd()
  if (fs.existsSync(path.join(cwd, 'package.json'))) {
    return cwd
  }
  let dir = __dirname
  for (let i = 0; i < 40; i++) {
    const pkg = path.join(dir, 'package.json')
    if (fs.existsSync(pkg)) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }
  throw new Error(`[axios-retry shim] No package.json from cwd=${cwd} or __dirname=${__dirname}`)
}

const projectRoot = resolveProjectRoot()
const pkgJsonPath = path.join(projectRoot, 'package.json')
const req = createRequire(pkgJsonPath)

let pkgRoot
try {
  pkgRoot = path.dirname(req.resolve('axios-retry/package.json'))
} catch (e) {
  const flat = path.join(projectRoot, 'node_modules', 'axios-retry', 'package.json')
  if (fs.existsSync(flat)) {
    pkgRoot = path.dirname(flat)
  } else {
    throw new Error(
      `[axios-retry shim] Cannot resolve axios-retry from ${projectRoot}: ${e && e.message}`
    )
  }
}

const v4cjs = path.join(pkgRoot, 'dist', 'cjs', 'index.js')
const v3main = path.join(pkgRoot, 'index.js')
const v3libCjs = path.join(pkgRoot, 'lib', 'cjs', 'index.js')

/** Use `req(absPath)` — not bare `require(path)` — so Rollup/Nitro does not replace it with a throwing stub. */
let impl
if (fs.existsSync(v4cjs)) {
  impl = req(v4cjs)
} else if (fs.existsSync(v3main)) {
  impl = req(v3main)
} else if (fs.existsSync(v3libCjs)) {
  impl = req(v3libCjs)
} else {
  try {
    impl = req('axios-retry')
  } catch (e2) {
    throw new Error(`[axios-retry shim] No entry under ${pkgRoot}: ${e2 && e2.message}`)
  }
}

const fn = typeof impl === 'function' ? impl : impl.default
if (typeof fn !== 'function') {
  throw new Error('[axios-retry shim] Resolved module default is not a function')
}

module.exports = fn
