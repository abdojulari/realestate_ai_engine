import { parseStringPromise } from 'xml2js'

interface RSSItem {
  title: string[]
  description: string[]
  link: string[]
  pubDate: string[]
  guid?: Array<{ _: string } | string>
  category?: string[]
  'dc:creator'?: string[]
  'content:encoded'?: string[]
  enclosure?: Array<{ $: { url: string; type: string } }>
}

interface RSSChannel {
  title: string[]
  description: string[]
  link: string[]
  item: RSSItem[]
}

interface RSSFeed {
  rss: {
    channel: RSSChannel[]
  }
}

interface NewsArticle {
  title: string
  description: string
  link: string
  pubDate: string
  guid?: string
  category?: string
  author?: string
  image?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { url } = body

    if (!url) {
      throw createError({
        statusCode: 400,
        statusMessage: 'RSS feed URL is required'
      })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL format'
      })
    }

    // Fetch RSS feed with timeout and error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Real Estate News Aggregator/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        }
      })
      clearTimeout(timeoutId)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      console.error('Fetch error:', fetchError)
      
      if (fetchError.name === 'AbortError') {
        throw createError({
          statusCode: 408,
          statusMessage: 'Request timeout - RSS feed took too long to respond'
        })
      }
      
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to fetch RSS feed'
      })
    }

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `RSS feed returned ${response.status}: ${response.statusText}`
      })
    }

    const xmlText = await response.text()
    
    if (!xmlText || xmlText.trim().length === 0) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Empty RSS feed received'
      })
    }

    // Parse XML to JSON
    let parsedXml: RSSFeed
    try {
      parsedXml = await parseStringPromise(xmlText, {
        explicitArray: true,
        ignoreAttrs: false,
        trim: true
      })
    } catch (parseError) {
      console.error('XML parsing error:', parseError)
      throw createError({
        statusCode: 502,
        statusMessage: 'Invalid RSS feed format'
      })
    }

    // Validate RSS structure
    if (!parsedXml?.rss?.channel?.[0]?.item) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Invalid RSS feed structure - no items found'
      })
    }

    const items = parsedXml.rss.channel[0].item

    // Transform RSS items to our NewsArticle format
    const articles: NewsArticle[] = items.map((item: RSSItem) => {
      // Extract image from various possible sources
      let image: string | undefined
      
      // Try enclosure first (common for images)
      if (item.enclosure && item.enclosure[0]?.$.url) {
        const enclosureUrl = item.enclosure[0].$.url
        if (item.enclosure[0].$.type?.startsWith('image/')) {
          image = enclosureUrl
        }
      }
      
      // Try to extract image from description/content
      if (!image && item.description?.[0]) {
        const imgMatch = item.description[0].match(/<img[^>]+src="([^"]+)"/i)
        if (imgMatch) {
          image = imgMatch[1]
        }
      }
      
      // Try content:encoded
      if (!image && item['content:encoded']?.[0]) {
        const imgMatch = item['content:encoded'][0].match(/<img[^>]+src="([^"]+)"/i)
        if (imgMatch) {
          image = imgMatch[1]
        }
      }

      // Extract GUID
      let guid: string | undefined
      if (item.guid) {
        if (Array.isArray(item.guid) && item.guid[0]) {
          if (typeof item.guid[0] === 'string') {
            guid = item.guid[0]
          } else if (item.guid[0]._ && typeof item.guid[0]._ === 'string') {
            guid = item.guid[0]._
          }
        }
      }

      return {
        title: item.title?.[0] || 'Untitled',
        description: item.description?.[0] || item['content:encoded']?.[0] || '',
        link: item.link?.[0] || '',
        pubDate: item.pubDate?.[0] || new Date().toISOString(),
        guid,
        category: item.category?.[0],
        author: item['dc:creator']?.[0],
        image
      }
    }).filter(article => article.title && article.link) // Filter out invalid articles

    // Sort by publication date (newest first)
    articles.sort((a, b) => {
      try {
        const dateA = new Date(a.pubDate).getTime()
        const dateB = new Date(b.pubDate).getTime()
        return dateB - dateA
      } catch {
        return 0
      }
    })

    // Limit to 20 articles to avoid overwhelming the UI
    const limitedArticles = articles.slice(0, 20)

    return limitedArticles

  } catch (error: any) {
    console.error('RSS Feed API Error:', error)
    
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }
    
    // Generic error handling
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error while processing RSS feed'
    })
  }
})
