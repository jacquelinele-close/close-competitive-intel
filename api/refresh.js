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

Before generating the battlecard, search the following sources for current intelligence on ${comp.name}:
1. G2 reviews — search "site:g2.com ${comp.name} reviews" to find what real users say, common complaints, and pros/cons
2. Reddit discussions — search "reddit ${comp.name} CRM" to find unfiltered honest opinions from sales/ops people
3. LinkedIn — search "${comp.name} CRM" for recent product announcements, feature launches, and executive posts
4. General web — any recent news, pricing changes, or product updates about ${comp.name}

Use what you find to make the battlecard as specific and current as possible. Quote or reference real user sentiment where relevant.

Generate a battlecard for ${comp.name} (${comp.category}). Return ONLY a JSON object with these exact keys:
{
  "summary": "2-sentence positioning summary of ${comp.name} vs Close, grounded in current market reality",
  "closeWins": ["3-4 short bullets where Close wins vs ${comp.name}, based on real user feedback and reviews"],
  "compWins": ["2-3 short bullets where ${comp.name} wins vs Close, based on real user feedback"],
  "keyObjection": "Most common objection reps face when prospect is comparing Close to ${comp.name}, based on what real users say online (1 sentence)",
  "objectionResponse": "Best response to that objection (2-3 sentences)",
  "recentNews": "Specific recent product update, pricing change, or market move by ${comp.name} found during research (1-2 sentences, include approximate date if known)",
  "talkingPoint": "One killer differentiator talking point a Close rep can use, ideally referencing something real users complain about with ${comp.name} (1-2 punchy sentences)",
  "redditSentiment": "1 sentence summary of what Reddit/community forums say about ${comp.name} — the unfiltered take",
  "g2Score": "Current G2 rating and number of reviews if found, otherwise null"
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
