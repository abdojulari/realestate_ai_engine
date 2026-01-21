/**
 * Utility functions for filtering properties
 */

export interface PropertyFilterType {
  id: string | number
  type?: string
  [key: string]: any
}

/**
 * Filter properties to show only residential properties that people can live in
 * Excludes commercial and industrial properties
 */
export function filterResidentialProperties<T extends PropertyFilterType>(properties: T[]): T[] {
  const residentialTypes = ['house', 'condo', 'townhouse', 'multi-family', 'land', 'other']
  const commercialTypes = [
    'commercial', 'industrial', 'office', 'retail', 'business', 'warehouse', 'manufacturing',
    'store', 'shop', 'plaza', 'mall', 'medical', 'professional', 'mixed-use', 'mixed use'
  ]
  
  return properties.filter(property => {
    const propertyType = property.type?.toLowerCase() || 'house'
    
    // Explicitly exclude commercial/industrial types
    if (commercialTypes.includes(propertyType)) {
      console.log(`🚫 Filtering out commercial property: ${(property as any).id} (type: ${propertyType})`)
      return false
    }
    
    // Enhanced commercial detection - check for properties with 0 bedrooms and commercial indicators
    const beds = (property as any).beds || 0
    const title = (property as any).title?.toLowerCase() || ''
    const description = (property as any).description?.toLowerCase() || ''
    const address = (property as any).address?.toLowerCase() || ''
    
    // Properties with 0 bedrooms are likely commercial unless they're explicitly land
    if (beds === 0 && propertyType !== 'land') {
      const commercialIndicators = [
        'office', 'commercial', 'retail', 'industrial', 'warehouse', 'business',
        'medical', 'professional', 'plaza', 'mall', 'store', 'shop'
      ]
      
      const hasCommercialIndicator = commercialIndicators.some(indicator => 
        title.includes(indicator) || description.includes(indicator) || address.includes(indicator)
      )
      
      if (hasCommercialIndicator) {
        console.log(`🚫 Filtering out 0-bedroom commercial property: ${(property as any).id}`)
        return false
      }
    }
    
    // Additional check: look for commercial keywords in title/description for extra safety
    const commercialKeywords = [
      'office building', 'commercial building', 'retail space', 'business center', 
      'medical building', 'professional building', 'industrial building',
      'warehouse space', 'commercial unit', 'office space'
    ]
    
    if (commercialKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      console.log(`🚫 Filtering out property with commercial keywords: ${(property as any).id}`)
      return false
    }
    
    // Include only residential types
    return residentialTypes.includes(propertyType)
  })
}

/**
 * Check if a single property is residential
 */
export function isResidentialProperty(property: PropertyFilterType): boolean {
  const residentialTypes = ['house', 'condo', 'townhouse', 'multi-family', 'land', 'other']
  const commercialTypes = [
    'commercial', 'industrial', 'office', 'retail', 'business', 'warehouse', 'manufacturing',
    'store', 'shop', 'plaza', 'mall', 'medical', 'professional', 'mixed-use', 'mixed use'
  ]
  const propertyType = property.type?.toLowerCase() || 'house'
  
  // Explicitly exclude commercial/industrial types
  if (commercialTypes.includes(propertyType)) {
    return false
  }
  
  // Additional check: look for commercial keywords in title/description for extra safety
  const title = (property as any).title?.toLowerCase() || ''
  const description = (property as any).description?.toLowerCase() || ''
  const commercialKeywords = ['office building', 'commercial building', 'retail space', 'business center', 'medical building', 'professional building']
  
  if (commercialKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
    return false
  }
  
  // Include only residential types
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
