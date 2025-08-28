export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

export const formatTime = (time: string | Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-CA').format(num)
}

export const formatSqft = (sqft: number): string => {
  return `${formatNumber(sqft)} sq ft`
}

export const formatBeds = (beds: number): string => {
  return beds === 1 ? '1 bed' : `${beds} beds`
}

export const formatBaths = (baths: number): string => {
  return baths === 1 ? '1 bath' : `${baths} baths`
}