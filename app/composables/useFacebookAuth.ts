/**
 * Composable for Facebook OAuth authentication and page management
 * Handles Facebook login, page selection, and access token management
 */

declare const FB: any
declare global {
  interface Window {
    fbAsyncInit: (() => void) | undefined
  }
}

/**
 * Typed login-failure kinds. See FacebookLoginError below for context.
 */
export type FbLoginErrorKind = 'cancelled' | 'closed' | 'not_authorized' | 'unknown'

/**
 * Distinguishes the three failure modes Meta collapses into a single
 * "FB.login returned no authResponse" event:
 *   - `cancelled`      → user clicked Cancel (rare; we map ambiguous cases here too).
 *   - `closed`         → user dismissed the dialog without deciding.
 *   - `not_authorized` → Meta refused the permission grant — usually because
 *                        the user isn't on our FB App roles list while we're
 *                        still pre-App-Review. This is the path that needs
 *                        the in-app "Request Access" CTA.
 *   - `unknown`        → SDK/network issue or anything else unexpected.
 *
 * Exported so calling components can do `instanceof FacebookLoginError` or
 * read `err.kind` and render the right copy + next-step CTA.
 */
export class FacebookLoginError extends Error {
  kind: FbLoginErrorKind
  constructor(kind: FbLoginErrorKind, message: string) {
    super(message)
    this.name = 'FacebookLoginError'
    this.kind = kind
  }
}

export const useFacebookAuth = () => {
  const config = useRuntimeConfig()
  const isInitialized = ref(false)
  const isLoggedIn = ref(false)
  const userAccessToken = ref<string | null>(null)
  const userId = ref<string | null>(null)

  const initAndResolve = (resolve: () => void) => {
    FB.init({
      appId: config.public.facebookAppId,
      cookie: true,
      xfbml: true,
      version: 'v24.0'
    })
    isInitialized.value = true

    FB.getLoginStatus((response: any) => {
      if (response.status === 'connected') {
        isLoggedIn.value = true
        userAccessToken.value = response.authResponse.accessToken
        userId.value = response.authResponse.userID
      }
    })

    resolve()
  }

  const initFacebookSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (isInitialized.value) {
        resolve()
        return
      }

      if (typeof FB !== 'undefined') {
        initAndResolve(resolve)
        return
      }

      window.fbAsyncInit = function () {
        if (typeof FB !== 'undefined') {
          initAndResolve(resolve)
        }
      }

      const existingScript = document.querySelector('script[src*="connect.facebook.net"]')
      if (!existingScript) {
        const js = document.createElement('script')
        js.id = 'facebook-jssdk'
        js.src = 'https://connect.facebook.net/en_US/sdk.js'
        js.onerror = () => reject(new Error('Failed to load Facebook SDK'))
        document.body.appendChild(js)
      }

      setTimeout(() => {
        if (!isInitialized.value) {
          reject(new Error(
            'Facebook SDK failed to initialize. Check that FACEBOOK_APP_ID is set correctly.'
          ))
        }
      }, 10000)
    })
  }

  /**
   * Login with Facebook
   * Requests necessary permissions for page management and posting.
   *
   * Failure handling — Meta returns the same shape (`{ status, authResponse: null }`)
   * for three quite different things, so we differentiate on the `status`
   * field and surface a typed error:
   *
   *   • status === 'connected'      → success (handled in the if-branch).
   *   • status === 'not_authorized' → the user *did* go through the dialog
   *     but either declined OR (the common case for SaaS) the user wasn't
   *     on our FB App's roles list while we're still pre-App-Review. The
   *     SDK can't tell us which; we route both to the Request-Access path.
   *   • status === 'unknown'        → user closed the dialog or hadn't
   *     logged into facebook.com. Genuine "cancel"-ish; just retry.
   *   • anything else (no response) → SDK/network issue.
   */
  const login = async (): Promise<any> => {
    await initFacebookSDK()

    return new Promise((resolve, reject) => {
      if (typeof FB === 'undefined') {
        reject(new FacebookLoginError('unknown', 'Facebook SDK not loaded'))
        return
      }

      FB.login(
        (response: any) => {
          if (response?.authResponse) {
            isLoggedIn.value = true
            userAccessToken.value = response.authResponse.accessToken
            userId.value = response.authResponse.userID
            resolve(response.authResponse)
            return
          }

          const status = response?.status as string | undefined
          if (status === 'not_authorized') {
            reject(new FacebookLoginError(
              'not_authorized',
              "Facebook didn't issue a token. If you're sure you accepted the permissions, your Facebook account hasn't been granted access to our app yet — we're currently in Meta's App Review process. Request access below and we'll whitelist your account within one business day.",
            ))
            return
          }
          if (status === 'unknown') {
            reject(new FacebookLoginError(
              'closed',
              'The Facebook login window was closed before completing. Click "Login with Facebook" to try again.',
            ))
            return
          }
          reject(new FacebookLoginError(
            'cancelled',
            'Facebook login did not complete. If you clicked Cancel, just try again. If the dialog never appeared, your browser may have blocked the popup.',
          ))
        },
        {
          scope: 'email,pages_manage_posts,pages_read_engagement,pages_show_list'
        }
      )
    })
  }

  /**
   * Logout from Facebook
   */
  const logout = async (): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof FB !== 'undefined' && isLoggedIn.value) {
        FB.logout(() => {
          isLoggedIn.value = false
          userAccessToken.value = null
          userId.value = null
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Get user's Facebook pages
   */
  const getPages = async (): Promise<any[]> => {
    if (!userAccessToken.value) {
      throw new Error('User not authenticated')
    }

    try {
      const pages = await $fetch('/api/facebook/pages', {
        method: 'POST',
        body: {
          userAccessToken: userAccessToken.value
        }
      })
      return pages
    } catch (error) {
      console.error('Error fetching pages:', error)
      throw error
    }
  }

  /**
   * Post to a Facebook page
   */
  const postToPage = async (
    pageId: string,
    pageAccessToken: string,
    message: string,
    imageUrl?: string
  ): Promise<any> => {
    try {
      const result = await $fetch('/api/facebook/post', {
        method: 'POST',
        body: {
          pageId,
          pageAccessToken,
          message,
          imageUrl
        }
      })
      return result
    } catch (error) {
      console.error('Error posting to page:', error)
      throw error
    }
  }

  return {
    isInitialized,
    isLoggedIn,
    userAccessToken,
    userId,
    initFacebookSDK,
    login,
    logout,
    getPages,
    postToPage
  }
}

