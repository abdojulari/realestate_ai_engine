import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'
import { sendEmail } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdmin(event)
  const adminId = adminUser.role === 'super_admin' || adminUser.role === 'admin'
    ? adminUser.id
    : adminUser.adminId ?? null

  // Check license for CMA report feature
  await requireFeature(FEATURES.CMA_REPORT, event)

  const body = await readBody(event)
  const { subject, comps, stats, methodology, clientEmail, clientName, action } = body

  if (!subject || !comps || !stats) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required data for report generation'
    })
  }

  // Generate HTML report
  const reportHtml = generateReportHtml(subject, comps, stats, methodology, clientName, body.statusBreakdown, body.statusStats)
  
  if (action === 'send' && clientEmail) {
    // Send email with report using the existing email utility
    // Comprehensive framing — never say "Sold" alone. Sale + active + pending
    // + expired + terminated + withdrawn all feed into this analysis.
    const emailSubject = `Comparative Market Analysis - ${subject.address || 'Your Property'}`

    const sent = await sendEmail({
      to: clientEmail,
      subject: emailSubject,
      html: reportHtml,
      adminId,
    })
    
    if (!sent) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send email. Please check email configuration.'
      })
    }
    
    return { 
      success: true, 
      message: `Report sent successfully to ${clientEmail}` 
    }
  }

  // Return report data for download/preview
  return {
    success: true,
    reportHtml,
    reportData: {
      generatedAt: new Date().toISOString(),
      subject,
      comps: comps.slice(0, 10), // Top 10 comps
      stats,
      methodology
    }
  }
})

const STATUS_LABEL: Record<string, string> = {
  sold: 'Sold',
  for_sale: 'Active',
  pending: 'Pending',
  expired: 'Expired',
  terminated: 'Terminated',
  withdrawn: 'Withdrawn',
}

// Color scheme for status badges — kept colour-neutral enough for both light
// and dark email clients.
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  sold: { bg: '#d4edda', fg: '#155724' },        // green — closed sale
  pending: { bg: '#cce5ff', fg: '#004085' },     // blue — under contract
  for_sale: { bg: '#fff3cd', fg: '#856404' },    // amber — currently asking
  expired: { bg: '#f5c6cb', fg: '#721c24' },     // muted red — failed to sell
  terminated: { bg: '#e2e3e5', fg: '#383d41' },  // neutral grey
  withdrawn: { bg: '#e2e3e5', fg: '#383d41' },   // neutral grey
}

