import { delegateFeatureAllowsRead } from '~/utils/delegatedAdminClient'

/**
 * Use with definePageMeta({ delegateFeature: 'crm' }) so delegated assistants without that feature cannot open the route.
 */
export default defineNuxtRouteMiddleware((to) => {
  const key = to.meta.delegateFeature as string | undefined
  if (!key) return

  const auth = useAuthStore()
  if (!auth.user) return

  if (auth.user.role === 'admin' || auth.user.role === 'super_admin') return

  if (!delegateFeatureAllowsRead(auth.user as any, key)) {
    return navigateTo('/admin')
  }
})
