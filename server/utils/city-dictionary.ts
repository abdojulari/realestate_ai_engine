/**
 * Bidirectional city dictionary for cross-source MLS reconciliation.
 *
 * Pillar9 / Matrix returns 4-digit numeric `City` codes (e.g. `'0046'`),
 * while CREA returns human-readable names (e.g. `'Calgary'`). To dedupe
 * between feeds, populate filter dropdowns, and let queries like
 * `/api/admin/price-cuts?city=Edmonton` match BOTH shapes, we need a
 * single source of truth that maps:
 *
 *   - code  → canonical name        (Pillar9 ingestion / display)
 *   - name  → all matching codes    (price-cuts / off-market query layer)
 *   - alias → canonical name        ("St Albert" → "St. Albert")
 *
 * Calgary intentionally has TWO codes:
 *   - `'0046'` Calgary (catch-all)
 *   - `'0047'` Calgary (NW)
 * Both canonicalise to `"Calgary"` so a CREA "Calgary" lookup pulls in
 * both Pillar9 buckets, and the off-market dropdown shows just one
 * "Calgary" option.
 *
 * NOTE: only Alberta is populated today (CREA + Pillar9 coverage
 * footprint). Adding other provinces is a matter of appending entries
 * to {@link ALBERTA_CITIES} (keep `province` correct) and, for any
 * unnamed numeric codes Pillar9 returns, listing them in
 * {@link UNNAMED_PILLAR9_AB_CODES} (or a sibling constant for the new
 * province) so the sync loop still iterates them.
 */

export type Province =
  | 'AB' | 'BC' | 'SK' | 'MB' | 'ON' | 'QC' | 'NB' | 'NS' | 'PE' | 'NL'
  | 'YT' | 'NT' | 'NU'

export interface CityEntry {
  /** Canonical display name. Stored in `Property.city` and shown in UI. */
  name: string
  /** All Pillar9 / Matrix `City` codes whose listings should canonicalise to `name`. */
  codes: readonly string[]
  /**
   * Punctuation / spelling variants that should ALSO resolve to this entry.
   * Matched after {@link normalize} (case-insensitive, punctuation-insensitive),
   * so `'St Albert'` and `'Saint Albert'` both work without extra entries.
   */
  aliases?: readonly string[]
  province: Province
}

/**
 * Named Alberta cities. Codes here are taken from the verified
 * Pillar9 / Matrix `City` enum on the `abrls.matrixwebapi.com` tenant.
 *
 * If you add an entry, also remove its code(s) from
 * {@link UNNAMED_PILLAR9_AB_CODES} if present — the two sets must stay
 * disjoint or `getAllPillar9CityCodes` will produce duplicates.
 */
