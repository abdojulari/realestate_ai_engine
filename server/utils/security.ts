import { PrismaClient } from '@prisma/client'
import { getClientIP } from 'h3'

const prisma = new PrismaClient()

interface SecuritySettings {
  sessionTimeout: number // in minutes
  passwordPolicy: string
  twoFactorAuth: boolean
  ipWhitelisting: boolean
  whitelistedIps: string[]
}

// Cache for security settings
let cachedSecuritySettings: SecuritySettings | null = null
let securityCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const now = Date.now()
  
  // Return cached settings if still valid
  if (cachedSecuritySettings && (now - securityCacheTime) < CACHE_DURATION) {
    return cachedSecuritySettings
  }

  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'security.'
        }
      }
    })

    const settingsMap = settings.reduce((acc, setting) => {
      const key = setting.key.replace('security.', '')
      if (setting.value === 'true' || setting.value === 'false') {
        acc[key] = setting.value === 'true'
      } else {
        acc[key] = setting.value
      }
      return acc
    }, {} as Record<string, any>)

    const securitySettings: SecuritySettings = {
      sessionTimeout: parseInt(settingsMap.sessionTimeout) || 30,
      passwordPolicy: settingsMap.passwordPolicy || 'medium',
      twoFactorAuth: settingsMap.twoFactorAuth || false,
      ipWhitelisting: settingsMap.ipWhitelisting || false,
      whitelistedIps: settingsMap.whitelistedIps ? 
        settingsMap.whitelistedIps.split('\n').map((ip: string) => ip.trim()).filter(Boolean) : []
    }

    // Cache the settings
    cachedSecuritySettings = securitySettings
    securityCacheTime = now

    return securitySettings
  } catch (error) {
    console.error('Failed to load security settings:', error)
    
    // Return default settings
    return {
      sessionTimeout: 30,
      passwordPolicy: 'medium',
      twoFactorAuth: false,
      ipWhitelisting: false,
      whitelistedIps: []
    }
  }
}

export async function checkIPWhitelist(event: any): Promise<boolean> {
  try {
    const securitySettings = await getSecuritySettings()
    
    if (!securitySettings.ipWhitelisting) {
      return true // IP whitelisting is disabled
    }

    const clientIP = getClientIP(event)
    if (!clientIP) {
      console.warn('Could not determine client IP address')
      return false
    }

    // Check if IP is in whitelist
    const isWhitelisted = securitySettings.whitelistedIps.some(whitelistedIP => {
      // Support CIDR notation and exact matches
      if (whitelistedIP.includes('/')) {
        // TODO: Implement CIDR matching if needed
        return false
      }
      return clientIP === whitelistedIP
    })

    if (!isWhitelisted) {
      console.warn(`Access denied for IP: ${clientIP}`)
    }

    return isWhitelisted
  } catch (error) {
    console.error('Error checking IP whitelist:', error)
    return false
  }
}

export function validatePasswordPolicy(password: string, policy: string = 'medium'): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  switch (policy) {
    case 'basic':
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters long')
      }
      break

    case 'medium':
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long')
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number')
      }
      break

    case 'strong':
      if (password.length < 12) {
        errors.push('Password must be at least 12 characters long')
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number')
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function getSessionTimeout(): number {
  // Return session timeout in milliseconds
  return cachedSecuritySettings?.sessionTimeout ? 
    cachedSecuritySettings.sessionTimeout * 60 * 1000 : 
    30 * 60 * 1000 // Default 30 minutes
}

// Clear security settings cache
export function clearSecuritySettingsCache() {
  cachedSecuritySettings = null
  securityCacheTime = 0
}
