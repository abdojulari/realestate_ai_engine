/**
 * Compression middleware - DISABLED
 *
 * h3/Nitro handles response streaming internally and is not compatible with
 * raw response.write / response.end overrides.  Overriding them causes
 * "Received an instance of ServerResponse" errors because h3 pipes its own
 * internal objects through write().
 *
 * For production compression use one of:
 *   1. Nitro preset-level compression (e.g. `compressPublicAssets: true`)
 *   2. A reverse-proxy such as nginx with `gzip on;`
 *   3. A CDN (Cloudflare, Vercel, etc.) which compresses automatically
 */
export default defineEventHandler(() => {
  // No-op – compression is handled at the infrastructure level
})
