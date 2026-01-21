/**
 * Composable for AI-powered content generation using Google Gemini (Free Tier)
 * Generate real estate tips, property descriptions, and social media posts
 */

export const useAIContent = () => {
  const config = useRuntimeConfig()

  /**
   * Generate a real estate tip for social media
   * @param category - Category of tip (buying, selling, investing, market-trends, home-maintenance)
   * @returns Generated tip text (under 150 characters)
   */
  const generateRealEstateTip = async (category: string): Promise<string> => {
    try {
      const response = await $fetch('/api/ai/generate-tip', {
        method: 'POST',
        body: { category }
      })
      return response.tip
    } catch (error) {
      console.error('Error generating tip:', error)
      throw error
    }
  }

  /**
   * Generate a property description
   * @param propertyDetails - Object containing property details
   * @returns Generated property description
   */
  const generatePropertyDescription = async (propertyDetails: any): Promise<string> => {
    try {
      const response = await $fetch('/api/ai/generate-description', {
        method: 'POST',
        body: { propertyDetails }
      })
      return response.description
    } catch (error) {
      console.error('Error generating description:', error)
      throw error
    }
  }

  /**
   * Generate social media post with hashtags
   * @param topic - Topic for the post
   * @param platform - Social platform (facebook, threads, instagram)
   * @returns Generated post with hashtags
   */
  const generateSocialPost = async (
    topic: string,
    platform: 'facebook' | 'threads' | 'instagram' = 'facebook'
  ): Promise<{ text: string; hashtags: string[] }> => {
    try {
      const response = await $fetch('/api/ai/generate-post', {
        method: 'POST',
        body: { topic, platform }
      })
      return response
    } catch (error) {
      console.error('Error generating social post:', error)
      throw error
    }
  }

  /**
   * Generate market insight based on data
   * @param marketData - Object containing market statistics
   * @returns Generated market insight
   */
  const generateMarketInsight = async (marketData: any): Promise<string> => {
    try {
      const response = await $fetch('/api/ai/generate-insight', {
        method: 'POST',
        body: { marketData }
      })
      return response.insight
    } catch (error) {
      console.error('Error generating insight:', error)
      throw error
    }
  }

  return {
    generateRealEstateTip,
    generatePropertyDescription,
    generateSocialPost,
    generateMarketInsight
  }
}

