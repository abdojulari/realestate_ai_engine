-- Bookkeeping models (BkExpense, BkRevenue, BkEmployee, BkPayrollPayment) were in schema but had no migration; APIs failed with P2021 until applied.

-- CreateTable
CREATE TABLE "BkExpense" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "vendor" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "receiptUrl" TEXT,
    "paymentMethod" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "ocrRawData" JSONB,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BkExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BkRevenue" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "listingId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'commission',
    "description" TEXT,
    "clientName" TEXT,
    "invoiceNumber" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BkRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BkEmployee" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "salaryType" TEXT NOT NULL DEFAULT 'hourly',
    "hourlyRate" DOUBLE PRECISION,
    "fixedSalary" DOUBLE PRECISION,
    "province" TEXT NOT NULL DEFAULT 'AB',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSelf" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BkEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BkPayrollPayment" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "employeeId" INTEGER NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "cppDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eiDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incomeTaxDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BkPayrollPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BkExpense_adminId_date_idx" ON "BkExpense"("adminId", "date");

-- CreateIndex
CREATE INDEX "BkExpense_adminId_category_idx" ON "BkExpense"("adminId", "category");

-- CreateIndex
CREATE INDEX "BkRevenue_adminId_date_idx" ON "BkRevenue"("adminId", "date");

-- CreateIndex
CREATE INDEX "BkRevenue_adminId_category_idx" ON "BkRevenue"("adminId", "category");

-- CreateIndex
CREATE INDEX "BkEmployee_adminId_isActive_idx" ON "BkEmployee"("adminId", "isActive");

-- CreateIndex
CREATE INDEX "BkPayrollPayment_adminId_payDate_idx" ON "BkPayrollPayment"("adminId", "payDate");

-- CreateIndex
CREATE INDEX "BkPayrollPayment_employeeId_idx" ON "BkPayrollPayment"("employeeId");

-- AddForeignKey
ALTER TABLE "BkExpense" ADD CONSTRAINT "BkExpense_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BkRevenue" ADD CONSTRAINT "BkRevenue_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BkEmployee" ADD CONSTRAINT "BkEmployee_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BkPayrollPayment" ADD CONSTRAINT "BkPayrollPayment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BkPayrollPayment" ADD CONSTRAINT "BkPayrollPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "BkEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
