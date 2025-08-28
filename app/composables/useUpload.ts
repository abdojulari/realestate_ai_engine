import { ref } from 'vue'

export function useUpload() {
  const uploading = ref(false)
  const progress = ref(0)
  const { upload } = useApi()

  const uploadFiles = async (files: File[], endpoint: string) => {
    uploading.value = true
    progress.value = 0

    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`file${index}`, file)
      })

      const { data, error } = await upload(endpoint, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            progress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          }
        }
      })

      if (error.value) {
        throw error.value
      }

      return data.value
    } finally {
      uploading.value = false
      progress.value = 0
    }
  }

  const uploadImage = async (file: File, endpoint: string) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB')
    }

    return await uploadFiles([file], endpoint)
  }

  const uploadImages = async (files: File[], endpoint: string) => {
    // Validate files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        throw new Error('All files must be images')
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Each file must be less than 5MB')
      }
    }

    return await uploadFiles(files, endpoint)
  }

  const getImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(e)
      reader.readAsDataURL(file)
    })
  }

  const compressImage = async (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(img.src)

        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }))
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    })
  }

  return {
    uploading,
    progress,
    uploadFiles,
    uploadImage,
    uploadImages,
    getImagePreview,
    compressImage
  }
}
