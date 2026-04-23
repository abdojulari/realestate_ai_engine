import { ref, watch, onBeforeUnmount, computed } from 'vue'
// @ts-ignore — runtime alias resolved by Nuxt
import { api } from '~/utils/api'

/**
 * Shared helpers for the admin blog editor (`/admin/blog/new` and `/admin/blog/[id]`).
 *
 * Provides:
 *  - `uploadBlogImage`     – uploads with client-side size pre-check, progress
 *                            tracking, and real (server) error messages.
 *  - `useBlogAutoSave`     – debounced auto-save for an existing post.
 *  - Shared constants used by both editor screens.
 */

export const BLOG_IMAGE_MAX_BYTES = 15 * 1024 * 1024 // keep in sync with server
export const BLOG_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export type UploadProgress = {
  percent: number
  loaded: number
  total: number
}

export type UploadResult =
  | { ok: true; url: string; bytes: number }
  | { ok: false; code: string; message: string }

/**
 * Pre-validates and uploads a blog image. Always resolves with a discriminated
 * `UploadResult` instead of throwing — callers can show the message directly.
 *
 * `onProgress` is invoked while the upload is in flight (when supported by the
 * runtime; falls back to indeterminate when not).
 */
export async function uploadBlogImage(
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  if (!file) {
    return { ok: false, code: 'NO_FILE', message: 'No file selected.' }
  }

  if (!BLOG_IMAGE_ALLOWED_TYPES.includes(file.type as any)) {
    return {
      ok: false,
      code: 'INVALID_TYPE',
      message: `Unsupported format${file.type ? ` (${file.type})` : ''}. Use JPEG, PNG, GIF, or WebP.`,
    }
  }

  if (file.size > BLOG_IMAGE_MAX_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    const maxMb = Math.round(BLOG_IMAGE_MAX_BYTES / (1024 * 1024))
    return {
      ok: false,
      code: 'PAYLOAD_TOO_LARGE',
      message: `Image is ${sizeMb}MB — the limit is ${maxMb}MB. Please compress or resize it first.`,
    }
  }

  // We use XHR (not fetch) so we get reliable upload-progress events.
  return await new Promise<UploadResult>((resolve) => {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/admin/blog/upload-image', true)

      const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || ''
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return
          onProgress({
            percent: Math.round((evt.loaded / evt.total) * 100),
            loaded: evt.loaded,
            total: evt.total,
          })
        }
      }

      xhr.onload = () => {
        try {
          const body = xhr.responseText ? JSON.parse(xhr.responseText) : null
          if (xhr.status >= 200 && xhr.status < 300 && body?.url) {
            resolve({ ok: true, url: body.url, bytes: body.bytes ?? file.size })
            return
          }
          // h3 createError shape: { statusMessage, data: { code, message } }
          const code = body?.data?.code || body?.code || `HTTP_${xhr.status}`
          const message =
            body?.data?.message ||
            body?.statusMessage ||
            body?.message ||
            (xhr.status === 413
              ? 'Image is too large for the server. Try compressing it first.'
              : xhr.status === 401
                ? 'You are not signed in. Please sign in again and retry.'
                : 'Upload failed. Please try again.')
          resolve({ ok: false, code, message })
        } catch (err: any) {
          resolve({
            ok: false,
            code: 'PARSE_ERROR',
            message: err?.message || 'Unexpected server response.',
          })
        }
      }

      xhr.onerror = () => {
        resolve({
          ok: false,
          code: 'NETWORK_ERROR',
          message: 'Network error — check your connection and try again.',
        })
      }

      xhr.send(formData)
    } catch (err: any) {
      resolve({
        ok: false,
        code: 'CLIENT_ERROR',
        message: err?.message || 'Could not start upload.',
      })
    }
  })
}

/**
 * Debounced auto-save for the blog edit screen.
 *
 * Watches the `formRef` and PUTs to `/api/admin/blog/:id` ~`debounceMs` after
 * the last change. Skips when the post hasn't been hydrated yet, when offline,
 * or when an explicit `enabled` ref is `false` (e.g. while a manual save is
 * already in flight).
 */
export function useBlogAutoSave(opts: {
  postId: () => number | null | undefined
  form: { value: any }
  enabled?: { value: boolean }
  debounceMs?: number
  onSaved?: (post: any) => void
  onError?: (err: any) => void
}) {
  const debounceMs = opts.debounceMs ?? 2500
  const status = ref<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')
  const lastSavedAt = ref<Date | null>(null)
  const lastError = ref<string>('')
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false

  const isOnline = computed(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine !== false
  })

  const flush = async () => {
    const id = opts.postId()
    if (!id) return
    if (opts.enabled && opts.enabled.value === false) return
    if (!isOnline.value) {
      status.value = 'error'
      lastError.value = 'Offline — changes will save when you reconnect.'
      return
    }
    if (inFlight) return

    inFlight = true
    status.value = 'saving'
    try {
      const result: any = await api.put(`/api/admin/blog/${id}`, opts.form.value)
      lastSavedAt.value = new Date()
      status.value = 'saved'
      lastError.value = ''
      opts.onSaved?.(result?.post ?? result)
    } catch (err: any) {
      status.value = 'error'
      lastError.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Auto-save failed'
      opts.onError?.(err)
    } finally {
      inFlight = false
    }
  }

  const schedule = () => {
    status.value = 'pending'
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, debounceMs)
  }

  // We only want to auto-save in response to *user* edits, not the initial
  // server hydration. The caller is expected to keep `enabled` false while
  // `loading` is true, so every server-side mutation (including the
  // tag/metaKeywords normalisation in fetchPost) is naturally ignored here.
  //
  // Once enabled flips to true, the form is fully hydrated and the next
  // mutation we see is a genuine user edit – schedule a save then.
  const stop = watch(
    () => opts.form.value,
    () => {
      const isEnabled = opts.enabled ? opts.enabled.value : true
      if (!isEnabled) return
      if (!opts.postId()) return
      schedule()
    },
    { deep: true },
  )

  // Warn the author (but don't block) if they navigate away while a debounced
  // auto-save is still pending. We deliberately do NOT use `navigator.sendBeacon`
  // here: it can only POST, while our update endpoint expects PUT, so any
  // beacon would silently 404. The browser's confirmation prompt is enough –
  // the user can cancel, wait for the save indicator to flip to "Saved", and
  // then leave.
  let beforeUnload: ((e: BeforeUnloadEvent) => void) | null = null
  if (typeof window !== 'undefined') {
    beforeUnload = (e: BeforeUnloadEvent) => {
      if ((status.value === 'pending' || status.value === 'saving') && opts.postId()) {
        e.preventDefault()
        // Older browsers require returnValue to be set to trigger the prompt.
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
    stop()
    if (beforeUnload && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', beforeUnload)
    }
  })

  return {
    status,
    lastSavedAt,
    lastError,
    /** Force an immediate save (e.g. before navigation). */
    flush,
  }
}