const ALBERTA_CITIES: readonly CityEntry[] = [
  // ── Calgary metro ──────────────────────────────────────────────────
  // CREA returns 'Calgary' for both. Pillar9 splits the NW quadrant.
  { name: 'Calgary', codes: ['0046', '0047'], aliases: ['Calgary (NW)'], province: 'AB' },
  { name: 'Airdrie', codes: ['0264'], province: 'AB' },
  { name: 'Cochrane', codes: ['0265'], province: 'AB' },
  { name: 'Okotoks', codes: ['0380'], province: 'AB' },
  { name: 'Chestermere', codes: ['0200'], province: 'AB' },
  { name: 'Strathmore', codes: ['0202'], province: 'AB' },
  { name: 'High River', codes: ['0204'], province: 'AB' },
  { name: 'Crossfield', codes: ['0197'], province: 'AB' },
  { name: 'Carstairs', codes: ['0195'], province: 'AB' },
  { name: 'Didsbury', codes: ['0192'], province: 'AB' },
  { name: 'Olds', codes: ['0190'], province: 'AB' },
  { name: 'Innisfail', codes: ['0187'], province: 'AB' },
  { name: 'Irricana', codes: ['0199'], province: 'AB' },

  // ── Edmonton metro ─────────────────────────────────────────────────
  { name: 'Edmonton', codes: ['0100'], province: 'AB' },
  // CREA writes "St. Albert"; agents/brokerages often type "St Albert"
  // or "Saint Albert" in free-text fields. Cover all three.
  { name: 'St. Albert', codes: ['0102'], aliases: ['St Albert', 'Saint Albert'], province: 'AB' },
  { name: 'Spruce Grove', codes: ['0150'], province: 'AB' },
  { name: 'Stony Plain', codes: ['0152'], province: 'AB' },
  { name: 'Leduc', codes: ['0154'], province: 'AB' },
  { name: 'Fort Saskatchewan', codes: ['0156'], aliases: ['Ft. Saskatchewan', 'Ft Saskatchewan'], province: 'AB' },
  { name: 'Sherwood Park', codes: ['0159'], province: 'AB' },
  { name: 'Beaumont', codes: ['0161'], province: 'AB' },
  { name: 'Morinville', codes: ['0165'], province: 'AB' },
  { name: 'Devon', codes: ['0167'], province: 'AB' },

  // ── Central Alberta ────────────────────────────────────────────────
  { name: 'Red Deer', codes: ['0114'], province: 'AB' },
  { name: 'Sylvan Lake', codes: ['0125'], province: 'AB' },
  { name: 'Lacombe', codes: ['0182'], province: 'AB' },
  { name: 'Ponoka', codes: ['0184'], province: 'AB' },
  { name: 'Camrose', codes: ['0170'], province: 'AB' },
  { name: 'Wetaskiwin', codes: ['0172'], province: 'AB' },
  { name: 'Drayton Valley', codes: ['0168'], province: 'AB' },
  { name: 'Stettler', codes: ['0300'], province: 'AB' },
  { name: 'Hanna', codes: ['0302'], province: 'AB' },
  { name: 'Drumheller', codes: ['0304'], province: 'AB' },
  { name: 'Three Hills', codes: ['0306'], province: 'AB' },
  { name: 'Trochu', codes: ['0308'], province: 'AB' },
  { name: 'Sundre', codes: ['0310'], province: 'AB' },
  { name: 'Rocky Mountain House', codes: ['0312'], province: 'AB' },
  { name: 'Rimbey', codes: ['0314'], province: 'AB' },
  { name: 'Bentley', codes: ['0316'], province: 'AB' },
  { name: 'Blackfalds', codes: ['0318'], province: 'AB' },
  { name: 'Penhold', codes: ['0320'], province: 'AB' },

  // ── Southern Alberta ───────────────────────────────────────────────
  { name: 'Lethbridge', codes: ['0134'], province: 'AB' },
  { name: 'Medicine Hat', codes: ['0141'], province: 'AB' },
  { name: 'Brooks', codes: ['0145'], province: 'AB' },
  { name: 'Nanton', codes: ['0206'], province: 'AB' },
  { name: 'Claresholm', codes: ['0208'], province: 'AB' },
  { name: 'Vulcan', codes: ['0210'], province: 'AB' },
  { name: 'Taber', codes: ['0212'], province: 'AB' },
  { name: 'Coaldale', codes: ['0214'], province: 'AB' },
  { name: 'Raymond', codes: ['0216'], province: 'AB' },
  { name: 'Cardston', codes: ['0218'], province: 'AB' },
  { name: 'Pincher Creek', codes: ['0220'], province: 'AB' },
  { name: 'Crowsnest Pass', codes: ['0222'], province: 'AB' },

  // ── Mountain corridor ──────────────────────────────────────────────
  { name: 'Canmore', codes: ['0224'], province: 'AB' },
  { name: 'Banff', codes: ['0226'], province: 'AB' },
  { name: 'Jasper', codes: ['0228'], province: 'AB' },

  // ── Western / North-central Alberta ────────────────────────────────
  { name: 'Hinton', codes: ['0230'], province: 'AB' },
  { name: 'Edson', codes: ['0232'], province: 'AB' },
  { name: 'Whitecourt', codes: ['0234'], province: 'AB' },
  { name: 'Slave Lake', codes: ['0236'], province: 'AB' },
  { name: 'Athabasca', codes: ['0238'], province: 'AB' },
  { name: 'Westlock', codes: ['0240'], province: 'AB' },
  { name: 'Barrhead', codes: ['0242'], province: 'AB' },

  // ── Northern Alberta ───────────────────────────────────────────────
  { name: 'Grande Prairie', codes: ['0201'], province: 'AB' },
  { name: 'Fort McMurray', codes: ['0203'], aliases: ['Ft. McMurray', 'Ft McMurray'], province: 'AB' },
  { name: 'Lloydminster', codes: ['0205'], province: 'AB' },
  { name: 'Peace River', codes: ['0244'], province: 'AB' },
  { name: 'Fairview', codes: ['0246'], province: 'AB' },
  { name: 'High Level', codes: ['0248'], province: 'AB' },

  // ── Lakeland ───────────────────────────────────────────────────────
  { name: 'Bonnyville', codes: ['0250'], province: 'AB' },
  { name: 'Cold Lake', codes: ['0252'], province: 'AB' },
  { name: 'Vegreville', codes: ['0254'], province: 'AB' },
  { name: 'Vermilion', codes: ['0256'], province: 'AB' },
  { name: 'Wainwright', codes: ['0258'], province: 'AB' },
]

