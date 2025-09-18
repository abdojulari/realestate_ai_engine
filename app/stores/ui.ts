import { defineStore } from 'pinia'

export interface UIState {
  // Navigation & Layout
  isMobileMenuOpen: boolean
  sidebarCollapsed: boolean
  currentPage: string
  breadcrumbs: Array<{
    title: string
    to?: string
    disabled?: boolean
  }>
  
  // Modal & Dialog States
  modals: {
    contactAgent: boolean
    scheduleViewing: boolean
    saveSearch: boolean
    propertyComparison: boolean
    filterDialog: boolean
    shareProperty: boolean
    reportProperty: boolean
    loginRequired: boolean
  }
  
  // Toast/Alert Messages
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    timeout?: number
    persistent?: boolean
    actions?: Array<{
      label: string
      action: string
    }>
  }>
  
  // View Preferences
  viewPreferences: {
    propertyListView: 'grid' | 'list' | 'map'
    mapStyle: 'roadmap' | 'satellite' | 'hybrid'
    resultsPerPage: 12 | 24 | 48
    currency: 'CAD' | 'USD'
    units: 'metric' | 'imperial'
    theme: 'light' | 'dark' | 'auto'
  }
  
  // Search UI State
  searchUI: {
    showAdvancedFilters: boolean
    quickFiltersVisible: boolean
    sortMenuOpen: boolean
    mapLayersOpen: boolean
  }
  
  // Loading States (global)
  globalLoading: boolean
  loadingMessage?: string
  
  // Page-specific loading states
  pageLoading: {
    [key: string]: boolean
  }
  
  // User Interaction State
  interaction: {
    lastActivity: Date
    sessionDuration: number
    pageViews: number
    searchCount: number
  }
  
  // Device & Browser Info
  device: {
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
    touchEnabled: boolean
    screenWidth?: number
    screenHeight?: number
  }
  
  // Feature Flags
  features: {
    aiSearch: boolean
    virtualTours: boolean
    mortgageCalculator: boolean
    propertyAlerts: boolean
    chatSupport: boolean
    mapClusters: boolean
  }
}

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    isMobileMenuOpen: false,
    sidebarCollapsed: false,
    currentPage: '',
    breadcrumbs: [],
    
    modals: {
      contactAgent: false,
      scheduleViewing: false,
      saveSearch: false,
      propertyComparison: false,
      filterDialog: false,
      shareProperty: false,
      reportProperty: false,
      loginRequired: false
    },
    
    notifications: [],
    
    viewPreferences: {
      propertyListView: 'grid',
      mapStyle: 'roadmap',
      resultsPerPage: 12,
      currency: 'CAD',
      units: 'metric',
      theme: 'light'
    },
    
    searchUI: {
      showAdvancedFilters: false,
      quickFiltersVisible: true,
      sortMenuOpen: false,
      mapLayersOpen: false
    },
    
    globalLoading: false,
    loadingMessage: undefined,
    pageLoading: {},
    
    interaction: {
      lastActivity: new Date(),
      sessionDuration: 0,
      pageViews: 0,
      searchCount: 0
    },
    
    device: {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      touchEnabled: false
    },
    
    features: {
      aiSearch: true,
      virtualTours: true,
      mortgageCalculator: true,
      propertyAlerts: true,
      chatSupport: false,
      mapClusters: true
    }
  }),

  getters: {
    // Check if any modal is open
    isAnyModalOpen: (state) => {
      return Object.values(state.modals).some(isOpen => isOpen)
    },

    // Get current notification count
    notificationCount: (state) => {
      return state.notifications.length
    },

    // Get unread notifications
    unreadNotifications: (state) => {
      return state.notifications.filter(n => !n.persistent)
    },

    // Check if page is loading
    isPageLoading: (state) => {
      return (page: string) => state.pageLoading[page] || false
    },

    // Get responsive breakpoint
    breakpoint: (state) => {
      if (state.device.isMobile) return 'mobile'
      if (state.device.isTablet) return 'tablet'
      return 'desktop'
    },

    // Format session duration
    formattedSessionDuration: (state) => {
      const minutes = Math.floor(state.interaction.sessionDuration / 60)
      const seconds = state.interaction.sessionDuration % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    },

    // Check if feature is enabled
    isFeatureEnabled: (state) => {
      return (feature: keyof UIState['features']) => {
        return state.features[feature]
      }
    }
  },

  actions: {
    // Navigation & Layout
    toggleMobileMenu() {
      this.isMobileMenuOpen = !this.isMobileMenuOpen
    },

    closeMobileMenu() {
      this.isMobileMenuOpen = false
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    setCurrentPage(page: string) {
      this.currentPage = page
      this.interaction.pageViews++
      this.updateLastActivity()
    },

    setBreadcrumbs(breadcrumbs: UIState['breadcrumbs']) {
      this.breadcrumbs = breadcrumbs
    },

    // Modal Management
    openModal(modal: keyof UIState['modals']) {
      this.modals[modal] = true
    },

    closeModal(modal: keyof UIState['modals']) {
      this.modals[modal] = false
    },

    closeAllModals() {
      Object.keys(this.modals).forEach(key => {
        this.modals[key as keyof UIState['modals']] = false
      })
    },

    // Notification Management
    showNotification(notification: Omit<UIState['notifications'][0], 'id'>) {
      const id = Date.now().toString()
      const newNotification = {
        id,
        timeout: 5000,
        ...notification
      }
      
      this.notifications.push(newNotification)
      
      // Auto-remove after timeout
      if (!newNotification.persistent && newNotification.timeout) {
        setTimeout(() => {
          this.removeNotification(id)
        }, newNotification.timeout)
      }
      
      return id
    },

    removeNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index > -1) {
        this.notifications.splice(index, 1)
      }
    },

    clearAllNotifications() {
      this.notifications = []
    },

    // Quick notification helpers
    showSuccess(title: string, message?: string) {
      return this.showNotification({ type: 'success', title, message })
    },

    showError(title: string, message?: string) {
      return this.showNotification({ type: 'error', title, message, persistent: true })
    },

    showWarning(title: string, message?: string) {
      return this.showNotification({ type: 'warning', title, message })
    },

    showInfo(title: string, message?: string) {
      return this.showNotification({ type: 'info', title, message })
    },

    // View Preferences
    updateViewPreferences(preferences: Partial<UIState['viewPreferences']>) {
      this.viewPreferences = { ...this.viewPreferences, ...preferences }
    },

    setPropertyListView(view: UIState['viewPreferences']['propertyListView']) {
      this.viewPreferences.propertyListView = view
    },

    // Search UI
    toggleAdvancedFilters() {
      this.searchUI.showAdvancedFilters = !this.searchUI.showAdvancedFilters
    },

    toggleQuickFilters() {
      this.searchUI.quickFiltersVisible = !this.searchUI.quickFiltersVisible
    },

    // Loading States
    setGlobalLoading(loading: boolean, message?: string) {
      this.globalLoading = loading
      this.loadingMessage = loading ? message : undefined
    },

    setPageLoading(page: string, loading: boolean) {
      this.pageLoading[page] = loading
    },

    // User Interaction Tracking
    updateLastActivity() {
      this.interaction.lastActivity = new Date()
    },

    incrementSearchCount() {
      this.interaction.searchCount++
      this.updateLastActivity()
    },

    updateSessionDuration(seconds: number) {
      this.interaction.sessionDuration = seconds
    },

    // Device Detection
    setDeviceInfo(device: Partial<UIState['device']>) {
      this.device = { ...this.device, ...device }
    },

    detectDevice() {
      if (process.client) {
        const width = window.innerWidth
        const height = window.innerHeight
        const touchEnabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0
        
        this.setDeviceInfo({
          screenWidth: width,
          screenHeight: height,
          touchEnabled,
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024
        })
      }
    },

    // Feature Flags
    toggleFeature(feature: keyof UIState['features']) {
      this.features[feature] = !this.features[feature]
    },

    setFeature(feature: keyof UIState['features'], enabled: boolean) {
      this.features[feature] = enabled
    },

    // Utility Actions
    resetUI() {
      this.closeAllModals()
      this.clearAllNotifications()
      this.isMobileMenuOpen = false
      this.searchUI.showAdvancedFilters = false
      this.globalLoading = false
    },

    // Initialize UI store
    initialize() {
      this.detectDevice()
      this.updateLastActivity()
      
      if (process.client) {
        // Start session timer
        setInterval(() => {
          this.interaction.sessionDuration++
        }, 1000)
        
        // Listen for window resize
        window.addEventListener('resize', () => {
          this.detectDevice()
        })
        
        // Track user activity
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
        activityEvents.forEach(event => {
          document.addEventListener(event, () => {
            this.updateLastActivity()
          })
        })
      }
    }
  },

  persist: {
    paths: ['viewPreferences', 'features', 'sidebarCollapsed']
  }
})
