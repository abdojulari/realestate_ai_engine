import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { sendEmail } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const { subject, comps, stats, methodology, clientEmail, clientName, action } = body

  if (!subject || !comps || !stats) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required data for report generation'
    })
  }

  // Generate HTML report
  const reportHtml = generateReportHtml(subject, comps, stats, methodology, clientName)
  
  if (action === 'send' && clientEmail) {
    // Send email with report using the existing email utility
    const emailSubject = `Comparative Market Analysis - ${subject.address || 'Your Property'}`
    
    const sent = await sendEmail({
      to: clientEmail,
      subject: emailSubject,
      html: reportHtml
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

function generateReportHtml(
  subject: any, 
  comps: any[], 
  stats: any, 
  methodology: any,
  clientName?: string
): string {
  const formatCurrency = (value: number) => {
    if (!value) return '$0'
    return '$' + value.toLocaleString()
  }

  const formatDate = (value: string) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-CA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const topComps = comps.slice(0, 10)

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
    .header .subtitle { opacity: 0.8; font-size: 14px; }
    .section { padding: 30px 40px; border-bottom: 1px solid #eee; }
    .section-title { 
      font-size: 18px; 
      font-weight: 600; 
      color: #1a1a2e;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
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
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
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
        ${clientName ? `Prepared for: ${clientName}` : ''}<br>
        Report Generated: ${formatDate(new Date().toISOString())}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Subject Property</div>
      <p style="margin-bottom: 20px; font-size: 16px; color: #1a1a2e;">
        <strong>${subject.address || 'Address not specified'}</strong><br>
        ${subject.city || ''}, ${subject.province || ''}
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
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="label">Comps Analyzed</div>
          <div class="value">${stats.count}</div>
        </div>
        <div class="stat-item">
          <div class="label">Avg Sale Price</div>
          <div class="value">${formatCurrency(stats.avgPrice)}</div>
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
    </div>

    <div class="section">
      <div class="section-title">Comparable Properties</div>
      <table>
        <thead>
          <tr>
            <th>Address</th>
            <th>Price</th>
            <th>Beds/Baths</th>
            <th>Sqft</th>
            <th>Match</th>
            <th>Distance</th>
          </tr>
        </thead>
        <tbody>
          ${topComps.map(comp => `
            <tr>
              <td>${comp.title || comp.address || '—'}</td>
              <td>${formatCurrency(comp.price)}</td>
              <td>${comp.beds || 0} / ${comp.baths || 0}</td>
              <td>${comp.sqft ? comp.sqft.toLocaleString() : '—'}</td>
              <td>
                <span class="match-badge ${comp.matchScore >= 70 ? 'match-high' : comp.matchScore >= 50 ? 'match-medium' : 'match-low'}">
                  ${comp.matchScore}%
                </span>
              </td>
              <td>${comp.distanceKm ? comp.distanceKm.toFixed(1) + ' km' : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Methodology</div>
      <div class="methodology">
        <p><strong>${methodology?.description || 'Comparative Market Analysis based on recently sold properties'}</strong></p>
        <ul>
          ${(methodology?.matchCriteria || [
            'Feature matching (40% weight)',
            'Bedroom count similarity (15% weight)',
            'Bathroom count similarity (15% weight)',
            'Square footage similarity (30% weight)'
          ]).map((c: string) => `<li>${c}</li>`).join('')}
        </ul>
        <p style="margin-top: 15px;">
          <strong>Analysis Parameters:</strong><br>
          • Minimum match threshold: ${methodology?.filters?.minMatchScore || 20}%<br>
          • Search radius: ${methodology?.filters?.radiusKm || 5} km<br>
          • Date range: ${methodology?.filters?.dateRange || 'Last 90 days'}
        </p>
      </div>
      <div class="disclaimer">
        <strong>Disclaimer:</strong> This Comparative Market Analysis is an estimate based on comparable sold properties 
        and should not be considered as an appraisal. Market conditions, property specifics, and other factors 
        may affect the actual selling price. We recommend consulting with a licensed appraiser for official valuations.
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

