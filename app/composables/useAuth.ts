import { useAuthStore } from '~/stores/auth'
import type { LoginCredentials, RegisterData, User } from '../../types'

export const useAuth = () => {
  const authStore = useAuthStore()
  const router = useRouter()

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      const user = await authStore.login(credentials.email, credentials.password)
      await router.push('/buyer/dashboard')
      return user
    } catch (error) {
      // Let the UI handle error display, just re-throw
      throw error
    }
  }

  const register = async (data: RegisterData): Promise<User> => {
    try {
      const user = await authStore.register(data)
      await router.push('/buyer/dashboard')
      return user
    } catch (error) {
      // Let the UI handle error display, just re-throw
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    await authStore.logout()
    await router.push('/auth/login')
  }

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isAdmin: computed(() => authStore.isAdmin),
    isAgent: computed(() => authStore.isAgent),
    token: computed(() => authStore.token),
    login,
    register,
    logout
  }
}