export const useAlert = () => {
  const showDialog = ref(false)
  const alertType = ref<'success' | 'error' | 'info' | 'warning'>('info')
  const alertTitle = ref('')
  const alertMessage = ref('')
  const alertConfirmText = ref('OK')
  
  const showAlert = (options: {
    type?: 'success' | 'error' | 'info' | 'warning'
    title?: string
    message: string
    confirmText?: string
  }) => {
    alertType.value = options.type || 'info'
    alertTitle.value = options.title || getDefaultTitle(options.type || 'info')
    alertMessage.value = options.message
    alertConfirmText.value = options.confirmText || 'OK'
    showDialog.value = true
  }
  
  const showSuccess = (message: string, title?: string) => {
    showAlert({
      type: 'success',
      title: title || 'Success',
      message
    })
  }
  
  const showError = (message: string, title?: string) => {
    showAlert({
      type: 'error', 
      title: title || 'Error',
      message
    })
  }
  
  const showInfo = (message: string, title?: string) => {
    showAlert({
      type: 'info',
      title: title || 'Information', 
      message
    })
  }
  
  const showWarning = (message: string, title?: string) => {
    showAlert({
      type: 'warning',
      title: title || 'Warning',
      message
    })
  }
  
  const getDefaultTitle = (type: string) => {
    switch (type) {
      case 'success': return 'Success'
      case 'error': return 'Error'
      case 'warning': return 'Warning'
      default: return 'Notification'
    }
  }
  
  const closeAlert = () => {
    showDialog.value = false
  }
  
  return {
    // Reactive state
    showDialog,
    alertType,
    alertTitle,
    alertMessage,
    alertConfirmText,
    
    // Methods
    showAlert,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    closeAlert
  }
}
