import { defineEventHandler, setHeader } from 'h3'
import { createGzip, createDeflate } from 'zlib'
import { pipeline } from 'stream'
import { promisify } from 'util'

const pipelineAsync = promisify(pipeline)

export default defineEventHandler(async (event) => {
  const request = event.node.req
  const response = event.node.res
  
  // Skip compression for certain routes/file types
  const url = request.url || ''
  
  // Don't compress already compressed files, images, or small responses
  const skipCompression = 
    url.includes('.') && (
      url.endsWith('.gz') ||
      url.endsWith('.zip') ||
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.png') ||
      url.endsWith('.gif') ||
      url.endsWith('.webp') ||
      url.endsWith('.mp4') ||
      url.endsWith('.pdf')
    )

  if (skipCompression) {
    return
  }

  // Check if client accepts compression
  const acceptEncoding = request.headers['accept-encoding'] || ''
  
  let encoding: 'gzip' | 'deflate' | null = null
  
  if (acceptEncoding.includes('gzip')) {
    encoding = 'gzip'
  } else if (acceptEncoding.includes('deflate')) {
    encoding = 'deflate'
  }

  if (!encoding) {
    return // Client doesn't support compression
  }

  // Override response write methods to compress
  const originalWrite = response.write.bind(response)
  const originalEnd = response.end.bind(response)
  
  let compressionStream: any = null
  let isCompressed = false

  const initCompression = () => {
    if (isCompressed) return
    
    isCompressed = true
    setHeader(event, 'Content-Encoding', encoding!)
    setHeader(event, 'Vary', 'Accept-Encoding')
    
    // Remove content-length header since it will change after compression
    response.removeHeader('content-length')
    
    compressionStream = encoding === 'gzip' ? createGzip() : createDeflate()
    
    compressionStream.on('data', (chunk: Buffer) => {
      originalWrite(chunk)
    })
    
    compressionStream.on('end', () => {
      originalEnd()
    })
  }

  // Override write method
  response.write = function(chunk: any, encoding?: any) {
    if (!chunk) return originalWrite(chunk, encoding)
    
    // Only compress text responses larger than 1KB
    const shouldCompress = 
      response.getHeader('content-type')?.toString().includes('text') ||
      response.getHeader('content-type')?.toString().includes('json') ||
      response.getHeader('content-type')?.toString().includes('javascript') ||
      response.getHeader('content-type')?.toString().includes('css')

    if (shouldCompress && (chunk.length || 0) > 1024) {
      initCompression()
      if (compressionStream) {
        compressionStream.write(chunk)
        return true
      }
    }
    
    return originalWrite(chunk, encoding)
  }

  // Override end method
  response.end = function(chunk?: any, encoding?: any) {
    if (chunk && compressionStream) {
      compressionStream.end(chunk)
    } else if (compressionStream) {
      compressionStream.end()
    } else {
      originalEnd(chunk, encoding)
    }
  }
})
