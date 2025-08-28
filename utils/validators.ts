export const required = (v: any) => !!v || 'This field is required'

export const email = (v: string) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return !v || pattern.test(v) || 'Please enter a valid email address'
}

export const phone = (v: string) => {
  const pattern = /^\+?[\d\s-]{10,}$/
  return !v || pattern.test(v) || 'Please enter a valid phone number'
}

export const password = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 8 || 'Password must be at least 8 characters',
  (v: string) => /[A-Z]/.test(v) || 'Password must contain at least one uppercase letter',
  (v: string) => /[a-z]/.test(v) || 'Password must contain at least one lowercase letter',
  (v: string) => /[0-9]/.test(v) || 'Password must contain at least one number'
]

export const confirmPassword = (password: string) => 
  (v: string) => v === password || 'Passwords must match'

export const minLength = (length: number) => 
  (v: string) => !v || v.length >= length || `Must be at least ${length} characters`

export const maxLength = (length: number) => 
  (v: string) => !v || v.length <= length || `Must be no more than ${length} characters`

export const numeric = (v: string) => 
  !v || /^\d+$/.test(v) || 'Must be a number'

export const decimal = (v: string) => 
  !v || /^\d*\.?\d*$/.test(v) || 'Must be a decimal number'

export const url = (v: string) => {
  try {
    new URL(v)
    return true
  } catch {
    return 'Please enter a valid URL'
  }
}

export const postalCode = (v: string) => {
  const pattern = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/
  return !v || pattern.test(v) || 'Please enter a valid postal code'
}

export const fileSize = (maxSize: number) => 
  (file: File) => !file || file.size <= maxSize || `File size must be less than ${maxSize / 1024 / 1024}MB`

export const fileType = (types: string[]) => 
  (file: File) => !file || types.includes(file.type) || `File type must be: ${types.join(', ')}`

export const imageFile = (file: File) => 
  !file || file.type.startsWith('image/') || 'File must be an image'

export const minValue = (min: number) => 
  (v: number) => !v || v >= min || `Must be at least ${min}`

export const maxValue = (max: number) => 
  (v: number) => !v || v <= max || `Must be no more than ${max}`

export const between = (min: number, max: number) => 
  (v: number) => !v || (v >= min && v <= max) || `Must be between ${min} and ${max}`
