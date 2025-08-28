const storage = {
  get: (key: string): any => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error(`Error reading from localStorage: ${key}`, error)
      return null
    }
  },

  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error writing to localStorage: ${key}`, error)
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing from localStorage: ${key}`, error)
    }
  },

  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Error clearing localStorage', error)
    }
  },

  // Session-specific methods
  getSession: (key: string): any => {
    try {
      const item = sessionStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error(`Error reading from sessionStorage: ${key}`, error)
      return null
    }
  },

  setSession: (key: string, value: any): void => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error writing to sessionStorage: ${key}`, error)
    }
  },

  removeSession: (key: string): void => {
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing from sessionStorage: ${key}`, error)
    }
  },

  clearSession: (): void => {
    try {
      sessionStorage.clear()
    } catch (error) {
      console.error('Error clearing sessionStorage', error)
    }
  },

  // Utility methods
  hasItem: (key: string): boolean => {
    return !!localStorage.getItem(key)
  },

  hasSessionItem: (key: string): boolean => {
    return !!sessionStorage.getItem(key)
  },

  // Methods with expiration
  setWithExpiry: (key: string, value: any, ttl: number): void => {
    const item = {
      value,
      expiry: new Date().getTime() + ttl
    }
    storage.set(key, item)
  },

  getWithExpiry: (key: string): any => {
    const item = storage.get(key)
    if (!item) return null

    if (new Date().getTime() > item.expiry) {
      storage.remove(key)
      return null
    }
    return item.value
  },

  // Methods for handling arrays
  addToArray: (key: string, value: any): void => {
    const array = storage.get(key) || []
    array.push(value)
    storage.set(key, array)
  },

  removeFromArray: (key: string, predicate: (item: any) => boolean): void => {
    const array = storage.get(key) || []
    const filtered = array.filter((item: any) => !predicate(item))
    storage.set(key, filtered)
  },

  // Methods for handling objects
  updateObject: (key: string, updates: Record<string, any>): void => {
    const object = storage.get(key) || {}
    storage.set(key, { ...object, ...updates })
  },

  // Methods for handling sets
  addToSet: (key: string, value: any): void => {
    const set = new Set(storage.get(key) || [])
    set.add(value)
    storage.set(key, Array.from(set))
  },

  removeFromSet: (key: string, value: any): void => {
    const set = new Set(storage.get(key) || [])
    set.delete(value)
    storage.set(key, Array.from(set))
  }
}

export default storage
