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
   * Requests necessary permissions for page management and posting
   */
  const login = async (): Promise<any> => {
    await initFacebookSDK()

    return new Promise((resolve, reject) => {
      if (typeof FB === 'undefined') {
        reject(new Error('Facebook SDK not loaded'))
        return
      }

      FB.login(
        (response: any) => {
          if (response.authResponse) {
            isLoggedIn.value = true
            userAccessToken.value = response.authResponse.accessToken
            userId.value = response.authResponse.userID
            resolve(response.authResponse)
          } else {
            reject(new Error('User cancelled login or did not grant permissions'))
          }
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

