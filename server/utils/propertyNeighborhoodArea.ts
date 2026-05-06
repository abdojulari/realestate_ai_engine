import { Prisma } from '@prisma/client'
import { lookupCity } from './city-dictionary'
import { SHARED_MLS_SOURCES } from './tenant'

/**
 * Dropdown/API value for listings whose MLS row has no subdivision or cityRegion
 * (after CREA/Pillar9 resolution: subdivisionName → features.cityRegion → column cityRegion).
 * Must stay in sync across GET /api/properties/neighborhoods and subdivision= on GET /api/properties.
 */
export const NEIGHBORHOOD_AREA_UNSPECIFIED_LABEL = 'Other / area not specified' as const

function sqlPropertyAliasDot(alias: string): Prisma.Sql {
  return alias ? Prisma.raw(`${alias}.`) : Prisma.raw('')
}

/** Same resolved label as GET /api/properties/neighborhoods (GROUP BY expression). */
export function sqlResolvedNeighborhoodLabel(propertyAlias = ''): Prisma.Sql {
  const dot = sqlPropertyAliasDot(propertyAlias)
  return Prisma.sql`
    COALESCE(
      NULLIF(TRIM(${dot}features->>'subdivisionName'), ''),
      NULLIF(TRIM(${dot}features->>'cityRegion'), ''),
      NULLIF(TRIM(${dot}"cityRegion"), '')
    )
  `
}

/** True when the resolved label above is empty — bucket for {@link NEIGHBORHOOD_AREA_UNSPECIFIED_LABEL}. */
export function sqlNeighborhoodAreaIsBlank(propertyAlias = ''): Prisma.Sql {
  const dot = sqlPropertyAliasDot(propertyAlias)
  return Prisma.sql`
    TRIM(COALESCE(
      NULLIF(TRIM(${dot}features->>'subdivisionName'), ''),
      NULLIF(TRIM(${dot}features->>'cityRegion'), ''),
      NULLIF(TRIM(${dot}"cityRegion"), ''),
      ''
    )) = ''
  `
}

/**
 * City match for raw SQL — mirrors {@link buildCityWhereClause} / neighborhoods GET
 * (dictionary names, aliases, Pillar9 codes, else ILIKE input).
 */
export function sqlCityMatchesProperty(propertyAlias: string, cityInput: string): Prisma.Sql {
  const dot = sqlPropertyAliasDot(propertyAlias)
  const entry = lookupCity(cityInput.trim())
  if (!entry) {
    return Prisma.sql`${dot}city ILIKE ${cityInput}`
  }
  return Prisma.sql`(
    ${Prisma.join(
      [
        ...[entry.name, ...(entry.aliases ?? [])].map(n => Prisma.sql`${dot}city ILIKE ${n}`),
        ...(entry.codes.length > 0 ? [Prisma.sql`${dot}city = ANY(${entry.codes})`] : []),
      ],
      ' OR ',
    )}
  )`
}

/** Mirrors {@link getPublicSharedMlsWhere} for raw SQL on Property. */
export function sqlPublicSharedMlsSources(propertyAlias: string, adminId: number | undefined): Prisma.Sql {
  const dot = sqlPropertyAliasDot(propertyAlias)
  const sharedList = Prisma.join([...SHARED_MLS_SOURCES].map(s => Prisma.sql`${s}`))
  if (adminId != null) {
    return Prisma.sql`((${dot}source IN (${sharedList})) OR (${dot}source = ${'manual'} AND ${dot}"adminId" = ${adminId}))`
  }
  return Prisma.sql`${dot}source IN (${sharedList})`
}