/**
 * Pillar9/Matrix codes the AB tenant returns but for which we don't yet
 * have a confirmed canonical name. Listed here so {@link getAllPillar9CityCodes}
 * can still iterate them during sync — listings come back tagged with
 * the raw code (e.g. `Property.city = '0357'`) until someone moves the
 * code into {@link ALBERTA_CITIES} with a proper name.
 *
 * Keep disjoint from any `codes` array in `ALBERTA_CITIES` to avoid
 * double-iteration during sync.
 */
const UNNAMED_PILLAR9_AB_CODES: readonly string[] = [
  '0322', '0324', '0326', '0328', '0330',
  '0332', '0334', '0336', '0338', '0340', '0342', '0344', '0346', '0348', '0350',
  '0352', '0354', '0356', '0358', '0360', '0362', '0364', '0366', '0368', '0370',
  '0372', '0374', '0376', '0378', '0381', '0383', '0385', '0387', '0389', '0391',
  '0393', '0395', '0397', '0399', '0401', '0403', '0405', '0407', '0409', '0411',
  '0413', '0415', '0417', '0419', '0421', '0423', '0425', '0427', '0429', '0431',
  '0433', '0435', '0437', '0439', '0441', '0443', '0445', '0447', '0449', '0451',
  '0453', '0455', '0457', '0459', '0461', '0463', '0465', '0467', '0469', '0471',
  '0473', '0475', '0477', '0479', '0481', '0483', '0485', '0487', '0489', '0491',
  '0493', '0495', '0497', '0499', '0501', '0503', '0505', '0507', '0509', '0511',
  '0513', '0515', '0517', '0519', '0521', '0523', '0525', '0527', '0529', '0531',
  '0533', '0535', '0537', '0539', '0541', '0543', '0545', '0547', '0549', '0551',
  '0553', '0555', '0557', '0559', '0561', '0563', '0565', '0567', '0569', '0571',
  '0573', '0575', '0577', '0579', '0581', '0583', '0585', '0587', '0589', '0591',
]

// ── Lookup tables (built once at import time) ──────────────────────────

const codeToEntry = new Map<string, CityEntry>()
const normalizedNameToEntry = new Map<string, CityEntry>()

/**
 * Lower-case + collapse all punctuation/whitespace into single spaces so
 * `"St. Albert"`, `"st  albert"`, and `"st-albert"` all hash the same.
 * Used for both lookup keys and incoming queries.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,()_\-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

for (const entry of ALBERTA_CITIES) {
  for (const code of entry.codes) {
    if (codeToEntry.has(code)) {
      // Programmer error — fail loudly at boot rather than silently
      // dropping the second mapping.
      throw new Error(
        `city-dictionary: duplicate code '${code}' (mapped to both ` +
        `'${codeToEntry.get(code)!.name}' and '${entry.name}')`,
      )
    }
    codeToEntry.set(code, entry)
  }
  const allNames = [entry.name, ...(entry.aliases ?? [])]
  for (const n of allNames) {
    const key = normalize(n)
    if (!key) continue
    if (normalizedNameToEntry.has(key) && normalizedNameToEntry.get(key) !== entry) {
      throw new Error(
        `city-dictionary: alias '${n}' conflicts between ` +
        `'${normalizedNameToEntry.get(key)!.name}' and '${entry.name}'`,
      )
    }
    normalizedNameToEntry.set(key, entry)
  }
}

const CITY_CODE_PATTERN = /^\d{3,4}$/

// ── Public API ─────────────────────────────────────────────────────────

/** True when the input looks like a raw 3- or 4-digit Pillar9 city code. */
export function isCityCode(input: string | null | undefined): boolean {
  return typeof input === 'string' && CITY_CODE_PATTERN.test(input.trim())
}

/**
 * Resolve a code OR a name (or alias) to its canonical {@link CityEntry}.
 * Returns `null` when the value isn't in the dictionary.
 */
export function lookupCity(input: string | null | undefined): CityEntry | null {
  if (!input) return null
  const trimmed = String(input).trim()
  if (!trimmed) return null
  if (isCityCode(trimmed)) return codeToEntry.get(trimmed) ?? null
  return normalizedNameToEntry.get(normalize(trimmed)) ?? null
}

