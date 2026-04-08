/**
 * Live Verdocs check: client_credentials auth + minimal envelope (tiny PDF).
 * Loads .env from project root. Does not print secrets.
 *
 *   pnpm run verdocs:smoke
 */
import 'dotenv/config'
import { PDFDocument } from 'pdf-lib'
import { normalizePdfBufferForVerdocs } from '../server/utils/pdfNormalize'
import { resolveVerdocsApiBase } from '../server/utils/verdocs'

const SIGNER_EMAIL =
  (process.env.VERDOCS_SMOKE_SIGNER_EMAIL || 'verdocs-smoke-signer@example.com').trim() || 'verdocs-smoke-signer@example.com'

async function main() {
  const clientId = (process.env.VERDOCS_CLIENT_ID || '').trim()
  const clientSecret = (process.env.VERDOCS_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret) {
    console.error('Missing VERDOCS_CLIENT_ID or VERDOCS_CLIENT_SECRET in .env')
    process.exit(1)
  }

  const base = resolveVerdocsApiBase().replace(/\/$/, '')
  console.log('Verdocs API base:', base)

  const tokenRes = await fetch(`${base}/v2/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': clientId,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as Record<string, unknown>
  if (!tokenRes.ok) {
    console.error('Auth failed HTTP', tokenRes.status, JSON.stringify(tokenJson).slice(0, 500))
    process.exit(2)
  }
  const accessToken = tokenJson.access_token as string | undefined
  if (!accessToken) {
    console.error('Auth response missing access_token')
    process.exit(2)
  }
  console.log('Auth OK (bearer length:', accessToken.length, ')')

  const doc = await PDFDocument.create()
  doc.addPage([612, 792])
  const rawPdf = Buffer.from(
    await doc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    })
  )
  const pdfBytes = await normalizePdfBufferForVerdocs(rawPdf)

  const W = { signature: 216, initial: 108, timestamp: 120, textbox: 200 }
  const H = { signature: 86, initial: 86, timestamp: 40, textbox: 22 }

  const envelopeBody = {
    name: `Cursor smoke ${new Date().toISOString()}`,
    sender_name: 'Smoke Test',
    sender_email: 'smoke-sender@example.com',
    initial_reminder: 0,
    followup_reminders: 0,
    no_contact: true,
    data: { source: 'scripts/verdocs-live-smoke.ts' },
    recipients: [
      {
        type: 'signer' as const,
        role_name: 'Signer_1',
        first_name: 'Smoke',
        last_name: 'Signer',
        email: SIGNER_EMAIL,
        sequence: 1,
        order: 1,
        delegator: false,
      },
    ],
    documents: [
      {
        data: pdfBytes.toString('base64'),
        name: 'smoke-test',
        mime: 'application/pdf',
      },
    ],
    fields: [
      {
        document_id: 0,
        name: 'sig_Signer_1',
        role_name: 'Signer_1',
        type: 'signature' as const,
        page: 1,
        x: 152,
        y: 640,
        width: W.signature,
        height: H.signature,
        required: true,
        label: 'Sign',
      },
    ],
  }

  const envRes = await fetch(`${base}/v2/envelopes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Client-ID': clientId,
    },
    body: JSON.stringify(envelopeBody),
  })
  const envJson = (await envRes.json().catch(() => ({}))) as Record<string, unknown>
  if (!envRes.ok) {
    console.error('createEnvelope failed HTTP', envRes.status, JSON.stringify(envJson).slice(0, 800))
    process.exit(3)
  }
  console.log('createEnvelope OK id:', envJson.id, 'status:', envJson.status)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(99)
})
