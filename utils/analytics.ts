import type { PageView } from '~/types'

export const useAnalytics = () => {
  const trackPageView = (data: PageView) => {
    // Implement your analytics tracking logic here
    console.log('Page view tracked:', data)
  }

  return {
    trackPageView
  }
}