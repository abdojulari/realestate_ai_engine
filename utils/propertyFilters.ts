/**
 * Utility functions for filtering properties
 */

export interface Property {
  id: string | number
  type?: string
  [key: string]: any
}

/**
 * Filter properties to show only residential properties that people can live in
 * Excludes commercial and industrial properties
 */
export function filterResidentialProperties<T extends Property>(properties: T[]): T[] {
  const residentialTypes = ['house', 'condo', 'townhouse', 'multi-family', 'land', 'other']
  
  return properties.filter(property => {
    const propertyType = property.type?.toLowerCase() || 'house'
    return residentialTypes.includes(propertyType)
  })
}

/**
 * Check if a single property is residential
 */
export function isResidentialProperty(property: Property): boolean {
  const residentialTypes = ['house', 'condo', 'townhouse', 'multi-family', 'land', 'other']
  const propertyType = property.type?.toLowerCase() || 'house'
  return residentialTypes.includes(propertyType)
}

/**
 * Get residential property types for dropdowns
 */
export function getResidentialPropertyTypes() {
  return [
    { title: 'Any Residential', value: null },
    { title: 'House', value: 'house' },
    { title: 'Condo', value: 'condo' },
    { title: 'Townhouse', value: 'townhouse' },
    { title: 'Multi-Family', value: 'multi-family' },
    { title: 'Vacant Land', value: 'land' },
    { title: 'Other Residential', value: 'other' }
  ]
}
