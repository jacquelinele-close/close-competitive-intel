export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { competitor, type } = req.body
  const CLOSE_KEY = process.env.CLOSE_API_KEY
  const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY

  if (!CLOSE_KEY) return res.status(500).json({ error: 'CLOSE_API_KEY not configured' })

  const authHeader = `Basic ${Buffer.from(CLOSE_KEY + ':').toString('base64')}`

  try {
    // Use the simple leads search API which we know works
    const statusFilter = type === 'wins' ? 'Customer' : 'Canceled'
    const searchUrl = `https://api.close.com/api/v1/lead/?query=${encodeURIComponent(competitor)}&_fields=id,display_name,name,status_label,url&_limit=25`

    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': authHeader }
    })

    const searchData = await searchRes.json()
    const allLeads = searchData.data || []

    // Filter by correct status
    const filteredLeads = allLeads.filter(l => l.status_label === statusFilter).slice(0, 8)

    if (filteredLeads.length === 0) {
      return res.status(200).json({
        insights: null,
        leads: [],
        message: `No ${statusFilter} leads found mentioning ${competitor} — try refreshing or check that your Close API key has read access.`
      })
    }

    // Fetch full lead details for each match
    const leadDetails = await Promise.all(
      filteredLeads.map(async lead => {
        try {
          const r = await fetch(`https://api.close.com/api/v1/lead/${lead.id}/`, {
            headers: { 'Authorization': authHeader }
          })
          const d = await r.json()
          const summaries = d.summaries || []
          return {
            id: lead.id,
            name: d.name || lead.name || lead.display_name || lead.id,
            status: lead.status_label,
            summary: summaries.slice(0, 5).join('\n\n').substring(0, 2500)
          }
        } catch {
          return { id: lead.id, name: lead.name || lead.id, status: lead.status_label, summary: '' }
        }
      })
    )

    const validLeads = leadDetails.filter(l => l.summary.length > 50)

    if (validLeads.length === 0) {
      return res.status(200).json({
        insights: null,
        leads: filteredLeads.map(l => ({ name: l.name || l.display_name, url: `https://app.close.com/lead/${l.id}/` })),
        message: 'Leads found but no detailed activity data available.'
      })
    }

    // Synthesize with Claude
    const prompt = `You are analyzing Close CRM data to generate competitive intelligence insights.

Competitor: ${competitor}
Signal type: ${type === 'wins' ? 'WINS — customers who came FROM ' + competitor + ' and stayed with Close (status: Customer)' : 'LOSSES — customers who LEFT Close FOR ' + competitor + ' (status: Canceled)'}

Here are real lead summaries from Close CRM including cancellation notes, call transcripts, emails, and support tickets:

${validLeads.map((l, i) => `--- Lead ${i + 1}: ${l.name} ---\n${l.summary}`).join('\n\n')}

Based on this real data, return ONLY a JSON object:
{
  "topThemes": ["3-4 specific recurring themes with evidence from the data above"],
  "keyQuote": "The single most revealing quote or data point (cite which company it came from)",
  "repAdvice": "1-2 sentence actionable advice for a Close sales rep based on these patterns",
  "leadSnippets": [
    { "company": "exact company name from data", "insight": "1 specific insight from their data", "signal": "${type === 'wins' ? 'win' : 'loss'}" }
  ]
}

Be specific — use actual company names, actual features mentioned, actual cancellation reasons. Do not generalize. Return only valid JSON, no markdown.`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const claudeData = await claudeRes.json()
    const text = (claudeData.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
    const match = text.match(/\{[\s\S]*\}/)

    if (!match) return res.status(200).json({ insights: null, leads: validLeads.map(l => ({ name: l.name, url: `https://app.close.com/lead/${l.id}/` })), rawText: text })

    const insights = JSON.parse(match[0])
    return res.status(200).json({
      insights,
      leads: validLeads.map(l => ({ name: l.name, url: `https://app.close.com/lead/${l.id}/` }))
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
