export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
  phone?: string
  preferredContactTime?: string
  provider?: string
  providerId?: string
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  preferredContactTime?: string
}

export interface AuthResponse {
  user: User
  token: string
}
