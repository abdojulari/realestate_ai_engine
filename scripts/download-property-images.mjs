import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, '..', 'public', 'images')

// Ensure images directory exists
await fs.mkdir(imagesDir, { recursive: true })

// Real estate image URLs from Unsplash (free to use)
const propertyImages = [
  // Property 1 - Luxury Downtown Penthouse
  {
    urls: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&h=600&fit=crop'
    ],
    names: ['property1.jpg', 'property1-2.jpg', 'property1-3.jpg']
  },
  // Property 2 - Modern Oliver Condo
  {
    urls: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop'
    ],
    names: ['property2.jpg', 'property2-2.jpg', 'property2-3.jpg']
  },
  // Property 3 - Windermere Executive Home
  {
    urls: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop'
    ],
    names: ['property3.jpg', 'property3-2.jpg', 'property3-3.jpg']
  },
  // Property 4 - Mill Woods Family Home
  {
    urls: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=600&fit=crop'
    ],
    names: ['property4.jpg', 'property4-2.jpg', 'property4-3.jpg']
  },
  // Property 5 - Historic Strathcona Character Home
  {
    urls: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&h=600&fit=crop'
    ],
    names: ['property5.jpg', 'property5-2.jpg', 'property5-3.jpg']
  },
  // Property 6 - Glenora Luxury Estate
  {
    urls: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop'
    ],
    names: ['property6.jpg', 'property6-2.jpg', 'property6-3.jpg']
  },
  // Property 7 - Sherwood Park Bungalow
  {
    urls: [
      'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'
    ],
    names: ['property7.jpg', 'property7-2.jpg', 'property7-3.jpg']
  },
  // Property 8 - Riverbend Townhouse
  {
    urls: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&h=600&fit=crop'
    ],
    names: ['property8.jpg', 'property8-2.jpg', 'property8-3.jpg']
  },
  // Property 9 - Terwillegar Heights New Build
  {
    urls: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop'
    ],
    names: ['property9.jpg', 'property9-2.jpg', 'property9-3.jpg']
  },
  // Property 10 - Westmount Starter Home
  {
    urls: [
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566752734-d1d394c5dee2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753051-6057e6c00089?w=800&h=600&fit=crop'
    ],
    names: ['property10.jpg', 'property10-2.jpg', 'property10-3.jpg']
  },
  // Property 11 - Capilano Duplex Investment
  {
    urls: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop'
    ],
    names: ['property11.jpg', 'property11-2.jpg', 'property11-3.jpg']
  },
  // Property 12 - Garneau Student Rental
  {
    urls: [
      'https://images.unsplash.com/photo-1600566752734-d1d394c5dee2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753051-6057e6c00089?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&h=600&fit=crop'
    ],
    names: ['property12.jpg', 'property12-2.jpg', 'property12-3.jpg']
  }
]

async function downloadImage(url, filename) {
  try {
    console.log(`Downloading ${filename}...`)
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
  }
}

async function downloadAllImages() {
  console.log('Starting property image downloads...')
  
  for (const property of propertyImages) {
    for (let i = 0; i < property.urls.length; i++) {
      await downloadImage(property.urls[i], property.names[i])
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  console.log('All downloads completed!')
}

downloadAllImages().catch(console.error)
