/**
 * Lease/rental detector for Property rows.
 *
 * Why this exists
 * ───────────────
 * CREA's RESO feed uses `StandardStatus = "Closed"` for both completed sales
 * AND completed leases. Until 2026-06 our CREA transformer (crea.service.ts)
 * blindly mapped any "closed" status to `status = 'sold'`, which means there
 * are legacy rows in the DB tagged as sold that are actually completed
 * leases. The transformer has now been fixed at the ingest layer, but CMA /
 * "best deals" / sold-comp endpoints still need a runtime guard for legacy
 * rows that won't be re-synced.
 *
 * This module is the single source of truth for "does this property row
 * actually represent a lease/rental transaction?" — anywhere we filter by
 * `status='sold'` or `status='for_sale'` for sale-only analytics, also call
 * `isLeaseLikeProperty()` and drop the matches.
 *
 * What we look at
 * ───────────────
 * The CREA transformer stores lease-specific RESO fields under
 * `Property.features` (see crea.service.ts:862-868):
 *   features.leaseAmount           — number, rent amount
 *   features.totalActualRent       — number, total rent collected
 *   features.leaseAmountFrequency  — "Monthly" / "Annually" / etc
 *   features.leasePerUnit          — per-unit lease string
 *   features.existingLeaseType     — array of lease types
 *
 * We also look at `Property.type` as a backstop in case the type label still
 * mentions lease/rental, and at type-coerced equivalents of those features
 * keyed under the original PascalCase RESO names (defensive — older rows
 * may have stored them un-renamed).
 */

function parseFeaturesObject(raw: unknown): Record<string, any> {
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {} } catch { return {} }
  }
  if (typeof raw === 'object') return raw as Record<string, any>
  return {}
}

function hasNonEmptyArray(value: unknown): boolean {
  if (!value) return false
  if (Array.isArray(value)) return value.some(v => typeof v === 'string' && v.trim().length > 0)
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveNumber(value: unknown): boolean {
  if (value == null) return false
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Returns true if this Property row looks like a lease/rental transaction
 * rather than a sale. Safe to call on rows from any source (CREA, Pillar9,
 * manual) — fields that aren't present just don't contribute.
 */
export function isLeaseLikeProperty(property: any): boolean {
  if (!property) return false

  const features = parseFeaturesObject(property.features)

  // Camel-case (current CREA transformer)
  if (isPositiveNumber(features.leaseAmount)) return true
  if (isPositiveNumber(features.totalActualRent)) return true
  if (isNonEmptyString(features.leaseAmountFrequency)) return true
  if (isNonEmptyString(features.leasePerUnit)) return true
  if (hasNonEmptyArray(features.existingLeaseType)) return true

  // PascalCase backstop (defensive — older syncs may have stored raw RESO names)
  if (isPositiveNumber(features.LeaseAmount)) return true
  if (isPositiveNumber(features.TotalActualRent)) return true
  if (isNonEmptyString(features.LeaseAmountFrequency)) return true
  if (isNonEmptyString(features.LeasePerUnit)) return true
  if (hasNonEmptyArray(features.ExistingLeaseType)) return true

  // PropertyType / PropertySubType backstop. We don't normally store these in
  // `type` (which is normalized to house/condo/townhouse/etc.), but check the
  // raw RESO fields if they leaked into features.
  const rawSubType = String(features.PropertySubType || features.propertySubType || '').toLowerCase()
  const rawPropType = String(features.PropertyType || features.propertyType || '').toLowerCase()
  if (rawSubType.includes('lease') || rawSubType.includes('rental') || rawSubType.includes('for rent')) return true
  if (rawPropType.includes('lease') || rawPropType.includes('rental') || rawPropType.includes('for rent')) return true

  const normalizedType = String(property.type || '').toLowerCase()
  if (normalizedType.includes('lease') || normalizedType.includes('rental')) return true

  return false
}
