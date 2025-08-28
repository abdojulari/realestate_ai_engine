import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, '..', 'public', 'images')

// Alternative real estate images for failed downloads
const fallbackImages = [
  // Property 9 alternatives
  {
    urls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop'
    ],
    names: ['property9-2.jpg']
  },
  // Property 10 alternatives  
  {
    urls: [
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop'
    ],
    names: ['property10-2.jpg', 'property10-3.jpg']
  },
  // Property 12 alternatives
  {
    urls: [
      'https://images.unsplash.com/photo-1600566752734-d1d394c5dee2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753051-6057e6c00089?w=800&h=600&fit=crop'
    ],
    names: ['property12.jpg', 'property12-2.jpg']
  }
]

async function downloadImage(url, filename) {
  try {
    console.log(`Downloading fallback ${filename}...`)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    const filePath = path.join(imagesDir, filename)
    await fs.writeFile(filePath, Buffer.from(buffer))
    console.log(`✓ Downloaded ${filename}`)
  } catch (error) {
    console.error(`✗ Failed to download ${filename}:`, error.message)
    // Create a simple SVG placeholder instead
    await createSvgPlaceholder(filename)
  }
}

async function createSvgPlaceholder(filename) {
  try {
    const propertyNumber = filename.match(/property(\d+)/)?.[1] || '1'
    const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#f5f5f5"/>
      <rect x="50" y="50" width="700" height="500" fill="#e0e0e0" stroke="#ccc" stroke-width="2"/>
      <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#666">
        Property ${propertyNumber}
      </text>
      <text x="400" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#999">
        Image Placeholder
      </text>
      <circle cx="200" cy="150" r="30" fill="#ddd"/>
      <rect x="500" y="120" width="200" height="60" fill="#ddd"/>
      <rect x="100" y="400" width="600" height="100" fill="#ddd"/>
    </svg>`
    
    const filePath = path.join(imagesDir, filename.replace('.jpg', '.svg'))
    await fs.writeFile(filePath, svg)
    console.log(`✓ Created SVG placeholder: ${filename.replace('.jpg', '.svg')}`)
  } catch (error) {
    console.error(`✗ Failed to create placeholder for ${filename}:`, error.message)
  }
}

async function downloadFallbackImages() {
  console.log('Downloading fallback images for failed downloads...')
  
  for (const property of fallbackImages) {
    for (let i = 0; i < property.urls.length; i++) {
      await downloadImage(property.urls[i], property.names[i])
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  console.log('Fallback downloads completed!')
}

// Also create a generic property placeholder
async function createGenericPlaceholder() {
  const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)"/>
    <rect x="100" y="100" width="600" height="400" fill="#fff" stroke="#dee2e6" stroke-width="2" rx="8"/>
    <rect x="150" y="150" width="500" height="200" fill="#f8f9fa" stroke="#e9ecef" stroke-width="1"/>
    <text x="400" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#495057">
      🏠 Property Image
    </text>
    <text x="400" y="290" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6c757d">
      Real Estate Placeholder
    </text>
    <rect x="150" y="380" width="150" height="80" fill="#e9ecef" rx="4"/>
    <rect x="325" y="380" width="150" height="80" fill="#e9ecef" rx="4"/>
    <rect x="500" y="380" width="150" height="80" fill="#e9ecef" rx="4"/>
  </svg>`
  
  const filePath = path.join(imagesDir, 'property-placeholder.svg')
  await fs.writeFile(filePath, svg)
  console.log('✓ Created generic property placeholder')
}

async function main() {
  await downloadFallbackImages()
  await createGenericPlaceholder()
}

main().catch(console.error)
