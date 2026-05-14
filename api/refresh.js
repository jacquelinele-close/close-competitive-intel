import { put } from '@vercel/blob'

const COMPETITORS = [
  { id: 'hubspot',     name: 'HubSpot',      category: 'All-in-one CRM + marketing',      pricing: 'Free–$800+/mo'      },
  { id: 'salesforce',  name: 'Salesforce',   category: 'Enterprise CRM',                  pricing: '$25–$500+/user/mo'  },
  { id: 'pipedrive',   name: 'Pipedrive',    category: 'Pipeline-first CRM',              pricing: '$14–$99/user/mo'    },
  { id: 'gohighlevel', name: 'GoHighLevel',  category: 'All-in-one agency/marketing OS',  pricing: '$97–$497/mo flat'   },
  { id: 'zoho',        name: 'Zoho CRM',     category: 'Feature-rich budget CRM',         pricing: 'Free–$52/user/mo'   },
  { id: 'freshsales',  name: 'Freshsales',   category: 'SMB sales CRM',                   pricing: '$9–$59/user/mo'     },
  { id: 'attio',       name: 'Attio',        category: 'AI-native CRM (emerging)',         pricing: '$34–$119/user/mo'   },
]

async function generateBattlecard(comp, apiKey) {
  const prompt = `You are a competitive intelligence analyst for Close CRM (close.com) — a sales-focused CRM with built-in power dialer, SMS, email sequences, and Smart Views. Close's ICP is inside sales teams at SMBs and startups doing high-volume outbound.

Generate a battlecard for ${comp.name} (${comp.category}). Return ONLY a JSON object with these exact keys:
{
  "summary": "2-sentence positioning summary of ${comp.name} vs Close",
  "closeWins": ["3-4 short bullets where Close wins vs ${comp.name}"],
  "compWins": ["2-3 short bullets where ${comp.name} wins vs Close"],
  "keyObjection": "Most common objection reps face when prospect is comparing Close to ${comp.name} (1 sentence)",
  "objectionResponse": "Best response to that objection (2-3 sentences)",
  "recentNews": "Any notable recent product update or market move by ${comp.name} relevant to sales reps (1-2 sentences)",
  "talkingPoint": "One killer differentiator talking point a Close rep can use (1-2 punchy sentences)"
}
Return only valid JSON, no markdown, no explanation.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json()
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Could not parse battlecard for ${comp.name}`)
  return JSON.parse(match[0])
}

export default async function handler(req, res) {
  // Allow manual trigger via POST, or cron trigger
  const isCron = req.headers['x-vercel-cron'] === '1'
  const isManual = req.method === 'POST'

  if (!isCron && !isManual) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'ANTHROPIC_KEY not configured' })

  const results = {}
  const errors = []

  console.log(`Starting cache refresh for ${COMPETITORS.length} competitors...`)

  for (const comp of COMPETITORS) {
    try {
      console.log(`Generating battlecard for ${comp.name}...`)
      const battlecard = await generateBattlecard(comp, ANTHROPIC_KEY)
      results[comp.id] = {
        battlecard,
        generatedAt: new Date().toISOString(),
        competitor: comp
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000))
    } catch (e) {
      console.error(`Failed to generate battlecard for ${comp.name}:`, e.message)
      errors.push({ competitor: comp.name, error: e.message })
    }
  }

  // Save to Vercel Blob
  try {
    const blob = await put('battlecards-cache.json', JSON.stringify({
      data: results,
      refreshedAt: new Date().toISOString(),
      nextRefresh: 'Sunday midnight UTC'
    }), {
      access: 'public', // public URL but content is not sensitive (no CRM data)
      contentType: 'application/json',
      addRandomSuffix: false, // keep same URL every time
    })

    console.log(`Cache saved to: ${blob.url}`)

    return res.status(200).json({
      success: true,
      cached: Object.keys(results).length,
      errors,
      blobUrl: blob.url,
      refreshedAt: new Date().toISOString()
    })
  } catch (e) {
    return res.status(500).json({ error: `Failed to save cache: ${e.message}`, partial: results })
  }
}