function generateReportHtml(
  subject: any,
  comps: any[],
  stats: any,
  methodology: any,
  clientName?: string,
  statusBreakdown?: Record<string, number>,
  statusStats?: Record<string, { count: number; avgPrice: number; medianPrice: number }>,
): string {
  const formatCurrency = (value: number) => {
    if (!value) return '$0'
    return '$' + value.toLocaleString()
  }

  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return '—'
    const d = value instanceof Date ? value : new Date(value)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const topComps = comps.slice(0, 10)

  // Derive a breakdown from comps if the caller didn't supply one (back-compat
  // with older request bodies that pre-date the comprehensive refactor).
  const resolvedBreakdown: Record<string, number> =
    statusBreakdown && Object.keys(statusBreakdown).length > 0
      ? statusBreakdown
      : (() => {
          const out: Record<string, number> = {}
          for (const c of comps) {
            const s = (c?.status as string) || 'sold'
            out[s] = (out[s] || 0) + 1
          }
          return out
        })()

  const breakdownEntries = Object.entries(resolvedBreakdown).filter(([, n]) => n > 0)
  const totalComps = breakdownEntries.reduce((a, [, n]) => a + n, 0)

  const neighbourhoodComps = comps.filter(c => c.inSameNeighbourhood).length
  const community = methodology?.filters?.community || subject?.community || ''

  const FALLBACK_COLOR = { bg: '#e2e3e5', fg: '#383d41' }
  const statusBadge = (status: string) => {
    const label = STATUS_LABEL[status] || status
    const c = STATUS_COLORS[status] || STATUS_COLORS.for_sale || FALLBACK_COLOR
    return `<span class="status-badge" style="background:${c.bg};color:${c.fg};">${label}</span>`
  }

  // Build the per-status summary row ("Sold: 5 · Active: 3 · Pending: 2 …")
  const breakdownHtml = breakdownEntries.length > 0
    ? `
      <div class="status-breakdown">
        ${breakdownEntries.map(([s, n]) => `
          <div class="status-breakdown-item">
            ${statusBadge(s)}
            <div class="status-breakdown-count">${n}</div>
          </div>
        `).join('')}
      </div>
    `
    : ''

  // Per-status averages table — shows the listing/sold spread story.
  const statusStatsHtml = statusStats && Object.keys(statusStats).length > 0
    ? `
      <div class="section-subtitle">Average Price by Status</div>
      <table class="status-stats-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Count</th>
            <th>Average Price</th>
            <th>Median Price</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(statusStats).map(([s, v]) => `
            <tr>
              <td>${statusBadge(s)}</td>
              <td>${v.count}</td>
              <td>${formatCurrency(v.avgPrice)}</td>
              <td>${formatCurrency(v.medianPrice)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : ''

  // Listing-vs-final summary — only meaningful for closed sales.
  const listVsFinalHtml = stats?.avgListVsFinalDelta != null
    ? `
      <div class="list-vs-final-callout">
        <strong>Listing-to-sale spread:</strong>
        Closed sales in this set went for an average of
        <strong>${stats.avgListVsFinalDelta > 0 ? '+' : ''}${stats.avgListVsFinalDelta}%</strong>
        ${stats.avgListVsFinalDelta > 0 ? 'over' : 'under'} their original asking price.
      </div>
    `
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Comparative Market Analysis Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333;
      background: #f5f5f5;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white; 
      padding: 40px; 
      text-align: center;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header .subtitle { opacity: 0.85; font-size: 14px; }
    .header .scope { opacity: 0.7; font-size: 12px; margin-top: 8px; }
    .section { padding: 30px 40px; border-bottom: 1px solid #eee; }
    .section-title { 
      font-size: 18px; 
      font-weight: 600; 
      color: #1a1a2e;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
    }
    .section-subtitle {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a2e;
      margin-top: 24px;
      margin-bottom: 10px;
    }
    .subject-grid { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      gap: 15px; 
    }
    .subject-item { 
      background: #f8f9fa; 
      padding: 15px; 
      border-radius: 8px;
      text-align: center;
    }
    .subject-item .label { 
      font-size: 12px; 
      color: #666; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .subject-item .value { 
      font-size: 24px; 
      font-weight: 600; 
      color: #1a1a2e;
    }
    .neighbourhood-pill {
      display: inline-block;
      background: #e7f1ff;
      color: #0d47a1;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
    .valuation-box { 
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      margin: 20px 0;
    }
    .valuation-box .estimated { font-size: 14px; opacity: 0.9; }
    .valuation-box .price { font-size: 42px; font-weight: 700; margin: 10px 0; }
    .valuation-box .range { font-size: 14px; opacity: 0.9; }
    .valuation-box .basis { font-size: 12px; opacity: 0.8; margin-top: 8px; }
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 15px;
      margin-top: 20px;
    }
    .stat-item { 
      background: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px;
      text-align: center;
    }
    .stat-item .label { font-size: 11px; color: #666; text-transform: uppercase; }
    .stat-item .value { font-size: 18px; font-weight: 600; color: #1a1a2e; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { 
      background: #f8f9fa; 
      padding: 12px; 
      text-align: left; 
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
    }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
    .match-badge { 
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .match-high { background: #d4edda; color: #155724; }
    .match-medium { background: #fff3cd; color: #856404; }
    .match-low { background: #f8d7da; color: #721c24; }
    .status-badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .status-breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 16px 0 8px;
    }
    .status-breakdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8f9fa;
      padding: 8px 14px;
      border-radius: 999px;
    }
    .status-breakdown-count {
      font-weight: 700;
      color: #1a1a2e;
    }
    .status-stats-table th, .status-stats-table td {
      font-size: 12px;
    }
    .price-stack { line-height: 1.35; }
    .price-stack .final { font-weight: 600; color: #1a1a2e; }
    .price-stack .list { font-size: 11px; color: #666; }
    .price-stack .delta-up { color: #155724; font-size: 11px; }
    .price-stack .delta-down { color: #721c24; font-size: 11px; }
    .neighbourhood-cell {
      font-size: 11px;
      color: #0d47a1;
      font-weight: 600;
      margin-top: 2px;
    }
    .list-vs-final-callout {
      background: #f1f8ff;
      border-left: 4px solid #0d47a1;
      padding: 14px 18px;
      border-radius: 6px;
      margin-top: 20px;
      font-size: 13px;
      color: #0d3a5c;
    }
    .methodology { 
      background: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px;
      font-size: 13px;
    }
    .methodology ul { margin-left: 20px; margin-top: 10px; }
    .methodology li { margin-bottom: 5px; }
    .footer { 
      padding: 30px 40px; 
      text-align: center; 
      color: #666;
      font-size: 12px;
    }
    .disclaimer { 
      background: #fff3cd; 
      padding: 15px; 
      border-radius: 8px;
      font-size: 11px;
      color: #856404;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Comparative Market Analysis</h1>
      <div class="subtitle">
        ${clientName ? `Prepared for: ${clientName}<br>` : ''}
        Report Generated: ${formatDate(new Date().toISOString())}
      </div>
      <div class="scope">
        Comprehensive analysis &mdash; sold, active, pending, expired, terminated and withdrawn comparables
      </div>
    </div>

    <div class="section">
      <div class="section-title">Subject Property</div>
      <p style="margin-bottom: 20px; font-size: 16px; color: #1a1a2e;">
        <strong>${subject.address || 'Address not specified'}</strong><br>
        ${subject.city || ''}${community ? ` &middot; <span class="neighbourhood-pill">${community}</span>` : ''}${subject.province ? `, ${subject.province}` : ''}
      </p>
      <div class="subject-grid">
        <div class="subject-item">
          <div class="label">Bedrooms</div>
          <div class="value">${subject.beds || '—'}</div>
        </div>
        <div class="subject-item">
          <div class="label">Bathrooms</div>
          <div class="value">${subject.baths || '—'}</div>
        </div>
        <div class="subject-item">
          <div class="label">Square Feet</div>
          <div class="value">${subject.sqft ? subject.sqft.toLocaleString() : '—'}</div>
        </div>
      </div>
      ${subject.features && subject.features.length > 0 ? `
        <p style="margin-top: 20px;"><strong>Key Features:</strong> ${subject.features.join(', ')}</p>
      ` : ''}
    </div>

    <div class="section">
      <div class="section-title">Market Valuation</div>
      <div class="valuation-box">
        <div class="estimated">Estimated Market Value</div>
        <div class="price">${formatCurrency(stats.estimatedValue)}</div>
        <div class="range">
          Suggested Range: ${formatCurrency(stats.priceRange?.low)} - ${formatCurrency(stats.priceRange?.high)}
        </div>
        <div class="basis">
          Based on ${totalComps || stats.count} comparable propert${(totalComps || stats.count) === 1 ? 'y' : 'ies'}${community ? ` in and around <strong>${community}</strong>` : ''} &middot; weighted by status confidence
        </div>
      </div>
      ${breakdownHtml}
      <div class="stats-grid">
        <div class="stat-item">
          <div class="label">Comparables</div>
          <div class="value">${stats.count}</div>
        </div>
        <div class="stat-item">
          <div class="label">In Neighbourhood</div>
          <div class="value">${neighbourhoodComps}</div>
        </div>
        <div class="stat-item">
          <div class="label">Median Price</div>
          <div class="value">${formatCurrency(stats.medianPrice)}</div>
        </div>
        <div class="stat-item">
          <div class="label">Avg $/Sqft</div>
          <div class="value">${formatCurrency(stats.avgPricePerSqft)}</div>
        </div>
      </div>
      ${statusStatsHtml}
      ${listVsFinalHtml}
    </div>

    <div class="section">
      <div class="section-title">Comparable Properties</div>
      <p style="font-size: 12px; color: #666; margin-bottom: 8px;">
        Showing sold, active, pending, expired, terminated and withdrawn listings ranked by neighbourhood, status confidence and similarity to your home.
      </p>
      <table>
        <thead>
          <tr>
            <th>Address</th>
            <th>Status</th>
            <th>Price</th>
            <th>Beds/Baths</th>
            <th>Sqft</th>
            <th>Match</th>
            <th>Distance</th>
          </tr>
        </thead>
        <tbody>
          ${topComps.map(comp => {
            const status = (comp.status as string) || 'sold'
            const listingPrice = comp.listingPrice
            const showList = listingPrice && comp.price && listingPrice !== comp.price
            const deltaStr = comp.listVsFinalDelta != null
              ? `<div class="${comp.listVsFinalDelta >= 0 ? 'delta-up' : 'delta-down'}">${comp.listVsFinalDelta >= 0 ? '+' : ''}${comp.listVsFinalDelta}% vs list</div>`
              : ''
            return `
            <tr>
              <td>
                <div>${comp.title || comp.address || '—'}</div>
                ${comp.city ? `<div style="font-size: 11px; color: #666;">${comp.city}</div>` : ''}
                ${comp.inSameNeighbourhood ? `<div class="neighbourhood-cell">Same neighbourhood</div>` : ''}
              </td>
              <td>${statusBadge(status)}</td>
              <td>
                <div class="price-stack">
                  <div class="final">${formatCurrency(comp.price)}</div>
                  ${showList ? `<div class="list">Listed: ${formatCurrency(listingPrice)}</div>` : ''}
                  ${showList ? deltaStr : ''}
                </div>
              </td>
              <td>${comp.beds || 0} / ${comp.baths || 0}</td>
              <td>${comp.sqft ? comp.sqft.toLocaleString() : '—'}</td>
              <td>
                <span class="match-badge ${comp.matchScore >= 70 ? 'match-high' : comp.matchScore >= 50 ? 'match-medium' : 'match-low'}">
                  ${comp.matchScore}%
                </span>
              </td>
              <td>${comp.distanceKm ? comp.distanceKm.toFixed(1) + ' km' : '—'}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Methodology</div>
      <div class="methodology">
        <p><strong>${methodology?.description || 'Comprehensive Comparative Market Analysis based on sold, active, pending, expired, terminated and withdrawn listings.'}</strong></p>
        <ul>
          ${(methodology?.matchCriteria || [
            'Neighbourhood match (highest weight when community is set)',
            'Feature matching',
            'Bedroom count similarity',
            'Bathroom count similarity',
            'Square footage similarity',
            'Sold transactions weighted highest, then pending, then active, then expired/terminated/withdrawn',
          ]).map((c: string) => `<li>${c}</li>`).join('')}
        </ul>
        <p style="margin-top: 15px;">
          <strong>Why include more than just sold?</strong><br>
          A "Sold-only" CMA is a quick comp pull. A comprehensive CMA blends closed sales (the strongest price evidence) with currently-listed asks (active), firm contracts that will close soon (pending), and listings that came off the market without selling (expired, terminated, withdrawn). Together they reveal the true negotiating window in this neighbourhood, not just historical close prices.
        </p>
        <p style="margin-top: 15px;">
          <strong>Analysis Parameters:</strong><br>
          • Minimum match threshold: ${methodology?.filters?.minMatchScore || 20}%<br>
          • Search radius: ${methodology?.filters?.radiusKm || 5} km<br>
          • Date range: ${methodology?.filters?.dateRange || 'Last 90 days'}<br>
          • Neighbourhood / community: ${methodology?.filters?.community || '— (radius only)'}
        </p>
      </div>
      <div class="disclaimer">
        <strong>Disclaimer:</strong> This Comparative Market Analysis is an estimate based on comparable properties
        across multiple listing statuses (sold, active, pending, expired, terminated, withdrawn) and should not be
        considered an appraisal. Expired, terminated and withdrawn listings reflect <em>unsold</em> asking prices and
        are weighted accordingly. Market conditions, property specifics, and other factors may affect the actual
        selling price. We recommend consulting with a licensed appraiser for official valuations.
      </div>
    </div>

    <div class="footer">
      <p>This report was generated by the CMA Tool</p>
      <p>© ${new Date().getFullYear()} Real Estate Services</p>
    </div>
  </div>
</body>
</html>
`
}
