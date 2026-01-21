/**
 * Composable for Facebook OAuth authentication and page management
 * Handles Facebook login, page selection, and access token management
 */

export const useFacebookAuth = () => {
  const config = useRuntimeConfig()
  const isInitialized = ref(false)
  const isLoggedIn = ref(false)
  const userAccessToken = ref<string | null>(null)
  const userId = ref<string | null>(null)

  /**
   * Initialize Facebook SDK
   */
  const initFacebookSDK = (): Promise<void> => {
    return new Promise((resolve) => {
      if (isInitialized.value) {
        resolve()
        return
      }

      window.fbAsyncInit = function () {
        if (typeof FB !== 'undefined') {
          FB.init({
            appId: config.public.facebookAppId,
            cookie: true,
            xfbml: true,
            version: 'v18.0'
          })
          isInitialized.value = true

          // Check login status
          FB.getLoginStatus((response: any) => {
            if (response.status === 'connected') {
              isLoggedIn.value = true
              userAccessToken.value = response.authResponse.accessToken
              userId.value = response.authResponse.userID
            }
          })

          resolve()
        }
      }

      // Load SDK if not already loaded
      if (!document.getElementById('facebook-jssdk')) {
        const js = document.createElement('script')
        js.id = 'facebook-jssdk'
        js.src = 'https://connect.facebook.net/en_US/sdk.js'
        document.body.appendChild(js)
      } else {
        // SDK already loaded
        if (typeof window.fbAsyncInit === 'function') {
          window.fbAsyncInit()
        }
      }
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
          scope: 'pages_manage_posts,pages_read_engagement,pages_show_list'
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

