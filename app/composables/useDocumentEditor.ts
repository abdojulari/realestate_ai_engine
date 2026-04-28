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

// pdf-lib `save()` options tuned for maximum reader compatibility. Without
// `useObjectStreams: false` pdf-lib emits PDF 1.5 cross-reference streams +
// object streams which some PDFs round-trip badly (Acrobat error 132,
// "There was a problem reading this document"). Disabling object streams
// forces a classic xref table, which is far more forgiving.
// `updateFieldAppearances: false` skips re-rendering AcroForm widget
// appearances (we don't edit form fields here, and that step is the source
// of many regenerated-PDF bugs).
const SAFE_SAVE_OPTS = {
  useObjectStreams: false,
  updateFieldAppearances: false,
} as const

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
  // Guard against SSR: this composable is consumed by `pages/admin/documents/index.vue`
  // which binds `:auth-headers="editor.getAuthHeaders()"` in the template. That
  // expression is evaluated on every render, including the server pass — and
  // `localStorage` is undefined on the server. Without the guard SSR throws
  // a `ReferenceError: localStorage is not defined`.
  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {}
    try {
      const token = window.localStorage.getItem('token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    } catch {
      return {}
    }
  }

  // --- Core PDF state ---
  let currentPdfDoc: any = null
  let pdfDocument: any = null
  // Cached buffer for the document currently being opened. Required so we can
  // retry loading with a password (or with the correct password after a wrong
  // one) without re-fetching the file from the server.
  let pendingPdfBuffer: ArrayBuffer | null = null

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

  // ─── Encrypted PDF state ─────────────────────────────────
  // Surfaced to the page so it can show a password prompt dialog. The editor
  // shell stays open while the prompt is displayed — no half-broken state.
  const passwordRequired = ref(false)
  const passwordError = ref('') // populated when the user submits a wrong password
  const unlocking = ref(false)

  // True when pdf-lib detected an /Encrypt dictionary on the loaded PDF.
  // We loaded with `ignoreEncryption: true` so we can still render via pdf.js
  // (with the supplied password), but in-memory streams in pdf-lib are still
  // ciphertext — calling `currentPdfDoc.save()` would emit corrupted bytes.
  // Save is therefore disabled for encrypted PDFs.
  const wasEncrypted = ref(false)

  // Tracks whether the in-memory PDF differs from the bytes we last loaded
  // (`pendingPdfBuffer`). When false, "Save" can re-upload the original bytes
  // verbatim — avoiding a pdf-lib round-trip that some PDFs don't survive
  // (compressed xref streams, hybrid xref tables, XFA, etc. → Acrobat error
  // 132 / pdf.js misreporting corrupted streams as PasswordException).
  const isDirty = ref(false)
  const markDirty = () => { isDirty.value = true }

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
    passwordRequired.value = false
    passwordError.value = ''
    pendingPdfBuffer = null
    wasEncrypted.value = false
    isDirty.value = false

    await nextTick()

    try {
      const response = await fetch(doc.filePath)
      const arrayBuffer = await response.arrayBuffer()

      if (doc.type === 'docx') {
        const pdfBytes = await convertDocxToPdf(arrayBuffer)
        // DOCX → PDF output is generated by us; never password protected.
        pendingPdfBuffer = pdfBytes
        await loadPdfDocument(pdfBytes)
      } else {
        // Cache the original buffer so we can retry with a password if the
        // PDF turns out to be encrypted.
        pendingPdfBuffer = arrayBuffer
        await loadPdfDocument(arrayBuffer)
      }
    } catch (error: any) {
      // pdf.js raises a `PasswordException` (name === 'PasswordException',
      // code 1 = NEED_PASSWORD, 2 = INCORRECT_PASSWORD). Don't tear down the
      // editor — surface the password prompt instead.
      if (isPasswordException(error)) {
        passwordRequired.value = true
        passwordError.value = ''
        return
      }
      console.error('Error opening document:', error)
      closeEditor()
      throw error
    } finally {
      loadingPdf.value = false
    }
  }

  const isPasswordException = (err: any): boolean => {
    if (!err) return false
    const name = err?.name || err?.constructor?.name || ''
    if (name === 'PasswordException') return true
    const msg = (err?.message || '').toString().toLowerCase()
    return msg.includes('no password given') || msg.includes('incorrect password')
  }

  const loadPdfDocument = async (arrayBuffer: ArrayBuffer, password?: string) => {
    // Both libs may take ownership of (or detach) the underlying buffer, so
    // hand each a fresh copy. This also lets us retry on wrong-password.
    const bufForLib = arrayBuffer.slice(0)
    const bufForJs = arrayBuffer.slice(0)

    currentPdfDoc = await PDFDocument.load(bufForLib, {
      ignoreEncryption: true,
      ...(password ? { password } : {}),
    } as any)
    // Track whether the source PDF was encrypted. Because we passed
    // `ignoreEncryption: true`, pdf-lib gave us a document whose streams are
    // still ciphertext — round-tripping it via `save()` would corrupt it.
    try { wasEncrypted.value = !!currentPdfDoc?.isEncrypted } catch { wasEncrypted.value = false }

    const loadingTask = pdfjsLib.getDocument({
      data: bufForJs,
      ...(password ? { password } : {}),
    } as any)
    pdfDocument = await loadingTask.promise
    totalPages.value = pdfDocument.numPages

    await nextTick()
    for (let i = 1; i <= totalPages.value; i++) {
      await renderPage(i)
      await renderThumbnail(i)
    }
  }

  // Called from the password dialog. Re-runs the load against the cached
  // buffer using the supplied password. On NEED_PASSWORD/INCORRECT_PASSWORD
  // we keep the dialog open with an inline error.
  const unlockPdf = async (password: string): Promise<boolean> => {
    if (!pendingPdfBuffer) {
      passwordError.value = 'Document is no longer available. Please reopen it.'
      return false
    }
    if (!password || !password.trim()) {
      passwordError.value = 'Please enter a password.'
      return false
    }
    unlocking.value = true
    passwordError.value = ''
    try {
      await loadPdfDocument(pendingPdfBuffer, password)
      passwordRequired.value = false
      return true
    } catch (err: any) {
      if (isPasswordException(err)) {
        passwordError.value =
          err?.code === 2 || /incorrect/i.test(err?.message || '')
            ? 'Incorrect password. Please try again.'
            : 'A password is required to open this document.'
        return false
      }
      console.error('Error unlocking document:', err)
      passwordError.value = 'Could not open the document. The file may be corrupted.'
      return false
    } finally {
      unlocking.value = false
    }
  }

  const cancelPasswordPrompt = () => {
    passwordRequired.value = false
    passwordError.value = ''
    closeEditor()
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
    pendingPdfBuffer = null
    currentPage.value = 1
    totalPages.value = 0
    scale.value = 1.0
    ocrText.value = ''
    textElements.value = []
    signatureElements.value = []
    selectedElement.value = null
    canvasRefs.clear()
    thumbnailRefs.clear()
    passwordRequired.value = false
    passwordError.value = ''
    unlocking.value = false
    wasEncrypted.value = false
    isDirty.value = false
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
    markDirty()
  }

  // ─── Signature Elements ────────────────────────────────

  const addSignatureElement = (element: SignatureElement) => {
    signatureElements.value.push(element)
    markDirty()
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

  // ─── Markup / Annotation Overlay ────────────────────────

  const applyMarkupToPage = async (pageNum: number, imageDataUrl: string) => {
    if (!currentPdfDoc) return
    processing.value = true
    try {
      const pages = currentPdfDoc.getPages()
      const page = pages[pageNum - 1]
      if (!page) return

      const base64 = imageDataUrl.split(',')[1]
      if (!base64) return
      const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const img = await currentPdfDoc.embedPng(imgBytes)

      const { width, height } = page.getSize()
      page.drawImage(img, { x: 0, y: 0, width, height })

      const pdfBytes = await currentPdfDoc.save(SAFE_SAVE_OPTS)
      // Refresh the cached buffer so a subsequent unedited "Save" uploads
      // the markup-applied bytes (not the pre-markup original).
      pendingPdfBuffer = (pdfBytes as Uint8Array).buffer.slice(0)
      await loadPdfDocument(pendingPdfBuffer)
      markDirty()
    } finally {
      processing.value = false
    }
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

  /**
   * Stamp a watermark across every page. All options are configurable from the
   * WatermarkDialog. Defaults preserve the previous behaviour ("CONFIDENTIAL"
   * red @ 20% opacity, 50pt, 45° rotation) so existing call sites still work.
   *
   * Note: pdf-lib draws on top of the existing page content. There is no true
   * "remove watermark" — to undo, use `reloadOriginalPdf()` which re-fetches the
   * source file from the server (discarding any unsaved in-memory edits).
   */
  const addWatermark = async (options: {
    text?: string
    opacity?: number      // 0..1
    fontSize?: number     // pt
    rotation?: number     // degrees
    color?: { r: number; g: number; b: number } // 0..1 each
  } = {}) => {
    if (!currentPdfDoc) return
    const text = (options.text ?? 'CONFIDENTIAL').toString()
    if (!text.trim()) return
    const opacity = clamp(options.opacity ?? 0.2, 0.05, 1)
    const fontSize = clamp(options.fontSize ?? 50, 8, 300)
    const rotation = options.rotation ?? 45
    const color = options.color ?? { r: 0.9, g: 0.1, b: 0.1 }

    processing.value = true
    try {
      const pages = currentPdfDoc.getPages()
      const font = await currentPdfDoc.embedFont(StandardFonts.HelveticaBold)
      pages.forEach((page: any) => {
        const { width, height } = page.getSize()
        // Center the watermark roughly: pdf-lib draws from the baseline-left
        // of the text, so offset by half the text width / a font-height proxy.
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        const cx = width / 2 - textWidth / 2
        const cy = height / 2 - fontSize / 2
        page.drawText(text, {
          x: cx,
          y: cy,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: degrees(rotation),
        })
      })
      const pdfBytes = await currentPdfDoc.save(SAFE_SAVE_OPTS)
      pendingPdfBuffer = (pdfBytes as Uint8Array).buffer.slice(0)
      await loadPdfDocument(pendingPdfBuffer)
      markDirty()
    } finally {
      processing.value = false
    }
  }

  /**
   * Re-fetch the underlying file from the server and reload it into the editor,
   * discarding any in-memory edits (watermark, text, signatures). Used by the
   * "Remove watermark" action.
   */
  const reloadOriginalPdf = async () => {
    if (!activeDoc.value?.filePath) return
    processing.value = true
    try {
      const response = await fetch(activeDoc.value.filePath, { cache: 'no-store' })
      const buffer = await response.arrayBuffer()
      // Wipe overlay state — those were drawn on top of the previous (watermarked) buffer.
      textElements.value = []
      signatureElements.value = []
      selectedElement.value = null
      ocrText.value = ''
      if (activeDoc.value.type === 'docx') {
        const pdfBytes = await convertDocxToPdf(buffer)
        await loadPdfDocument(pdfBytes)
      } else {
        await loadPdfDocument(buffer)
      }
    } finally {
      processing.value = false
    }
  }

  function clamp(n: number, min: number, max: number): number {
    if (!Number.isFinite(n)) return min
    return Math.min(max, Math.max(min, n))
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
    // Encrypted PDFs were loaded with `ignoreEncryption: true`. Their in-
    // memory streams are still ciphertext; saving via pdf-lib would write
    // those bytes out as if they were plaintext → unreadable file. Refuse.
    if (wasEncrypted.value) {
      throw new Error(
        'This PDF is encrypted and cannot be saved from the editor. Please remove the encryption with another tool and re-upload.',
      )
    }

    const hasPendingText = textElements.value.length > 0
    const hasPendingSig = signatureElements.value.length > 0
    const needsFlatten = hasPendingText || hasPendingSig

    saving.value = true
    try {
      let pdfBytes: Uint8Array

      if (needsFlatten) {
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

        // Use compatibility-safe save options. See SAFE_SAVE_OPTS for context.
        pdfBytes = await currentPdfDoc.save(SAFE_SAVE_OPTS)
      } else if (isDirty.value && pendingPdfBuffer) {
        // Watermark / markup were applied earlier. Those operations already
        // re-saved into pendingPdfBuffer; upload that buffer verbatim.
        pdfBytes = new Uint8Array(pendingPdfBuffer.slice(0))
      } else if (pendingPdfBuffer) {
        // Nothing changed at all → upload the original bytes verbatim. This
        // is the critical fix for "open + save with no edits corrupts the
        // file". Avoids the pdf-lib round-trip that broke real-world PDFs.
        pdfBytes = new Uint8Array(pendingPdfBuffer.slice(0))
      } else {
        // Defensive fallback: nothing to upload, treat as a no-op success.
        closeEditor()
        return true
      }

      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const formData = new FormData()
      formData.append('file', blob, activeDoc.value.originalName)
      formData.append('status', 'signed')
      formData.append('isSigned', 'true')

      await $fetch(`/api/admin/documents/${activeDoc.value.id}`, {
        method: 'PUT', headers: getAuthHeaders(), body: formData,
      })

      // Auto-download (only when we re-flattened — avoid spamming downloads
      // on a no-op save).
      if (needsFlatten || isDirty.value) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Signed_${activeDoc.value.originalName}`
        link.click()
        URL.revokeObjectURL(url)
      }

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
    // Encrypted PDF state
    passwordRequired, passwordError, unlocking, wasEncrypted, isDirty,
    // Refs
    canvasRefs, thumbnailRefs, setCanvasRef, setThumbnailRef,
    // Elements
    textElements, signatureElements, selectedElement,
    // Search
    searchQuery, searchResults,
    // PDF ops
    openEditor, closeEditor, loadPdfDocument, unlockPdf, cancelPasswordPrompt,
    // Navigation
    previousPage, nextPage, goToPage, goToPageNumber, scrollToPage,
    // Zoom
    zoomIn, zoomOut,
    // Elements ops
    addTextElement, addSignatureElement,
    selectElement, startDrag, startResize, deleteElement,
    // Features
    searchPdf, addWatermark, reloadOriginalPdf, applyMarkupToPage, runOCR, runOCRAllPages,
    savePdf,
    // Converters
    convertDocxToPdf, convertImageToPdf, convertTextToPdf,
    // Utilities
    formatFileSize, formatDate, getStatusColor, getFileExtension,
  }
}
