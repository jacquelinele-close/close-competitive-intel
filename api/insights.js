export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { competitor, type } = req.body
  // type = 'wins' | 'losses'

  const CLOSE_KEY = process.env.CLOSE_API_KEY
  const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY

  if (!CLOSE_KEY) return res.status(500).json({ error: 'CLOSE_API_KEY not configured' })

  const authHeader = `Basic ${Buffer.from(CLOSE_KEY + ':').toString('base64')}`
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // Build the right search query based on wins vs losses
    let searchQuery
    if (type === 'wins') {
      searchQuery = `customers who imported from ${competitor} CRM and are current paying customers status Customer`
    } else {
      searchQuery = `canceled customers in the last 12 months who left for ${competitor} as competitor`
    }

    // Search Close for matching leads
    const searchRes = await fetch('https://api.close.com/api/v1/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({
        query: {
          type: 'and',
          queries: [
            { type: 'text', query: competitor },
            {
              type: 'field_condition',
              field: { type: 'regular_field', field_name: 'status_label' },
              condition: {
                type: 'text',
                mode: 'full_words',
                value: type === 'wins' ? 'Customer' : 'Canceled'
              }
            }
          ]
        },
        results_limit: 8,
        cursor: null,
      }),
    })

    const searchData = await searchRes.json()
    const leadIds = (searchData.results || []).map(r => r.id).slice(0, 8)

    if (leadIds.length === 0) {
      return res.status(200).json({ insights: null, leads: [], message: 'No matching leads found' })
    }

    // Fetch full lead details for each
    const leadDetails = await Promise.all(
      leadIds.map(async id => {
        const r = await fetch(`https://api.close.com/api/v1/lead/${id}/`, {
          headers: { 'Authorization': authHeader }
        })
        const d = await r.json()
        // Extract the most relevant summary text
        const summaries = d.display_name ? [] : (d.summaries || [])
        return {
          id,
          name: d.display_name || d.name || id,
          status: d.status_label,
          url: d.url,
          summary: summaries.slice(0, 6).join('\n\n').substring(0, 3000)
        }
      })
    )

    // Now synthesize with Claude
    const prompt = `You are analyzing Close CRM data to generate competitive intelligence insights.

Competitor: ${competitor}
Signal type: ${type === 'wins' ? 'WINS — customers who came FROM ' + competitor + ' and stayed with Close' : 'LOSSES — customers who LEFT Close FOR ' + competitor}

Here are the real lead summaries from Close CRM (including cancellation notes, call transcripts, emails, and support tickets):

${leadDetails.map((l, i) => `--- Lead ${i + 1}: ${l.name} ---\n${l.summary}`).join('\n\n')}

Based on this real data, generate a JSON response with:
{
  "topThemes": ["3-4 specific recurring themes you spotted, with evidence"],
  "keyQuote": "The single most revealing quote or data point from the leads above (cite which company)",
  "repAdvice": "1-2 sentence advice for a sales rep based on these patterns",
  "leadSnippets": [
    { "company": "company name", "insight": "1 sentence specific insight from their data", "signal": "win or loss" }
  ]
}

Be specific — use actual company names, actual feature names mentioned, actual reasons. Do not generalize. Return only valid JSON.`

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
    if (!match) return res.status(200).json({ insights: null, leads: leadDetails, rawText: text })

    const insights = JSON.parse(match[0])
    return res.status(200).json({ insights, leads: leadDetails.map(l => ({ name: l.name, url: `https://app.close.com/lead/${l.id}/` })) })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
