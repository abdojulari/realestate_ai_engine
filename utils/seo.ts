interface MetaInfo {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: string
  author?: string
  twitterCard?: string
  twitterSite?: string
  twitterCreator?: string
}

export const generateMetaInfo = (info: MetaInfo) => {
  const siteName = 'Real Estate Portal'
  const defaultDescription = 'Find your dream home with our real estate portal'
  const defaultImage = '/images/default-social.jpg'
  const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://example.com'

  const meta = []

  // Basic meta tags
  if (info.title) {
    meta.push(
      { name: 'title', content: `${info.title} | ${siteName}` },
      { property: 'og:title', content: `${info.title} | ${siteName}` }
    )
  }

  if (info.description) {
    meta.push(
      { name: 'description', content: info.description },
      { property: 'og:description', content: info.description }
    )
  } else {
    meta.push(
      { name: 'description', content: defaultDescription },
      { property: 'og:description', content: defaultDescription }
    )
  }

  if (info.keywords?.length) {
    meta.push({ name: 'keywords', content: info.keywords.join(', ') })
  }

  // OpenGraph meta tags
  meta.push(
    { property: 'og:type', content: info.type || 'website' },
    { property: 'og:site_name', content: siteName },
    { property: 'og:url', content: info.url || baseUrl },
    { property: 'og:image', content: info.image || `${baseUrl}${defaultImage}` }
  )

  // Twitter meta tags
  meta.push(
    { name: 'twitter:card', content: info.twitterCard || 'summary_large_image' },
    { name: 'twitter:site', content: info.twitterSite || '@yoursitename' },
    { name: 'twitter:title', content: `${info.title} | ${siteName}` },
    { name: 'twitter:description', content: info.description || defaultDescription },
    { name: 'twitter:image', content: info.image || `${baseUrl}${defaultImage}` }
  )

  if (info.twitterCreator) {
    meta.push({ name: 'twitter:creator', content: info.twitterCreator })
  }

  // Article specific meta tags
  if (info.type === 'article' && info.author) {
    meta.push(
      { property: 'article:author', content: info.author },
      { property: 'article:publisher', content: baseUrl }
    )
  }

  return meta
}

export const generatePropertyMeta = (property: any) => {
  return generateMetaInfo({
    title: property.title,
    description: property.description,
    keywords: [
      'real estate',
      property.type,
      property.city,
      `${property.beds} bedroom`,
      `${property.baths} bathroom`,
      ...property.features
    ],
    image: property.images[0],
    type: 'product',
    url: `/property/${property.id}`
  })
}

export const generateBlogMeta = (post: any) => {
  return generateMetaInfo({
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    image: post.image,
    type: 'article',
    author: post.author,
    url: `/blog/${post.slug}`
  })
}

export const generateSearchMeta = (filters: any) => {
  const parts = []
  if (filters.city) parts.push(filters.city)
  if (filters.type) parts.push(filters.type)
  if (filters.beds) parts.push(`${filters.beds}+ beds`)
  if (filters.minPrice) parts.push(`from $${filters.minPrice.toLocaleString()}`)

  const title = parts.length ? parts.join(' - ') : 'Property Search'
  const description = parts.length
    ? `Browse ${parts.join(', ')} properties for sale`
    : 'Search properties for sale in your area'

  return generateMetaInfo({
    title,
    description,
    type: 'website',
    url: '/properties'
  })
}
