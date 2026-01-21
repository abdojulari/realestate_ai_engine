/**
 * Composable for Threads (Meta) authentication and posting
 * Threads uses Facebook/Meta authentication system
 * Note: Threads API requires Meta verification and specific app setup
 */

export const useThreadsAuth = () => {
  const config = useRuntimeConfig()
  const { isLoggedIn, userAccessToken, login: fbLogin, logout: fbLogout } = useFacebookAuth()

  /**
   * Login for Threads (uses Facebook auth)
   */
  const login = async () => {
    return await fbLogin()
  }

  /**
   * Logout from Threads
   */
  const logout = async () => {
    return await fbLogout()
  }

  /**
   * Get Threads user profile
   */
  const getThreadsProfile = async (): Promise<any> => {
    if (!userAccessToken.value) {
      throw new Error('User not authenticated')
    }

    try {
      const profile = await $fetch('/api/threads/profile', {
        method: 'POST',
        body: {
          accessToken: userAccessToken.value
        }
      })
      return profile
    } catch (error) {
      console.error('Error fetching Threads profile:', error)
      throw error
    }
  }

  /**
   * Create a Threads post (text only)
   * @param text - Post content (max 500 characters)
   */
  const createPost = async (text: string): Promise<any> => {
    if (!userAccessToken.value) {
      throw new Error('User not authenticated')
    }

    if (text.length > 500) {
      throw new Error('Threads posts must be 500 characters or less')
    }

    try {
      const result = await $fetch('/api/threads/post', {
        method: 'POST',
        body: {
          accessToken: userAccessToken.value,
          text
        }
      })
      return result
    } catch (error) {
      console.error('Error creating Threads post:', error)
      throw error
    }
  }

  /**
   * Create a Threads post with media
   * @param text - Post content
   * @param imageUrl - URL of image to attach
   */
  const createMediaPost = async (text: string, imageUrl: string): Promise<any> => {
    if (!userAccessToken.value) {
      throw new Error('User not authenticated')
    }

    try {
      const result = await $fetch('/api/threads/post-media', {
        method: 'POST',
        body: {
          accessToken: userAccessToken.value,
          text,
          imageUrl
        }
      })
      return result
    } catch (error) {
      console.error('Error creating Threads media post:', error)
      throw error
    }
  }

  /**
   * Get Threads insights/metrics
   */
  const getInsights = async (): Promise<any> => {
    if (!userAccessToken.value) {
      throw new Error('User not authenticated')
    }

    try {
      const insights = await $fetch('/api/threads/insights', {
        method: 'POST',
        body: {
          accessToken: userAccessToken.value
        }
      })
      return insights
    } catch (error) {
      console.error('Error fetching Threads insights:', error)
      throw error
    }
  }

  return {
    isLoggedIn,
    userAccessToken,
    login,
    logout,
    getThreadsProfile,
    createPost,
    createMediaPost,
    getInsights
  }
}

