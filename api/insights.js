export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { competitor, type, leadSummaries } = req.body
  const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY

  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'ANTHROPIC_KEY not configured' })

  // If leadSummaries provided, skip to Claude synthesis
  if (!leadSummaries || leadSummaries.length === 0) {
    return res.status(200).json({ insights: null, message: 'No lead data provided' })
  }

  try {
    const prompt = `You are analyzing Close CRM data to generate competitive intelligence insights.

Competitor: ${competitor}
Signal type: ${type === 'wins' ? 'WINS — customers who came FROM ' + competitor + ' and stayed with Close (status: Customer)' : 'LOSSES — customers who LEFT Close FOR ' + competitor + ' (status: Canceled)'}

Here are real lead summaries from Close CRM including cancellation notes, call transcripts, emails, and support tickets:

${leadSummaries.map((l, i) => `--- Lead ${i + 1}: ${l.name} ---\n${l.summary}`).join('\n\n')}

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
    if (!match) return res.status(200).json({ insights: null, rawText: text })

    return res.status(200).json({ insights: JSON.parse(match[0]) })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
