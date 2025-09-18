-- CreateTable
CREATE TABLE "public"."Neighborhood" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Canada',
    "centerLatitude" DOUBLE PRECISION,
    "centerLongitude" DOUBLE PRECISION,
    "boundingBox" JSONB,
    "formattedAddress" TEXT,
    "confidence" INTEGER,
    "components" JSONB,
    "propertyCount" INTEGER NOT NULL DEFAULT 0,
    "averagePrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PropertyNeighborhood" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "neighborhoodId" INTEGER NOT NULL,
    "confidence" INTEGER,
    "lastLookup" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyNeighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Neighborhood_city_province_idx" ON "public"."Neighborhood"("city", "province");

-- CreateIndex
CREATE UNIQUE INDEX "Neighborhood_name_city_province_key" ON "public"."Neighborhood"("name", "city", "province");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyNeighborhood_propertyId_key" ON "public"."PropertyNeighborhood"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyNeighborhood_neighborhoodId_idx" ON "public"."PropertyNeighborhood"("neighborhoodId");

-- AddForeignKey
ALTER TABLE "public"."PropertyNeighborhood" ADD CONSTRAINT "PropertyNeighborhood_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyNeighborhood" ADD CONSTRAINT "PropertyNeighborhood_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "public"."Neighborhood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
