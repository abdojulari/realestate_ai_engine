import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const {
      employeeId,
      payDate,
      periodStart,
      periodEnd,
      hoursWorked,
      grossAmount,
      cppDeduction,
      eiDeduction,
      incomeTaxDeduction,
      otherDeductions,
      netAmount,
      notes,
    } = body

    if (!employeeId || !payDate || grossAmount === undefined || netAmount === undefined) {
      throw createError({
        statusCode: 400,
        message: 'employeeId, payDate, grossAmount, and netAmount are required',
      })
    }

    const employee = await prisma.bkEmployee.findUnique({
      where: { id: parseInt(employeeId) },
    })
    if (!employee) {
      throw createError({ statusCode: 404, message: 'Employee not found' })
    }

    const payment = await prisma.bkPayrollPayment.create({
      data: {
        employeeId: parseInt(employeeId),
        payDate: new Date(payDate),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        grossAmount: parseFloat(grossAmount),
        cppDeduction: cppDeduction ? parseFloat(cppDeduction) : 0,
        eiDeduction: eiDeduction ? parseFloat(eiDeduction) : 0,
        incomeTaxDeduction: incomeTaxDeduction ? parseFloat(incomeTaxDeduction) : 0,
        otherDeductions: otherDeductions ? parseFloat(otherDeductions) : 0,
        netAmount: parseFloat(netAmount),
        notes: notes || null,
        adminId: getAdminIdForCreate(user),
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    })

    return { success: true, payment }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})
