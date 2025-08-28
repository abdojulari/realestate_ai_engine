import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const blocks = await prisma.contentBlock.findMany({})
  const sectionsMap = new Map<string, { id: string, title: string, icon: string, items: number, hasUnpublished: boolean }>()

  // Always include default sections so the UI is not blank on first run
  const defaults: Array<{ id: string, title: string, icon: string }> = [
    { id: 'home', title: 'Home Page', icon: 'mdi-home' },
    { id: 'about', title: 'About Us', icon: 'mdi-information' },
    { id: 'testimonials', title: 'Testimonials', icon: 'mdi-account-voice' }
  ]
  for (const d of defaults) {
    sectionsMap.set(d.id, { id: d.id, title: d.title, icon: d.icon, items: 0, hasUnpublished: false })
  }

  for (const b of blocks) {
    const meta = ((): any => { try { return typeof b.metadata === 'string' ? JSON.parse(b.metadata) : b.metadata || {} } catch { return {} } })()
    const section = meta.section || 'general'
    const rec = sectionsMap.get(section) || { id: section, title: section.replace(/\b\w/g, c => c.toUpperCase()).replace('-', ' '), icon: section === 'home' ? 'mdi-home' : section === 'about' ? 'mdi-information' : 'mdi-file-document', items: 0, hasUnpublished: false }
    rec.items += 1
    rec.hasUnpublished = rec.hasUnpublished || !(meta.published ?? true)
    sectionsMap.set(section, rec)
  }

  return Array.from(sectionsMap.values())
})


