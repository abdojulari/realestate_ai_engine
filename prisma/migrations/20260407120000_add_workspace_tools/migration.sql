-- CreateTable
CREATE TABLE "WorkspaceTool" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'mdi-draw',
    "kind" TEXT NOT NULL DEFAULT 'whiteboard',
    "sceneData" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceTool_adminId_isActive_sortOrder_idx" ON "WorkspaceTool"("adminId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceTool_adminId_slug_key" ON "WorkspaceTool"("adminId", "slug");

-- AddForeignKey
ALTER TABLE "WorkspaceTool" ADD CONSTRAINT "WorkspaceTool_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