/**
 * Code OR name → canonical display name.
 * Falls back to the raw input (trimmed) when unknown — preserves the
 * historical behaviour of `pillar9Service.getCityName`.
 */
export function getCanonicalCityName(input: string | null | undefined): string {
  const entry = lookupCity(input)
  if (entry) return entry.name
  return input ? String(input).trim() : ''
}

/**
 * Code OR name → every Pillar9 code that maps to the same canonical city.
 * Returns `[]` when unknown.
 *
 * Examples (Calgary has two codes, others are 1:1):
 *   getCodesForCity('Calgary')      → ['0046', '0047']
 *   getCodesForCity('Calgary (NW)') → ['0046', '0047']  (alias)
 *   getCodesForCity('0047')         → ['0046', '0047']  (sibling lookup)
 *   getCodesForCity('Edmonton')     → ['0100']
 */
export function getCodesForCity(input: string | null | undefined): string[] {
  const entry = lookupCity(input)
  return entry ? [...entry.codes] : []
}

/**
 * All canonical display names, optionally filtered by province.
 * Sorted alphabetically. Useful as a deterministic dropdown fallback
 * when no DB rows are available yet.
 */
export function getAllCityNames(province?: Province): string[] {
  return ALBERTA_CITIES
    .filter(e => !province || e.province === province)
    .map(e => e.name)
    .slice()
    .sort()
}

/**
 * Every Pillar9/Matrix city code we want the sync loop to iterate.
 * Replaces the legacy `pillar9Service.getAlbertaCityCodes()` so the list
 * lives next to its name mappings.
 *
 * Includes BOTH named codes (from {@link ALBERTA_CITIES}) and the
 * unnamed numeric ones (from {@link UNNAMED_PILLAR9_AB_CODES}) so we
 * don't accidentally stop fetching a city just because its name hasn't
 * been added to the dictionary yet.
 */
export function getAllPillar9CityCodes(province?: Province): string[] {
  const named = ALBERTA_CITIES
    .filter(e => !province || e.province === province)
    .flatMap(e => e.codes)
  // UNNAMED_PILLAR9_AB_CODES is currently AB-only. When you add another
  // province, gate this list on `province` similarly.
  const unnamed = !province || province === 'AB' ? UNNAMED_PILLAR9_AB_CODES : []
  return [...named, ...unnamed]
}

/**
 * Convert a raw set of `Property.city` values (arbitrary mix of codes,
 * names, and aliases — whatever the various sync paths happened to
 * store) into a deduped, sorted set of canonical display names.
 *
 * Unknown values pass through unchanged UNLESS they look like a raw
 * numeric code (those are dropped because there's no human label to
 * show — same defensive behaviour the old filter-options endpoints had).
 */
export function canonicalizeCityList(raw: Iterable<string | null | undefined>): string[] {
  const out = new Set<string>()
  for (const v of raw) {
    if (!v) continue
    const trimmed = String(v).trim()
    if (!trimmed) continue
    const entry = lookupCity(trimmed)
    if (entry) {
      out.add(entry.name)
      continue
    }
    if (!isCityCode(trimmed)) {
      out.add(trimmed)
    }
  }
  return [...out].sort()
}

/**
 * Build a Prisma `OR` filter that matches a property whose `city`
 * column holds EITHER the canonical name (case-insensitive substring)
 * OR any Pillar9 code that maps to the same canonical city.
 *
 * Use this in admin endpoints (price-cuts, off-market) so a single
 * `?city=Edmonton` URL param matches CREA-style rows and any
 * Pillar9-only rows that haven't been canonicalised yet by the
 * `fix-city-codes` backfill.
 */
export function buildCityWhereClause(input: string | null | undefined): any[] {
  if (!input) return []
  const trimmed = String(input).trim()
  if (!trimmed) return []
  const conditions: any[] = []
  const entry = lookupCity(trimmed)
  if (entry) {
    // Match the canonical name AND every alias as a substring (handles
    // free-text variants stored by other sync paths).
    const nameVariants = [entry.name, ...(entry.aliases ?? [])]
    for (const n of nameVariants) {
      conditions.push({ city: { equals: n, mode: 'insensitive' } })
    }
    if (entry.codes.length > 0) {
      conditions.push({ city: { in: [...entry.codes] } })
    }
  } else {
    // Unknown input — fall back to a simple substring match so admins
    // can still type free-form city names not yet in the dictionary.
    conditions.push({ city: { contains: trimmed, mode: 'insensitive' } })
  }
  return conditions
}
