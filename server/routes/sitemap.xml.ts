import { defineEventHandler, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/properties', changefreq: 'daily', priority: '0.9' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/market-overview', changefreq: 'weekly', priority: '0.8' },
  { path: '/buying', changefreq: 'monthly', priority: '0.7' },
  { path: '/selling', changefreq: 'monthly', priority: '0.7' },
  { path: '/seller/homeestimate', changefreq: 'monthly', priority: '0.7' },
  { path: '/testimonials/submit', changefreq: 'monthly', priority: '0.5' },
  { path: '/faq', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/news', changefreq: 'daily', priority: '0.7' },
  { path: '/resources', changefreq: 'weekly', priority: '0.6' },
  { path: '/all-guides', changefreq: 'monthly', priority: '0.6' },
  { path: '/ai-search', changefreq: 'monthly', priority: '0.6' },
  { path: '/map-search', changefreq: 'daily', priority: '0.7' },
]

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toW3CDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function buildUrlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string): string {
  let entry = `  <url>\n    <loc>${escapeXml(loc)}</loc>`
  if (lastmod) entry += `\n    <lastmod>${lastmod}</lastmod>`
  if (changefreq) entry += `\n    <changefreq>${changefreq}</changefreq>`
  if (priority) entry += `\n    <priority>${priority}</priority>`
  entry += '\n  </url>'
  return entry
}

export default defineEventHandler(async (event) => {
  const host = event.node.req.headers.host || 'aohomes.deelbot.ai'
  const protocol = event.node.req.headers['x-forwarded-proto'] || 'https'
  const baseUrl = `${protocol}://${host}`

  const entries: string[] = []

  for (const route of STATIC_ROUTES) {
    entries.push(buildUrlEntry(`${baseUrl}${route.path}`, toW3CDate(new Date()), route.changefreq, route.priority))
  }

  try {
    const properties = await prisma.property.findMany({
      where: { status: { in: ['for_sale', 'active', 'sold', 'pending'] } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50000,
    })
    for (const p of properties) {
      entries.push(buildUrlEntry(
        `${baseUrl}/property/${p.id}`,
        toW3CDate(p.updatedAt),
        'weekly',
        '0.7'
      ))
    }
  } catch { /* DB unavailable — skip dynamic properties */ }

  try {
    const posts = await (prisma as any).blogPost.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 10000,
    })
    for (const post of posts) {
      entries.push(buildUrlEntry(
        `${baseUrl}/blog/${post.slug}`,
        toW3CDate(post.updatedAt),
        'weekly',
        '0.7'
      ))
    }
  } catch { /* skip */ }

  try {
    const categories = await (prisma as any).blogCategory.findMany({
      where: { isActive: true },
      select: { slug: true },
    })
    for (const cat of categories) {
      entries.push(buildUrlEntry(
        `${baseUrl}/blog/category/${cat.slug}`,
        toW3CDate(new Date()),
        'weekly',
        '0.5'
      ))
    }
  } catch { /* skip */ }

  try {
    const tags = await (prisma as any).blogTag.findMany({
      select: { slug: true },
    })
    for (const tag of tags) {
      entries.push(buildUrlEntry(
        `${baseUrl}/blog/tag/${tag.slug}`,
        toW3CDate(new Date()),
        'weekly',
        '0.5'
      ))
    }
  } catch { /* skip */ }

  try {
    const now = new Date()
    const flashNews = await (prisma as any).flashNews.findMany({
      where: {
        published: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } },
        ],
      },
      select: { slug: true, updatedAt: true },
    })
    for (const fn of flashNews) {
      entries.push(buildUrlEntry(
        `${baseUrl}/news/${fn.slug}`,
        toW3CDate(fn.updatedAt),
        'daily',
        '0.6'
      ))
    }
  } catch { /* skip */ }

  try {
    const neighborhoods = await prisma.neighborhood.findMany({
      select: { name: true, city: true },
    })
    for (const n of neighborhoods) {
      const slug = `${n.name}-${n.city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      entries.push(buildUrlEntry(
        `${baseUrl}/market-overview?neighborhood=${encodeURIComponent(n.name)}&city=${encodeURIComponent(n.city)}`,
        toW3CDate(new Date()),
        'weekly',
        '0.5'
      ))
    }
  } catch { /* skip */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=3600')
  return xml
})
