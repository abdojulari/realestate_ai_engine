import { defineEventHandler, readBody } from 'h3'
import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ firstName:string; lastName:string; email:string; phone?:string; message:string }>(event)

  const runtime = useRuntimeConfig()

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOSTNAME || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    }
  })

  const from = process.env.SMTP_SENDER || process.env.SMTP_USERNAME

  await transporter.sendMail({
    from,
    to: process.env.SMTP_USERNAME,
    subject: `Website Contact: ${body.firstName} ${body.lastName}`,
    text: `${body.message}\n\nFrom: ${body.firstName} ${body.lastName}\nEmail: ${body.email}\nPhone: ${body.phone || ''}`
  })

  return { ok: true }
})


