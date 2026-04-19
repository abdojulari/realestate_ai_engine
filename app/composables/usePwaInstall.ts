import { ref, onMounted, onBeforeUnmount, readonly } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/**
 * Capture the browser's `beforeinstallprompt` so we can show our own
 * "Install" button on the InstaConnect card (iOS shows its native banner).
 *
 * Also detects whether the page is already running standalone (installed).
 */
export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)
  const isStandalone = ref(false)
  const isIos = ref(false)
  const installed = ref(false)

  function onBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    canInstall.value = true
  }

  function onAppInstalled() {
    installed.value = true
    canInstall.value = false
    deferredPrompt.value = null
  }

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt.value) return 'unavailable'
    try {
      await deferredPrompt.value.prompt()
      const choice = await deferredPrompt.value.userChoice
      deferredPrompt.value = null
      canInstall.value = false
      return choice.outcome
    } catch {
      return 'dismissed'
    }
  }

  onMounted(() => {
    if (typeof window === 'undefined') return

    isStandalone.value =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as any).standalone === true

    const ua = window.navigator.userAgent || ''
    isIos.value = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', onAppInstalled)
  })

  onBeforeUnmount(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)
    window.removeEventListener('appinstalled', onAppInstalled)
  })

  return {
    canInstall: readonly(canInstall),
    isStandalone: readonly(isStandalone),
    isIos: readonly(isIos),
    installed: readonly(installed),
    promptInstall,
  }
}
