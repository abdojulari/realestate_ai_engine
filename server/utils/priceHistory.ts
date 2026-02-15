import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Track price changes for a property.
 * Call this during sync when updating a property's price.
 */
export async function trackPriceChange(
  propertyId: number,
  newPrice: number,
  oldPrice: number | null,
  source: string = 'manual'
): Promise<void> {
  try {
    if (!oldPrice || oldPrice === newPrice) {
      // First listing or no change — optionally record the initial listing
      if (!oldPrice && newPrice > 0) {
        const existingHistory = await prisma.propertyPriceHistory.findFirst({
          where: { propertyId, event: 'listed' }
        })
        if (!existingHistory) {
          await prisma.propertyPriceHistory.create({
            data: {
              propertyId,
              price: newPrice,
              event: 'listed',
              source,
            }
          })
        }
      }
      return
    }

    const changeAmt = newPrice - oldPrice
    const changePct = ((changeAmt / oldPrice) * 100)
    const event = changeAmt < 0 ? 'price_decrease' : 'price_increase'

    await prisma.propertyPriceHistory.create({
      data: {
        propertyId,
        price: newPrice,
        event,
        changeAmt,
        changePct: parseFloat(changePct.toFixed(2)),
        source,
      }
    })
  } catch (error) {
    console.error('Error tracking price change:', error)
  }
}

/**
 * Record a sale price for a property
 */
export async function trackSalePrice(
  propertyId: number,
  salePrice: number,
  source: string = 'manual'
): Promise<void> {
  try {
    await prisma.propertyPriceHistory.create({
      data: {
        propertyId,
        price: salePrice,
        event: 'sold',
        source,
      }
    })
  } catch (error) {
    console.error('Error tracking sale price:', error)
  }
}

/**
 * Get price history for a property
 */
export async function getPropertyPriceHistory(propertyId: number) {
  return prisma.propertyPriceHistory.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'desc' }
  })
}
