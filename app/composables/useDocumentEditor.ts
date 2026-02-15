/**
 * Composable: useDocumentEditor
 *
 * Encapsulates all PDF editor state and operations:
 *  - PDF loading / rendering / thumbnails
 *  - Page navigation & zoom
 *  - Text & signature element management (drag, resize, delete)
 *  - OCR (single page & all pages)
 *  - Watermark
 *  - Search within PDF
 *  - Save (flatten elements → re-upload)
 *  - DOCX / Image / Text → PDF conversion helpers
 */

import { ref, nextTick } from 'vue'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import SignaturePad from 'signature_pad'
import mammoth from 'mammoth'
import { createWorker } from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

// ─── Types ───────────────────────────────────────────────

export interface TextElement {
  page: number
  content: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
}

export interface SignatureElement {
  page: number
  data: string
  type: string
  x: number
  y: number
  width: number
  height: number
}

// ─── Composable ──────────────────────────────────────────

export function useDocumentEditor() {
  // --- Auth helper ---
  const getAuthHeaders = (): Record<string, string> => {
    try {
      const token = localStorage.getItem('token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    } catch {
      return {}
    }
  }

  // --- Core PDF state ---
  let currentPdfDoc: any = null
  let pdfDocument: any = null

  const isEditing = ref(false)
  const activeDoc = ref<any>(null)
  const loadingPdf = ref(false)
  const processing = ref(false)
  const saving = ref(false)
  const currentPage = ref(1)
  const totalPages = ref(0)
  const scale = ref(1.0)
  const ocrLoading = ref(false)
  const ocrText = ref('')
  const ocrPage = ref(1)

  // Canvas / thumbnail ref maps
  const canvasRefs = new Map<number, HTMLCanvasElement>()
  const thumbnailRefs = new Map<number, HTMLCanvasElement>()

  const setCanvasRef = (el: any, pageNum: number) => {
    if (el) canvasRefs.set(pageNum, el)
  }
  const setThumbnailRef = (el: any, pageNum: number) => {
    if (el) thumbnailRefs.set(pageNum, el)
  }

  // --- Draggable elements ---
  const textElements = ref<TextElement[]>([])
  const signatureElements = ref<SignatureElement[]>([])
  const selectedElement = ref<string | null>(null)
  const isDragging = ref(false)
  const isResizing = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const currentDragElement = ref<any>(null)

  // --- Search ---
  const searchQuery = ref('')
  const searchResults = ref<any[]>([])

  // ─── PDF Loading & Rendering ───────────────────────────

  const openEditor = async (doc: any) => {
    activeDoc.value = doc
    isEditing.value = true
    loadingPdf.value = true
    currentPage.value = 1
    scale.value = 1.0
    ocrPage.value = 1
    textElements.value = []
    signatureElements.value = []

    await nextTick()

    try {
      const response = await fetch(doc.filePath)
      const arrayBuffer = await response.arrayBuffer()

      if (doc.type === 'docx') {
        const pdfBytes = await convertDocxToPdf(arrayBuffer)
        await loadPdfDocument(pdfBytes)
      } else {
        await loadPdfDocument(arrayBuffer)
      }
    } catch (error) {
      console.error('Error opening document:', error)
      closeEditor()
      throw error
    } finally {
      loadingPdf.value = false
    }
  }

  const loadPdfDocument = async (arrayBuffer: ArrayBuffer) => {
    currentPdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    pdfDocument = await loadingTask.promise
    totalPages.value = pdfDocument.numPages

    await nextTick()
    for (let i = 1; i <= totalPages.value; i++) {
      await renderPage(i)
      await renderThumbnail(i)
    }
  }

  const renderPage = async (pageNum: number) => {
    if (!pdfDocument) return
    const page = await pdfDocument.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = canvasRefs.get(pageNum)
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.height = viewport.height
    canvas.width = viewport.width
    await page.render({ canvasContext: context, viewport }).promise
  }

  const renderThumbnail = async (pageNum: number) => {
    if (!pdfDocument) return
    const page = await pdfDocument.getPage(pageNum)
    const viewport = page.getViewport({ scale: 0.2 })
    const canvas = thumbnailRefs.get(pageNum)
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.height = viewport.height
    canvas.width = viewport.width
    await page.render({ canvasContext: context, viewport }).promise
  }

  const closeEditor = () => {
    isEditing.value = false
    activeDoc.value = null
    currentPdfDoc = null
    pdfDocument = null
    currentPage.value = 1
    totalPages.value = 0
    scale.value = 1.0
    ocrText.value = ''
    textElements.value = []
    signatureElements.value = []
    selectedElement.value = null
    canvasRefs.clear()
    thumbnailRefs.clear()
  }

  // ─── Navigation ────────────────────────────────────────

  const previousPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
      scrollToPage(currentPage.value)
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
      scrollToPage(currentPage.value)
    }
  }

  const goToPage = () => {
    if (currentPage.value >= 1 && currentPage.value <= totalPages.value) {
      scrollToPage(currentPage.value)
    }
  }

  const goToPageNumber = (pageNum: number) => {
    currentPage.value = pageNum
    scrollToPage(pageNum)
  }

  const scrollToPage = (pageNum: number) => {
    const element = document.getElementById(`page-${pageNum}`)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ─── Zoom ──────────────────────────────────────────────

  const zoomIn = () => { if (scale.value < 3) scale.value += 0.25 }
  const zoomOut = () => { if (scale.value > 0.5) scale.value -= 0.25 }

  // ─── Text Elements ─────────────────────────────────────

  const addTextElement = (element: TextElement) => {
    textElements.value.push(element)
  }

  // ─── Signature Elements ────────────────────────────────

  const addSignatureElement = (element: SignatureElement) => {
    signatureElements.value.push(element)
  }

  // ─── Drag & Drop ───────────────────────────────────────

  const selectElement = (elementId: string, element: any) => {
    selectedElement.value = elementId
    currentDragElement.value = element
  }

  const startDrag = (event: MouseEvent, type: string, index: number) => {
    event.preventDefault()
    isDragging.value = true
    const elements = type === 'text' ? textElements.value : signatureElements.value
    currentDragElement.value = elements[index]
    selectedElement.value = `${type === 'text' ? 'text' : 'sig'}-${index}`
    dragStart.value = {
      x: event.clientX - currentDragElement.value.x * scale.value,
      y: event.clientY - currentDragElement.value.y * scale.value,
    }
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', stopDrag)
  }

  const handleDragMove = (event: MouseEvent) => {
    if (!isDragging.value || !currentDragElement.value) return
    currentDragElement.value.x = Math.max(0, (event.clientX - dragStart.value.x) / scale.value)
    currentDragElement.value.y = Math.max(0, (event.clientY - dragStart.value.y) / scale.value)
  }

  const stopDrag = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', stopDrag)
  }

  // ─── Resize ────────────────────────────────────────────

  const startResize = (event: MouseEvent, index: number) => {
    event.preventDefault()
    event.stopPropagation()
    isResizing.value = true
    currentDragElement.value = signatureElements.value[index]
    dragStart.value = { x: event.clientX, y: event.clientY }
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
  }

  const handleResize = (event: MouseEvent) => {
    if (!isResizing.value || !currentDragElement.value) return
    currentDragElement.value.width = Math.max(50, currentDragElement.value.width + (event.clientX - dragStart.value.x) / scale.value)
    currentDragElement.value.height = Math.max(30, currentDragElement.value.height + (event.clientY - dragStart.value.y) / scale.value)
    dragStart.value = { x: event.clientX, y: event.clientY }
  }

  const stopResize = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
  }

  const deleteElement = (type: string, index: number) => {
    if (type === 'text') textElements.value.splice(index, 1)
    else signatureElements.value.splice(index, 1)
    selectedElement.value = null
  }

  // ─── Search ────────────────────────────────────────────

  const searchPdf = async () => {
    if (!pdfDocument || !searchQuery.value) return
    searchResults.value = []
    for (let i = 1; i <= totalPages.value; i++) {
      const page = await pdfDocument.getPage(i)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((item: any) => item.str).join(' ')
      if (text.toLowerCase().includes(searchQuery.value.toLowerCase())) {
        searchResults.value.push({ page: i, text })
      }
    }
    return searchResults.value.length
  }

  // ─── Watermark ─────────────────────────────────────────

  const addWatermark = async () => {
    if (!currentPdfDoc) return
    processing.value = true
    try {
      const pages = currentPdfDoc.getPages()
      const font = await currentPdfDoc.embedFont(StandardFonts.HelveticaBold)
      pages.forEach((page: any) => {
        const { width, height } = page.getSize()
        page.drawText('CONFIDENTIAL', {
          x: width / 4, y: height / 2, size: 50, font,
          color: rgb(0.9, 0.1, 0.1), opacity: 0.2, rotate: degrees(45),
        })
      })
      const pdfBytes = await currentPdfDoc.save()
      await loadPdfDocument(pdfBytes.buffer)
    } finally {
      processing.value = false
    }
  }

  // ─── OCR ───────────────────────────────────────────────

  const runOCR = async () => {
    const page = ocrPage.value || currentPage.value
    if (!canvasRefs.has(page)) return
    ocrLoading.value = true
    ocrText.value = ''
    try {
      const canvas = canvasRefs.get(page)
      if (!canvas) return
      const worker = await createWorker('eng')
      const { data: { text } } = await worker.recognize(canvas)
      ocrText.value = text
      await worker.terminate()
    } finally {
      ocrLoading.value = false
    }
  }

  const runOCRAllPages = async () => {
    if (!totalPages.value) return
    ocrLoading.value = true
    ocrText.value = ''
    try {
      const worker = await createWorker('eng')
      const parts: string[] = []
      for (let p = 1; p <= totalPages.value; p++) {
        const canvas = canvasRefs.get(p)
        if (canvas) {
          const { data: { text } } = await worker.recognize(canvas)
          if (text?.trim()) parts.push(`--- Page ${p} ---\n${text.trim()}`)
        }
      }
      await worker.terminate()
      ocrText.value = parts.join('\n\n')
    } finally {
      ocrLoading.value = false
    }
  }

  // ─── Save PDF ──────────────────────────────────────────

  const savePdf = async () => {
    if (!currentPdfDoc || !activeDoc.value) return
    saving.value = true
    try {
      const pages = currentPdfDoc.getPages()

      // Flatten text elements
      for (const textEl of textElements.value) {
        const page = pages[textEl.page - 1]
        if (!page) continue
        let font
        try {
          if (textEl.fontFamily === 'Helvetica') font = await currentPdfDoc.embedFont(StandardFonts.Helvetica)
          else if (textEl.fontFamily === 'Times-Roman') font = await currentPdfDoc.embedFont(StandardFonts.TimesRoman)
          else if (textEl.fontFamily === 'Courier') font = await currentPdfDoc.embedFont(StandardFonts.Courier)
          else font = await currentPdfDoc.embedFont(StandardFonts.Helvetica)
        } catch { font = await currentPdfDoc.embedFont(StandardFonts.Helvetica) }
        const c = hexToRgb(textEl.color)
        const pageHeight = page.getHeight()
        page.drawText(textEl.content, {
          x: textEl.x * 1.5, y: pageHeight - (textEl.y * 1.5) - textEl.fontSize,
          size: textEl.fontSize, font, color: rgb(c.r, c.g, c.b),
        })
      }

      // Flatten signature elements
      for (const sigEl of signatureElements.value) {
        const page = pages[sigEl.page - 1]
        if (!page) continue
        const pageHeight = page.getHeight()
        if (sigEl.type === 'draw' || sigEl.type === 'upload') {
          const img = await currentPdfDoc.embedPng(sigEl.data)
          page.drawImage(img, {
            x: sigEl.x * 1.5, y: pageHeight - (sigEl.y * 1.5) - (sigEl.height * 1.5),
            width: sigEl.width * 1.5, height: sigEl.height * 1.5,
          })
        } else if (sigEl.type === 'type') {
          const font = await currentPdfDoc.embedFont(StandardFonts.HelveticaBold)
          page.drawText(sigEl.data, {
            x: sigEl.x * 1.5, y: pageHeight - (sigEl.y * 1.5) - 40, size: 32, font, color: rgb(0, 0, 0),
          })
        }
      }

      const pdfBytes = await currentPdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const formData = new FormData()
      formData.append('file', blob, activeDoc.value.originalName)
      formData.append('status', 'signed')
      formData.append('isSigned', 'true')

      await $fetch(`/api/admin/documents/${activeDoc.value.id}`, {
        method: 'PUT', headers: getAuthHeaders(), body: formData,
      })

      // Auto-download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Signed_${activeDoc.value.originalName}`
      link.click()
      URL.revokeObjectURL(url)

      closeEditor()
      return true
    } finally {
      saving.value = false
    }
  }

  // ─── Conversion helpers ────────────────────────────────

  const convertDocxToPdf = async (arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
    const result = await mammoth.extractRawText({ arrayBuffer })
    const text = result.value
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pageWidth = 595, pageHeight = 842, fontSize = 12, lineHeight = fontSize * 1.2, maxWidth = 500, margin = 50
    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin
    for (const line of text.split('\n')) {
      const words = line.split(' ')
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine + word + ' '
        if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine !== '') {
          page.drawText(currentLine.trim(), { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) })
          currentLine = word + ' '
          y -= lineHeight
          if (y < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
        } else { currentLine = testLine }
      }
      if (currentLine.trim()) {
        page.drawText(currentLine.trim(), { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) })
        y -= lineHeight
        if (y < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
      }
    }
    return (await pdfDoc.save()).buffer as ArrayBuffer
  }

  const convertImageToPdf = async (imageFile: File): Promise<ArrayBuffer> => {
    const pdfDoc = await PDFDocument.create()
    const imageBytes = await imageFile.arrayBuffer()
    const ext = imageFile.name.split('.').pop()?.toLowerCase() || ''
    const image = ext === 'png' ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes)
    const dims = image.scale(1)
    const page = pdfDoc.addPage([dims.width, dims.height])
    page.drawImage(image, { x: 0, y: 0, width: dims.width, height: dims.height })
    return (await pdfDoc.save()).buffer as ArrayBuffer
  }

  const convertTextToPdf = async (text: string): Promise<ArrayBuffer> => {
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pageWidth = 595, pageHeight = 842, fontSize = 12, lineHeight = fontSize * 1.5, margin = 50
    const maxWidth = pageWidth - margin * 2
    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin
    for (const line of text.split('\n')) {
      if (!line.trim()) { y -= lineHeight; if (y < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }; continue }
      const words = line.split(' ')
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word
        if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
          page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) })
          currentLine = word; y -= lineHeight
          if (y < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
        } else { currentLine = testLine }
      }
      if (currentLine) {
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) })
        y -= lineHeight
        if (y < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
      }
    }
    return (await pdfDoc.save()).buffer as ArrayBuffer
  }

  // ─── Utilities ─────────────────────────────────────────

  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return r
      ? { r: parseInt(r[1]!, 16) / 255, g: parseInt(r[2]!, 16) / 255, b: parseInt(r[3]!, 16) / 255 }
      : { r: 0, g: 0, b: 0 }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const getStatusColor = (status: string) =>
    ({ signed: 'success', pending: 'warning', draft: 'grey' } as Record<string, string>)[status] || 'grey'

  const getFileExtension = (filename: string) =>
    filename.split('.').pop()?.toUpperCase() || ''

  return {
    // Auth
    getAuthHeaders,
    // Core state
    isEditing, activeDoc, loadingPdf, processing, saving,
    currentPage, totalPages, scale,
    ocrLoading, ocrText, ocrPage,
    // Refs
    canvasRefs, thumbnailRefs, setCanvasRef, setThumbnailRef,
    // Elements
    textElements, signatureElements, selectedElement,
    // Search
    searchQuery, searchResults,
    // PDF ops
    openEditor, closeEditor, loadPdfDocument,
    // Navigation
    previousPage, nextPage, goToPage, goToPageNumber, scrollToPage,
    // Zoom
    zoomIn, zoomOut,
    // Elements ops
    addTextElement, addSignatureElement,
    selectElement, startDrag, startResize, deleteElement,
    // Features
    searchPdf, addWatermark, runOCR, runOCRAllPages,
    savePdf,
    // Converters
    convertDocxToPdf, convertImageToPdf, convertTextToPdf,
    // Utilities
    formatFileSize, formatDate, getStatusColor, getFileExtension,
  }
}
