import { resolveStoredUploadUrl } from './publicMediaUrl'

/** Normalize logo/favicon/brokerage URLs for API responses (legacy DB values). */
export function mapTenantMediaFields<T extends {
  logoUrl?: string | null
  faviconUrl?: string | null
  brokerageLogoUrl?: string | null
}>(row: T): T {
  return {
    ...row,
    logoUrl: resolveStoredUploadUrl(row.logoUrl ?? null) as T['logoUrl'],
    faviconUrl: resolveStoredUploadUrl(row.faviconUrl ?? null) as T['faviconUrl'],
    brokerageLogoUrl: resolveStoredUploadUrl(row.brokerageLogoUrl ?? null) as T['brokerageLogoUrl'],
  }
}
