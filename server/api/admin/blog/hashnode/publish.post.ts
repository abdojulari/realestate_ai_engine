import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../../utils/tenant'
import { getTenantSiteUrlForEvent } from '../../../../utils/tenantSiteUrl'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Publish Post to Hashnode
 * POST /api/admin/blog/hashnode/publish
 * 
 * Creates or updates a post on Hashnode using their GraphQL API
 * Requires HASHNODE_API_KEY in environment
 * Tenant-scoped: verifies ownership of the post before publishing
 */

const HASHNODE_API_URL = process.env.HASHNODE_API_URL || 'https://gql.hashnode.com'
const HASHNODE_API_KEY = process.env.HASHNODE_API_KEY

interface HashnodePublicationInput {
  title: string
  contentMarkdown: string
  slug?: string
  coverImageURL?: string
  tags?: { slug: string; name: string }[]
  subtitle?: string
  publicationId: string
}

async function getMyPublication(): Promise<string | null> {
  if (!HASHNODE_API_KEY) return null
  
  const query = `
    query Me {
      me {
        publications(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  `
  
  try {
    const response = await fetch(HASHNODE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': HASHNODE_API_KEY
      },
      body: JSON.stringify({ query })
    })
    
    const data = await response.json()
    if (!response.ok) {
      const message = data?.errors?.[0]?.message || data?.message || 'Hashnode API error'
      console.error('[Hashnode] Publication lookup failed:', response.status, message, data?.errors || data)
      return null
    }
    return data?.data?.me?.publications?.edges?.[0]?.node?.id || null
  } catch (error) {
    console.error('[Hashnode] Error fetching publication:', error)
    return null
  }
}

async function createHashnodePost(input: HashnodePublicationInput): Promise<{ id: string; url: string } | null> {
  if (!HASHNODE_API_KEY) return null
  
  const mutation = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          id
          url
          slug
        }
      }
    }
  `
  
  try {
    const response = await fetch(HASHNODE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': HASHNODE_API_KEY
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            title: input.title,
            contentMarkdown: input.contentMarkdown,
            slug: input.slug,
            coverImageOptions: input.coverImageURL ? {
              coverImageURL: input.coverImageURL
            } : undefined,
            tags: input.tags?.map(t => ({ slug: t.slug, name: t.name })),
            subtitle: input.subtitle,
            publicationId: input.publicationId
          }
        }
      })
    })
    
    const data = await response.json()

    if (!response.ok || data.errors) {
      const message = data?.errors?.[0]?.message || data?.message || 'Hashnode API error'
      console.error('[Hashnode] API errors:', response.status, message, data?.errors || data)
      throw createError({
        statusCode: 502,
        statusMessage: `Hashnode API error: ${message}`
      })
    }
    
    const post = data?.data?.publishPost?.post
    return post ? { id: post.id, url: post.url } : null
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }
    console.error('[Hashnode] Error publishing post:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Hashnode API error while publishing'
    })
  }
}

async function updateHashnodePost(postId: string, input: Partial<HashnodePublicationInput>): Promise<boolean> {
  if (!HASHNODE_API_KEY) return false
  
  const mutation = `
    mutation UpdatePost($input: UpdatePostInput!) {
      updatePost(input: $input) {
        post {
          id
          url
        }
      }
    }
  `
  
  try {
    const response = await fetch(HASHNODE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': HASHNODE_API_KEY
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            id: postId,
            title: input.title,
            contentMarkdown: input.contentMarkdown,
            slug: input.slug,
            coverImageOptions: input.coverImageURL ? {
              coverImageURL: input.coverImageURL
            } : undefined,
            subtitle: input.subtitle
          }
        }
      })
    })
    
    const data = await response.json()

    if (!response.ok || data.errors) {
      const message = data?.errors?.[0]?.message || data?.message || 'Hashnode API error'
      console.error('[Hashnode] API errors:', response.status, message, data?.errors || data)
      throw createError({
        statusCode: 502,
        statusMessage: `Hashnode API error: ${message}`
      })
    }
    return true
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }
    console.error('[Hashnode] Error updating post:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Hashnode API error while updating'
    })
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  
  if (!HASHNODE_API_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Hashnode API key not configured'
    })
  }
  
  const body = await readBody(event)
  const { postId } = body
  
  if (!postId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Post ID is required'
    })
  }
  
  try {
    // Fetch the post with tenant scoping
    const post = await prisma.blogPost.findFirst({
      where: { id: postId, ...tenantFilter },
      include: {
        category: true
      }
    })
    
    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Post not found'
      })
    }
    
    // Verify tenant access
    requireTenantAccess(user, post.adminId)

    // Resolve canonical URL for THIS tenant — used to make blog cover-image
    // paths absolute when Hashnode imports them. Prefer the live request host
    // (admin is on their own subdomain) and fall back to the tenant's
    // configured customDomain / subdomain.
    const siteUrl = await getTenantSiteUrlForEvent(event, post.adminId)
    
    // Get publication ID
    const publicationId = await getMyPublication()
    
    if (!publicationId) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Could not find Hashnode publication'
      })
    }
    
    // Prepare content (convert HTML to Markdown if needed)
    const contentMarkdown = post.content

    const coverImageCandidate = post.coverImage
      ? (post.coverImage.startsWith('http')
          ? post.coverImage
          : `${siteUrl}${post.coverImage.startsWith('/') ? '' : '/'}${post.coverImage}`)
      : undefined
    const coverImageUrl = (() => {
      if (!coverImageCandidate) return undefined
      try {
        const parsed = new URL(coverImageCandidate)
        if (!['http:', 'https:'].includes(parsed.protocol)) return undefined
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return undefined
        if (parsed.protocol !== 'https:') return undefined
        return coverImageCandidate
      } catch {
        return undefined
      }
    })()
    
    // Prepare tags
    const tags = ((post.tags as string[]) || []).map(tag => ({
      slug: tag.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: tag
    }))
    
    let result: { id: string; url: string } | null = null
    
    if (post.hashnodeId) {
      // Update existing post
      const success = await updateHashnodePost(post.hashnodeId, {
        title: post.title,
        contentMarkdown,
        slug: post.slug,
        coverImageURL: coverImageUrl,
        subtitle: post.excerpt || undefined,
        publicationId
      })
      
      if (success) {
        result = { id: post.hashnodeId, url: post.hashnodeUrl || '' }
      }
    } else {
      // Create new post
      result = await createHashnodePost({
        title: post.title,
        contentMarkdown,
        slug: post.slug,
        coverImageURL: coverImageUrl,
        tags,
        subtitle: post.excerpt || undefined,
        publicationId
      })
    }
    
    if (!result) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to publish to Hashnode'
      })
    }
    
    // Update local post with Hashnode info
    await prisma.blogPost.update({
      where: { id: postId },
      data: {
        hashnodeId: result.id,
        hashnodeUrl: result.url,
        lastSyncedAt: new Date(),
        syncToHashnode: true
      }
    })
    
    return {
      success: true,
      hashnodeId: result.id,
      hashnodeUrl: result.url,
      message: post.hashnodeId ? 'Post updated on Hashnode' : 'Post published to Hashnode'
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('[Hashnode] Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to publish to Hashnode'
    })
  }
})
