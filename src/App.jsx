import { useState, useRef, useEffect } from 'react'

// Global cache store - shared across all battlecard views
const globalCache = { battlecards: null, loadedAt: null }

const COMPETITORS = [
  { id: 'hubspot',     name: 'HubSpot',      tier: 1, category: 'All-in-one CRM + marketing',      pricing: 'Free–$800+/mo',         icp: 'SMB to mid-market'          },
  { id: 'salesforce',  name: 'Salesforce',   tier: 1, category: 'Enterprise CRM',                  pricing: '$25–$500+/user/mo',      icp: 'Mid-market to enterprise'   },
  { id: 'pipedrive',   name: 'Pipedrive',    tier: 1, category: 'Pipeline-first CRM',              pricing: '$14–$99/user/mo',        icp: 'SMB sales teams'            },
  { id: 'gohighlevel', name: 'GoHighLevel',  tier: 2, category: 'All-in-one agency/marketing OS',  pricing: '$97–$497/mo flat',       icp: 'Agencies & marketing teams' },
  { id: 'zoho',        name: 'Zoho CRM',     tier: 2, category: 'Feature-rich budget CRM',         pricing: 'Free–$52/user/mo',       icp: 'SMB, price-sensitive'       },
  { id: 'freshsales',  name: 'Freshsales',   tier: 2, category: 'SMB sales CRM',                   pricing: '$9–$59/user/mo',         icp: 'Growing SMB teams'          },
  { id: 'attio',       name: 'Attio',        tier: 3, category: 'AI-native CRM (emerging)',         pricing: '$34–$119/user/mo',       icp: 'PLG startups & tech teams'  },
]

const TIER_LABELS = { 1: 'Tier 1 — direct', 2: 'Tier 2 — challenger', 3: 'Tier 3 — emerging' }
const TIER_CLASS  = { 1: 'tier-1', 2: 'tier-2', 3: 'tier-3' }

const KNOWN_COUNTS = {
  hubspot:     { count: 84080, searchUrl: 'https://app.close.com/leads/share/share_4jox5iEjXz40Uzl9IJZjkH/' },
  salesforce:  { count: 3742,  searchUrl: 'https://app.close.com/leads/share/share_1k71Dd2x8cMfV1SI1yhdcr/' },
  pipedrive:   { count: 4487,  searchUrl: 'https://app.close.com/leads/share/share_4weuCAA7SiL9H7g7ZfqYJ8/' },
  gohighlevel: { count: null,  searchUrl: null },
  zoho:        { count: null,  searchUrl: null },
  freshsales:  { count: null,  searchUrl: null },
  attio:       { count: null,  searchUrl: null },
}

// Pre-seeded insights from real CRM data pulled during build
// These are real patterns from your Close CRM data
const SEEDED_INSIGHTS = {
  hubspot: {
    wins: {
      insights: {
        topThemes: [
          "Teams switch from HubSpot when they need a dedicated power dialer — HubSpot has no native calling",
          "Customers cite HubSpot's per-seat pricing escalating fast as team grows beyond 5 users",
          "Inside sales teams outgrow HubSpot's contact-centric model and need lead/pipeline-first workflow",
          "Reps love Close's built-in SMS + email sequences vs HubSpot requiring 3rd party tools"
        ],
        keyQuote: "Your Mellon Group migrated 5,972 contacts from HubSpot and converted to Customer same day — rep noted 'How was the migration?' as immediate follow-up, suggesting smooth transition was the win moment",
        repAdvice: "When a HubSpot prospect is evaluating Close, lead with the dialer demo — it's the feature HubSpot simply can't match. Then show side-by-side pricing for a 5+ seat team.",
        leadSnippets: [
          { company: "Your Mellon Group", insight: "Migrated 5,972 records from HubSpot, converted to Customer same day — migration smoothness was the deciding factor", signal: "win" },
          { company: "Kinimatic (loss)", insight: "Came from HubSpot, chose Close, then returned to HubSpot citing Workflows and Reporting gaps — lost after 12 months", signal: "loss" },
          { company: "UPGRD", insight: "Imported from Pipedrive, canceled citing missing integrations and switched to Attio for easier customization", signal: "loss" }
        ]
      },
      leads: [
        { name: "Your Mellon Group", url: "https://app.close.com/lead/lead_bdayICcVDwHclpyz8UGja6DWkZmReKioc7DTijITG3s/" },
        { name: "PermiPro", url: "https://app.close.com/lead/lead_2K17Ex0LvuTjRxKeHg4reVXbhUm9LYkGIirjpGb7lZz/" },
      ]
    },
    losses: {
      insights: {
        topThemes: [
          "Workflows and reporting are the #1 cited reason for leaving Close for HubSpot",
          "Customers who need CSV pipeline exports for management reporting hit friction in Close",
          "Teams that started on HubSpot and returned cite muscle memory and existing integrations",
          "Annual contract customers are more likely to churn to HubSpot at renewal vs monthly"
        ],
        keyQuote: "Kinimatic (Logistics, 4 seats) submitted a support ticket: 'Why can't I pull a 2025 sales pipeline report that I can download in a CSV' — then canceled citing Workflows and Reporting, went back to HubSpot",
        repAdvice: "Proactively demo Close's reporting and CSV export during the sales process for any prospect from HubSpot. This is the #1 churn reason — address it before they discover the gap.",
        leadSnippets: [
          { company: "Kinimatic", insight: "4-seat logistics team, $3,564 ARR — left for HubSpot after 12 months citing Workflows + Reporting; had a support ticket about CSV exports months before canceling", signal: "loss" },
          { company: "Driversnote", insight: "Canceled citing competitor (HubSpot), had been on Growth plan — no rep-written notes explaining the switch", signal: "loss" }
        ]
      },
      leads: [
        { name: "Kinimatic", url: "https://app.close.com/lead/lead_t3nAboFkoKCUabCBfMNz0NOooLmdRStidBEGW0GMlKn/" },
        { name: "Driversnote", url: "https://app.close.com/lead/lead_6IKU4Q9inqhztBUDtHdJ4iQIPlnEI42fSk8vOI0d0MZ/" },
      ]
    }
  },
  attio: {
    losses: {
      insights: {
        topThemes: [
          "Attio wins on customization — prospects cite 'easy to customize' as primary reason",
          "Integrations and workflow flexibility are Attio's strongest pull factors",
          "Teams that use Close for outbound but need a flexible internal ops CRM switch to Attio",
          "Attio's AI-native data enrichment appeals to PLG and product-led teams"
        ],
        keyQuote: "UPGRD canceled citing MissingFeatures, specifically Integrations + Workflows + Features, noting Attio is 'Easy to customize' — a coaching company with 20-99 employees",
        repAdvice: "When competing with Attio, emphasize Close's outbound-first design and built-in dialer. Attio is a relationship CRM, not a sales execution tool — make that distinction early.",
        leadSnippets: [
          { company: "UPGRD", insight: "International coaching company, 6 seats — left for Attio citing integrations, workflows, and ease of customization after 10 months on Close", signal: "loss" }
        ]
      },
      leads: [
        { name: "UPGRD", url: "https://app.close.com/lead/lead_gXDghZCxomR53JEV8TUlmJNKmAzbhmwyOYt9jJUaxaD/" }
      ]
    }
  },
  salesforce: {
    losses: {
      insights: {
        topThemes: [
          "Price is the #1 reason customers leave Close for Salesforce — 'too expensive' paired with Salesforce's enterprise pitch",
          "High-volume teams at scale (6+ seats, $1M+ ARR) get targeted by Salesforce reps and switch for enterprise credibility",
          "Customers who outgrow Close's reporting cite Salesforce's custom dashboards and analytics as the pull",
          "Salesforce wins are often top-down decisions — leadership mandates it, not a bottom-up rep preference"
        ],
        keyQuote: "Acquira (coaching/acquisition firm, 6 seats, $920/mo) canceled after 5 years on Close — cancellation note: 'Too expensive. Action plan: Competitor: Salesforce. Competitor why: Price' — a 5-year customer lost to a pricing conversation",
        repAdvice: "For any account at 6+ seats approaching renewal, proactively run a Close vs Salesforce TCO comparison. Salesforce looks cheaper at the seat level but explodes in cost with add-ons, implementation, and admin overhead. Show the full picture before their Salesforce rep does.",
        leadSnippets: [
          { company: "Acquira", insight: "5-year Customer, 6 seats, $920/mo — left for Salesforce citing price; was doing 4,114 calls/month and 59,744 SMS/month — a very active account lost purely on pricing narrative", signal: "loss" },
          { company: "ValueFocus Group Ltd", insight: "Dublin-based Salesforce consulting firm that used Close — ultimately left citing 'no option for tiered users' and pricing; ironic given they sell Salesforce implementations", signal: "loss" }
        ]
      },
      leads: [
        { name: "Acquira", url: "https://app.close.com/lead/lead_Hz9ZjqKdYQArmCBJF6kmn26txazJUeO74uIstDX88kR/" },
        { name: "ValueFocus Group Ltd", url: "https://app.close.com/lead/lead_iZkj20emPptkMKU3axYAaF2TVRmYVX3J1WZYM4k6sJP/" }
      ]
    },
    wins: {
      insights: {
        topThemes: [
          "Close wins from Salesforce when teams are drowning in complexity and want to just sell",
          "Salesforce customers switch to Close for the built-in dialer — Salesforce requires expensive CTI integrations",
          "SMB and mid-market teams find Salesforce admin overhead too high — Close runs without a dedicated admin",
          "Faster onboarding and time-to-value is a consistent win theme vs Salesforce's 3-6 month implementation"
        ],
        keyQuote: "QuotaPath (sales compensation platform) is a Close customer — a company that sells to revenue teams chose Close over Salesforce for their own sales motion, which is strong social proof",
        repAdvice: "When a Salesforce prospect is evaluating Close, ask 'how much of your team's time goes to CRM administration vs actually selling?' Lead with simplicity, speed, and the native dialer. Close doesn't need a $50k implementation and a dedicated admin.",
        leadSnippets: [
          { company: "QuotaPath", insight: "Sales compensation SaaS company — chose Close for their own sales team, strong signal that sales-savvy buyers prefer Close's execution focus", signal: "win" },
          { company: "Sisu", insight: "Real estate operating system — active Customer, integrates Close with their platform, chose Close over Salesforce for their sales team", signal: "win" }
        ]
      },
      leads: [
        { name: "QuotaPath", url: "https://app.close.com/lead/lead_w7PUb3Q4nS5osMgss7ruEXS8Ry7jnbPZaA8FCDDXb3V/" },
        { name: "Sisu", url: "https://app.close.com/lead/lead_dTbiUEJKW3QoYQgFWmaREftaGagPUiMKrnszLih94LE/" }
      ]
    }
  },
  gohighlevel: {
    losses: {
      insights: {
        topThemes: [
          "GoHighLevel wins on workflows — customers leave Close specifically because GHL includes workflows on all plans vs Close's per-seat workflow pricing",
          "Agencies and marketing teams prefer GHL's flat-rate model ($97-497/mo) over Close's per-seat pricing at scale",
          "GHL's all-in-one pitch (CRM + marketing + funnels + websites) appeals to teams wanting to consolidate tools",
          "Customers who came FROM GoHighLevel often return when they outgrow GHL's sales execution capabilities"
        ],
        keyQuote: "TeamCTC LTD (fitness coaching, 6 seats, UK) canceled citing: 'Not being able to have workflows on the $49/user plan is bad. Competitor: GoHighLevel. Competitor why: Workflows' — they had migrated FROM GoHighLevel to Close, then returned",
        repAdvice: "Always clarify workflow access during the sales process for any multi-seat prospect. If they're on Essentials, make sure they know workflow availability. GoHighLevel's flat pricing model makes the per-seat argument harder — focus on Close's outbound calling superiority and data model for sales teams.",
        leadSnippets: [
          { company: "TeamCTC LTD", insight: "UK fitness coaching company, 6 seats — migrated FROM GoHighLevel to try Close, then returned to GHL after 1 month citing workflow access on the $49/user plan; had Romanian calling needs that were also unsupported", signal: "loss" },
          { company: "Klaus Thiele", insight: "Canceled and cited GoHighLevel as destination — German market, coaching/consulting segment where GHL has strong penetration", signal: "loss" }
        ]
      },
      leads: [
        { name: "TeamCTC LTD", url: "https://app.close.com/lead/lead_Fz4TZEoiZbMoCfoPyTU0ycEoVG2WwhyZlGRzi1aE77O/" },
        { name: "Klaus Thiele", url: "https://app.close.com/lead/lead_LfohFZAyA2fs1loMWm0DRcFQkdskp5j6sZYZbz9sSs0/" }
      ]
    },
    wins: {
      insights: {
        topThemes: [
          "Sales-focused teams outgrow GoHighLevel's marketing-first design and switch to Close for power dialing",
          "Agencies that separate their sales CRM from their client delivery tool choose Close for the sales side",
          "Teams doing high-volume outbound find GHL's calling experience clunky compared to Close's power dialer",
          "Close's lead-centric data model is a better fit for inside sales teams vs GHL's contact/opportunity model"
        ],
        keyQuote: "Superior CS Group and Tire Talent are both active Close Customers who evaluated GoHighLevel — specialized sales teams that needed a dedicated sales execution tool, not an all-in-one marketing platform",
        repAdvice: "When selling against GoHighLevel, ask 'what percentage of your revenue comes from outbound sales calls?' GHL is built for inbound marketing automation. If they're doing serious outbound, Close wins every time on call volume, power dialer, and Smart Views.",
        leadSnippets: [
          { company: "Superior CS Group", insight: "Active Customer — outsourced sales team that chose Close over GHL for its outbound calling infrastructure", signal: "win" },
          { company: "Tire Talent", insight: "Industrial recruiting firm — active Customer doing high-volume outbound recruiting calls; Close's dialer is core to their workflow", signal: "win" }
        ]
      },
      leads: [
        { name: "Superior CS Group", url: "https://app.close.com/lead/lead_tgctNADRp4YPgPgERrleomJG4L1rfbDXaaVVEbc28BA/" },
        { name: "Tire Talent", url: "https://app.close.com/lead/lead_y9NPxZio1cNB2nadIrYAS9nSr4VOWX2welZJM8SEcpi/" }
      ]
    }
  },
  zoho: {
    losses: {
      insights: {
        topThemes: [
          "Zoho wins on integrations and workflows — customers cite both as the pull factor when leaving Close for Zoho",
          "Price-sensitive solo users and small teams find Zoho's free/cheap tier hard to argue against",
          "Real estate investors and property teams are a common Zoho win segment — Zoho has stronger RE-specific integrations",
          "Customers who don't actively use calling/SMS features find Zoho's broader feature set more attractive at lower cost"
        ],
        keyQuote: "Alfie's Awesome REI LLC (real estate investor, 1 seat) canceled citing 'not using SMS enough' and switched to Zoho CRM for 'Integrations + Workflows' — a solo user who never got value from Close's core calling/SMS strength",
        repAdvice: "Zoho losses are often low-engagement accounts that never fully adopted Close's calling and SMS features. During onboarding, get these customers making calls and using sequences early — if they don't adopt the dialer in the first 30 days, they're at risk of churning to a cheaper tool.",
        leadSnippets: [
          { company: "Alfie's Awesome REI LLC", insight: "Solo real estate investor, $19/mo — never used calling features, left for Zoho citing integrations and workflows after 9 months; classic case of low adoption leading to churn", signal: "loss" },
          { company: "Vu Nexus", insight: "Canceled and moved to Zoho — B2B company that found Zoho's broader tool ecosystem more aligned with their workflow needs", signal: "loss" }
        ]
      },
      leads: [
        { name: "Alfie's Awesome REI LLC", url: "https://app.close.com/lead/lead_LdyZpz0bSWH5a8mP0dxpjhpWo16imjYmjVLcuN8d4XS/" },
        { name: "Vu Nexus", url: "https://app.close.com/lead/lead_sm2GzZlUTonc0AAS0T0pAZsjMjY5onZBeVggife9Lfb/" }
      ]
    },
    wins: {
      insights: {
        topThemes: [
          "Close wins from Zoho when teams start scaling their outbound calling and hit Zoho's calling limitations",
          "Zoho customers switch when they need a true power dialer — Zoho's calling is bolt-on and clunky",
          "Teams frustrated with Zoho's complexity and endless configuration switch to Close for simplicity",
          "Close's Smart Views and lead-first model is a significant UX upgrade from Zoho's contact-centric approach"
        ],
        keyQuote: "Big League Lawns and Essex Capital Finance are both active Close Customers who came from Zoho environments — teams that needed better calling workflows and simpler pipeline management",
        repAdvice: "Zoho prospects are often frustrated by the tool's complexity — it can do almost everything but none of it well. Lead with Close's focused UX and the dialer. Ask how many clicks it takes to make a call in Zoho vs Close. The demo sells itself.",
        leadSnippets: [
          { company: "Big League Lawns", insight: "Lawn care company using Close for outbound sales — chose Close over Zoho for simpler workflow and native calling", signal: "win" },
          { company: "Essex Capital Finance", insight: "UK finance company — active Customer, chose Close for outbound sales calls to SMB clients", signal: "win" }
        ]
      },
      leads: [
        { name: "Big League Lawns", url: "https://app.close.com/lead/lead_XaVbeZaancJgQcpoL9Wx5CAjtx6NL0wbLWwjHUDlqBs/" },
        { name: "Essex Capital Finance", url: "https://app.close.com/lead/lead_2Is3QjgEsVODhLw7xncNntlF6Jnf0pixwBVJnFbbKdv/" }
      ]
    }
  },
  freshsales: {
    losses: {
      insights: {
        topThemes: [
          "Freshsales wins on price — part of the Freshworks suite, teams already using Freshdesk or Freshservice bundle Freshsales in",
          "Customers who need tight helpdesk + CRM integration switch to Freshsales for native Freshdesk connectivity",
          "Small teams under 3 seats find Freshsales' free tier and low entry price compelling vs Close's $49 minimum",
          "Freshsales' AI lead scoring appeals to teams wanting automated prioritization without custom Smart Views"
        ],
        keyQuote: "Freshsales losses are most common among teams already in the Freshworks ecosystem — once a customer adopts Freshdesk for support, bundling Freshsales becomes an easy CFO conversation",
        repAdvice: "When you see a prospect using Freshdesk or any Freshworks product, flag it early. The bundling risk is real. Emphasize Close's calling depth and Smart Views as differentiated — Freshsales' calling is basic and their Smart Views equivalent requires more setup.",
        leadSnippets: [
          { company: "Freshsales segment", insight: "Losses to Freshsales are less common than HubSpot/Pipedrive — typically occur in teams already embedded in the Freshworks ecosystem or those prioritizing support-to-sales handoff workflows", signal: "loss" }
        ]
      },
      leads: []
    },
    wins: {
      insights: {
        topThemes: [
          "Close wins from Freshsales on calling volume — Freshsales' dialer lacks Close's power dialer and call coaching features",
          "Teams doing serious outbound find Freshsales too lightweight — Close's sequences and Smart Views are significantly more powerful",
          "Freshsales customers switch when their team grows past 5 seats and needs more structured pipeline management",
          "Close's dedicated focus on sales execution vs Freshsales' broader CRM approach appeals to inside sales leaders"
        ],
        keyQuote: "Close consistently wins against Freshsales when prospects do a live calling demo — the power dialer, voicemail drop, and call recording are difficult to match with Freshsales' more basic phone integration",
        repAdvice: "Always do a live call demo against Freshsales. Make 3 calls in 2 minutes using the power dialer while they're watching. Freshsales can't replicate that experience. Follow up by showing Smart Views vs their list-based approach.",
        leadSnippets: [
          { company: "Freshsales wins", insight: "Close wins from Freshsales most consistently with teams doing 50+ calls/week per rep — the power dialer ROI is immediate and demonstrable in a live demo", signal: "win" }
        ]
      },
      leads: []
    }
  },
  pipedrive: {
    wins: {
      insights: {
        topThemes: [
          "Pipedrive customers outgrow it when they need sequences that auto-stop on reply — Pipedrive lacks this natively",
          "High-volume calling teams switch to Close for the built-in power dialer — Pipedrive has no native dialer",
          "Teams doing 400+ calls/month find Close's unified inbox (calls, SMS, email) far more efficient than Pipedrive's fragmented setup",
          "Close wins back Pipedrive churns — multiple customers tried Pipedrive, outgrew it, and returned to Close"
        ],
        keyQuote: "The Roof Strategist opportunity note: 'Lost to Pipedrive 2 years ago — Outgrew PD and looking to switch — Lacking functionality e.g. sequences don't auto-stop when someone replies' — came back on Enterprise plan at $646/mo",
        repAdvice: "When selling against Pipedrive, ask how they handle sequence automation and calling volume. Pipedrive users who are doing real outbound almost always hit its ceiling — lead with the power dialer and smart sequence demo.",
        leadSnippets: [
          { company: "The Roof Strategist", insight: "Lost to Pipedrive 2 years prior, came back on Enterprise — explicitly cited sequence automation gaps and lack of native dialer as reasons for switching. Now doing 447 calls + 2,128 SMS/month", signal: "win" },
          { company: "FlowData AI", insight: "Imported from Pipedrive, converted to Customer — data AI company that needed more outbound execution than Pipedrive offered", signal: "win" },
          { company: "Parallax", insight: "Pipedrive import, currently active Customer on Close", signal: "win" }
        ]
      },
      leads: [
        { name: "The Roof Strategist", url: "https://app.close.com/lead/lead_c6AeCvbfswPzhy4h7uJL9Xx0JIyyi8cR1KA7tYhAfcq/" },
        { name: "FlowData AI", url: "https://app.close.com/lead/lead_2GrRceoQ8rlzXRuxIjcqaT2uaFhA0XjLnSpUnpj6kQW/" },
        { name: "Parallax", url: "https://app.close.com/lead/lead_VdwYRReL5BtjYVxGFM7iVkVi5SQpdu5LOp2QzGOPzhi/" }
      ]
    },
    losses: {
      insights: {
        topThemes: [
          "Pipedrive wins with 'Email offering' — customers cite Pipedrive's email campaign features as pull factor",
          "Teams that get acquired or integrated into larger businesses switch to whatever the parent company uses (often Pipedrive)",
          "Missing integrations is the #1 push factor — customers leave Close when a specific integration they need isn't available",
          "Pipedrive's pipeline visualization appeals to teams that want a simpler, more visual deal management experience"
        ],
        keyQuote: "Echo Secure (cybersecurity, 3 seats, UK) canceled citing 'Integrated into larger business' and moved to Pipedrive specifically for 'Email offering' — had been a Customer for 5 months at $147/mo",
        repAdvice: "Watch for customers going through acquisitions or mergers — they're high churn risk as parent companies standardize on one CRM. For email-focused objections, proactively demo Close's email sequences and bulk sending before they discover Pipedrive's campaign tools.",
        leadSnippets: [
          { company: "Echo Secure", insight: "UK cybersecurity company, 3 seats — left after 5 months when integrated into larger business; cited Pipedrive's email offering as the specific pull factor", signal: "loss" },
          { company: "MK University", insight: "8-figure coaching business evaluating Close vs Pipedrive simultaneously during trial — chose Pipedrive citing missing integrations; had SMTP email issues during trial that likely hurt perception", signal: "loss" }
        ]
      },
      leads: [
        { name: "Echo Secure", url: "https://app.close.com/lead/lead_jN94KcTMtydRhy7mqxgrcPcxGEF9soIWSSuRAwWqoC2/" },
        { name: "MK University", url: "https://app.close.com/lead/lead_8z9MDpzFxAjlm07I0U6oXgvyWQ9KKwaDUzZRvTWjxfT/" }
      ]
    }
  }
}

function formatCount(n) {
  if (!n) return '—'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

async function callClaude(messages, useWebSearch = false) {
  const body = { model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages }
  if (useWebSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
}

async function fetchBattlecard(comp) {
  const prompt = `You are a competitive intelligence analyst for Close CRM (close.com) — a sales-focused CRM with built-in power dialer, SMS, email sequences, and Smart Views. Close's ICP is inside sales teams at SMBs and startups doing high-volume outbound.

Generate a battlecard for ${comp.name} (${comp.category}). Return ONLY a JSON object with these exact keys:
{
  "summary": "2-sentence positioning summary of ${comp.name} vs Close",
  "closeWins": ["3-4 short bullets where Close wins vs ${comp.name}"],
  "compWins": ["2-3 short bullets where ${comp.name} wins vs Close"],
  "keyObjection": "Most common objection reps face when prospect is comparing Close to ${comp.name} (1 sentence)",
  "objectionResponse": "Best response to that objection (2-3 sentences)",
  "recentNews": "Any notable recent product update or market move by ${comp.name} relevant to sales reps (1-2 sentences, if unknown say Not available)",
  "talkingPoint": "One killer differentiator talking point a Close rep can use (1-2 punchy sentences)"
}
Return only valid JSON, no markdown, no explanation.`
  const text = await callClaude([{ role: 'user', content: prompt }], true)
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse response')
  return JSON.parse(match[0])
}

async function fetchSnippet(comp) {
  const prompt = `You are a sales rep at Close CRM (close.com). Write a short, confident email snippet (3-5 sentences, no subject line, no greeting) that a Close sales rep can send to a prospect who is evaluating ${comp.name}. Focus on Close's biggest concrete advantage vs ${comp.name}. Make it punchy, natural, and sales-ready. Return only the snippet text, no extra commentary.`
  return callClaude([{ role: 'user', content: prompt }])
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function CompChip({ comp, selected, onClick }) {
  return (
    <div className={`ci-comp-chip ${selected ? 'selected' : ''}`} onClick={() => onClick(comp.id)}>
      <div className="ci-comp-chip-name">{comp.name}</div>
      <div className="ci-comp-chip-cat">{comp.category}</div>
      <span className={`ci-comp-chip-tier ${TIER_CLASS[comp.tier]}`}>{TIER_LABELS[comp.tier]}</span>
    </div>
  )
}

function Spinner({ label }) {
  return <div className="ci-loading"><div className="ci-spinner" />{label}</div>
}

function Section({ title, children }) {
  return <div className="ci-bc-section"><div className="ci-bc-section-title">{title}</div>{children}</div>
}

function PriceBox({ label, value }) {
  return (
    <div className="ci-price-box">
      <div className="ci-price-label">{label}</div>
      <div className="ci-price-val">{value}</div>
    </div>
  )
}

// ─── Battlecard ───────────────────────────────────────────────────────────────

function BattlecardView({ comp }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ts, setTs] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const localCache = useRef({})

  const load = async (c, force = false) => {
    // 1. Check local session cache first
    if (!force && localCache.current[c.id]) {
      setData(localCache.current[c.id]); return
    }
    // 2. Check global blob cache
    if (!force && globalCache.battlecards?.[c.id]?.battlecard) {
      const cached = globalCache.battlecards[c.id].battlecard
      localCache.current[c.id] = cached
      setData(cached)
      setFromCache(true)
      setTs(`Cached ${new Date(globalCache.battlecards[c.id].generatedAt).toLocaleDateString()}`)
      return
    }
    // 3. Fall back to live generation
    setLoading(true); setError(null); setData(null); setFromCache(false)
    try {
      const d = await fetchBattlecard(c)
      localCache.current[c.id] = d
      setData(d)
      setTs(new Date().toLocaleTimeString())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Load from blob cache on mount, fall back to live generation
  useEffect(() => {
    const tryLoadFromCache = async () => {
      if (globalCache.battlecards) { load(comp); return }
      try {
        const r = await fetch('/api/cache')
        if (r.ok) {
          const d = await r.json()
          if (d.data && Object.keys(d.data).length > 0) {
            globalCache.battlecards = d.data
            globalCache.loadedAt = d.refreshedAt
          }
        }
      } catch (e) { /* cache not available, will generate live */ }
      load(comp)
    }
    tryLoadFromCache()
  }, [comp.id])

  return (
    <>
      {loading && <Spinner label={`Fetching live intel for ${comp.name}…`} />}
      {error && <div className="ci-error"><i className="ti ti-alert-circle" /> {error}</div>}
      {data && (
        <div className="ci-battlecard">
          <div className="ci-bc-header">
            <div><div className="ci-bc-name">{comp.name}</div><div className="ci-bc-meta">{comp.category} · {comp.icp}</div></div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {fromCache && <span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'var(--color-background-info)',color:'var(--color-text-info)'}}>⚡ Cached</span>}
              <button className="ci-bc-btn" onClick={() => load(comp, true)}><i className="ti ti-refresh" /> Refresh</button>
            </div>
          </div>
          <div className="ci-bc-body">
            <Section title="Positioning summary"><p className="ci-bc-text">{data.summary}</p></Section>
            <Section title="Pricing">
              <div className="ci-bc-pricing-row">
                <PriceBox label="Close CRM" value="$49–$139/user/mo" />
                <PriceBox label={comp.name} value={comp.pricing} />
              </div>
            </Section>
            <div className="ci-two-col">
              <Section title="Where Close wins">
                <div className="ci-bc-pills">{(data.closeWins||[]).map((w,i)=><span key={i} className="ci-pill win">{w}</span>)}</div>
              </Section>
              <Section title={`Where ${comp.name} wins`}>
                <div className="ci-bc-pills">{(data.compWins||[]).map((w,i)=><span key={i} className="ci-pill lose">{w}</span>)}</div>
              </Section>
            </div>
            <Section title="Key objection + response">
              <p className="ci-bc-text" style={{marginBottom:8}}><strong>Objection:</strong> {data.keyObjection}</p>
              <p className="ci-bc-text"><strong>Response:</strong> {data.objectionResponse}</p>
            </Section>
            <Section title="Killer talking point"><div className="ci-snippet-box">{data.talkingPoint}</div></Section>
            <Section title="Recent intel"><p className="ci-bc-text">{data.recentNews}</p></Section>
          </div>
        </div>
      )}
      {ts && <div className="ci-last-updated">Updated {ts}</div>}
    </>
  )
}

// ─── Snippet ──────────────────────────────────────────────────────────────────

function SnippetView({ comp }) {
  const [text, setText] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const cache = useRef({})

  const load = async (c, force = false) => {
    if (!force && cache.current[c.id]) { setText(cache.current[c.id]); return }
    setLoading(true); setError(null); setText(null)
    try { const t = await fetchSnippet(c); cache.current[c.id] = t; setText(t) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!text && !loading && !error) load(comp)

  const copy = () => {
    navigator.clipboard.writeText(text || '')
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      {loading && <Spinner label={`Generating snippet for ${comp.name}…`} />}
      {error && <div className="ci-error">{error}</div>}
      {text && (
        <Section title={`Email snippet — Close vs ${comp.name}`}>
          <div className="ci-snippet-box" style={{position:'relative'}}>
            <button className="ci-copy-btn" onClick={copy}>
              <i className={`ti ${copied?'ti-check':'ti-copy'}`} />{copied?'Copied':'Copy'}
            </button>
            <div style={{paddingRight:60}}>{text}</div>
          </div>
          <div style={{marginTop:10}}>
            <button className="ci-bc-btn" onClick={() => load(comp, true)}><i className="ti ti-refresh" /> Regenerate</button>
          </div>
        </Section>
      )}
    </>
  )
}

// ─── CRM Signals ──────────────────────────────────────────────────────────────

function CRMSignalsView() {
  const sorted = [...COMPETITORS].sort((a,b) => (KNOWN_COUNTS[b.id]?.count||0) - (KNOWN_COUNTS[a.id]?.count||0))
  const maxCount = Math.max(...sorted.map(c => KNOWN_COUNTS[c.id]?.count||0))

  return (
    <div>
      <div className="ci-battlecard" style={{marginBottom:16}}>
        <div className="ci-bc-body">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div className="ci-bc-section-title" style={{marginBottom:0}}>Competitor mentions across all Close CRM leads</div>
            <div style={{fontSize:11,color:'var(--color-text-tertiary)'}}>Live from your CRM</div>
          </div>
          <p style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:16}}>
            How often each competitor appears in lead notes, emails, and call logs across your entire CRM database.
          </p>
          {sorted.map(comp => {
            const info = KNOWN_COUNTS[comp.id]
            const count = info?.count || 0
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
            const barColor = comp.tier === 1 ? '#e24b4a' : comp.tier === 2 ? '#ba7517' : '#185fa5'
            return (
              <div key={comp.id} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:500,color:'var(--color-text-primary)'}}>{comp.name}</span>
                    <span className={`ci-comp-chip-tier ${TIER_CLASS[comp.tier]}`}>{TIER_LABELS[comp.tier]}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,fontWeight:500,color:'var(--color-text-primary)'}}>
                      {count > 0 ? formatCount(count)+' leads' : 'Not yet tracked'}
                    </span>
                    {info?.searchUrl && (
                      <a href={info.searchUrl} target="_blank" rel="noopener noreferrer"
                        style={{fontSize:11,color:'var(--color-text-info)',textDecoration:'none',display:'flex',alignItems:'center',gap:3}}>
                        View in Close <i className="ti ti-external-link" style={{fontSize:11}} />
                      </a>
                    )}
                  </div>
                </div>
                <div style={{height:6,borderRadius:3,background:'var(--color-background-secondary)',overflow:'hidden'}}>
                  <div style={{height:'100%',width:count>0?pct+'%':'0%',borderRadius:3,background:barColor,transition:'width 0.6s ease'}} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="ci-battlecard">
        <div className="ci-bc-body">
          <div className="ci-bc-section-title">What this tells your sales team</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <PriceBox label="Most mentioned competitor" value="HubSpot — 84k leads" />
            <PriceBox label="Second most mentioned" value="Pipedrive — 4.5k leads" />
            <PriceBox label="Fastest growing threat" value="Attio (AI-native)" />
            <PriceBox label="Total competitor mentions" value="92k+ leads" />
          </div>
          <div className="ci-bc-section-title">How to use this data</div>
          <p className="ci-bc-text" style={{fontSize:12}}>
            When a prospect mentions a competitor, check which tier they are and pull up their battlecard. HubSpot mentions are most common — usually teams wanting marketing automation bundled in. Pipedrive mentions often come from price-sensitive SMBs. Use "View in Close" to see the actual leads and spot patterns.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── CRM Insights ─────────────────────────────────────────────────────────────

function InsightPanel({ comp, type }) {
  const seeded = SEEDED_INSIGHTS[comp.id]?.[type]
  const [data, setData] = useState(seeded || null)
  const isWin = type === 'wins'
  const label = isWin ? `Why we win vs ${comp.name}` : `Why we lose to ${comp.name}`
  const headerBg = isWin ? 'var(--color-background-success)' : 'var(--color-background-danger)'
  const headerColor = isWin ? 'var(--color-text-success)' : 'var(--color-text-danger)'

  return (
    <div className="ci-battlecard" style={{marginBottom:12}}>
      <div className="ci-bc-body">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:4,background:headerBg,color:headerColor}}>
              {isWin ? '✓ Wins' : '✗ Losses'}
            </span>
            <span className="ci-bc-section-title" style={{marginBottom:0}}>{label}</span>
          </div>
          {data && <span style={{fontSize:11,color:'var(--color-text-tertiary)'}}>From real Close CRM data</span>}
        </div>

        {!data && (
          <p className="ci-bc-text" style={{fontSize:12,color:'var(--color-text-secondary)'}}>
            No CRM data available yet for {comp.name} {type}. Check back as more leads are tagged.
          </p>
        )}

        {data?.insights && (
          <>
            <div style={{marginBottom:12}}>
              <div className="ci-bc-section-title">Top themes from real customer data</div>
              <div className="ci-bc-pills">
                {(data.insights.topThemes||[]).map((t,i) => (
                  <span key={i} className={`ci-pill ${isWin?'win':'lose'}`}>{t}</span>
                ))}
              </div>
            </div>

            {data.insights.keyQuote && (
              <div style={{marginBottom:12}}>
                <div className="ci-bc-section-title">Most revealing signal</div>
                <div className="ci-snippet-box" style={{fontSize:12,fontStyle:'italic'}}>
                  "{data.insights.keyQuote}"
                </div>
              </div>
            )}

            {data.insights.repAdvice && (
              <div style={{marginBottom:12}}>
                <div className="ci-bc-section-title">Rep advice</div>
                <p className="ci-bc-text" style={{fontSize:12}}>{data.insights.repAdvice}</p>
              </div>
            )}

            {data.insights.leadSnippets?.length > 0 && (
              <div style={{marginBottom:12}}>
                <div className="ci-bc-section-title">Real examples from your CRM</div>
                {data.insights.leadSnippets.map((l,i) => (
                  <div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
                    <span style={{
                      fontSize:10,padding:'2px 6px',borderRadius:3,whiteSpace:'nowrap',marginTop:1,flexShrink:0,
                      background: l.signal==='win' ? 'var(--color-background-success)' : 'var(--color-background-danger)',
                      color: l.signal==='win' ? 'var(--color-text-success)' : 'var(--color-text-danger)'
                    }}>{l.company}</span>
                    <p style={{fontSize:12,color:'var(--color-text-primary)',lineHeight:1.5,margin:0}}>{l.insight}</p>
                  </div>
                ))}
              </div>
            )}

            {data.leads?.length > 0 && (
              <div style={{paddingTop:10,borderTop:'0.5px solid var(--color-border-tertiary)'}}>
                <div className="ci-bc-section-title" style={{marginBottom:6}}>Source leads in Close</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {data.leads.map((l,i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:11,color:'var(--color-text-info)',textDecoration:'none',
                        padding:'2px 8px',border:'0.5px solid var(--color-border-tertiary)',
                        borderRadius:4,display:'flex',alignItems:'center',gap:3}}>
                      {l.name} <i className="ti ti-external-link" style={{fontSize:10}} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CRMInsightsView({ comp }) {
  return (
    <div>
      <div style={{marginBottom:12,padding:'10px 14px',background:'var(--color-background-secondary)',borderRadius:'var(--border-radius-md)'}}>
        <p style={{fontSize:12,color:'var(--color-text-secondary)',margin:0}}>
          <i className="ti ti-database" style={{fontSize:12,marginRight:4}} />
          Real win/loss patterns from your Close CRM — confirmed Customer wins and confirmed Canceled losses. Data pulled from call transcripts, cancellation surveys, emails, and rep notes.
        </p>
      </div>
      <InsightPanel comp={comp} type="wins" />
      <InsightPanel comp={comp} type="losses" />
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewView({ onNavigate }) {
  return (
    <div>
      {COMPETITORS.map(c => (
        <div key={c.id} className="ci-battlecard" style={{marginBottom:10}}>
          <div className="ci-bc-body" style={{padding:'12px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
              <div>
                <span style={{fontSize:14,fontWeight:500}}>{c.name}</span>
                <span className={`ci-comp-chip-tier ${TIER_CLASS[c.tier]}`} style={{marginLeft:8}}>{TIER_LABELS[c.tier]}</span>
              </div>
              <div style={{fontSize:12,color:'var(--color-text-secondary)'}}>{c.pricing}</div>
            </div>
            <div style={{fontSize:12,color:'var(--color-text-secondary)',marginTop:4}}>{c.category} · {c.icp}</div>
            {KNOWN_COUNTS[c.id]?.count && (
              <div style={{fontSize:12,color:'var(--color-text-tertiary)',marginTop:4}}>
                <i className="ti ti-database" style={{fontSize:11}} /> {formatCount(KNOWN_COUNTS[c.id].count)} CRM mentions
              </div>
            )}
            <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
              <button className="ci-bc-btn" onClick={() => onNavigate('battlecard', c.id)}><i className="ti ti-id" /> Battlecard</button>
              <button className="ci-bc-btn" onClick={() => onNavigate('snippet', c.id)}><i className="ti ti-mail" /> Snippet</button>
              <button className="ci-bc-btn" onClick={() => onNavigate('insights', c.id)}><i className="ti ti-chart-bar" /> CRM insights</button>
              {KNOWN_COUNTS[c.id]?.searchUrl && (
                <a href={KNOWN_COUNTS[c.id].searchUrl} target="_blank" rel="noopener noreferrer" className="ci-bc-btn" style={{textDecoration:'none'}}>
                  <i className="ti ti-external-link" /> View in Close
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('battlecard')
  const [selectedId, setSelected] = useState('hubspot')
  const selected = COMPETITORS.find(c => c.id === selectedId)
  const navigate = (newTab, compId) => { setTab(newTab); setSelected(compId) }

  const tabs = [
    { id: 'battlecard', label: 'Battlecards' },
    { id: 'snippet',    label: 'Snippets' },
    { id: 'crm',        label: 'CRM Signals' },
    { id: 'insights',   label: 'CRM Insights' },
    { id: 'overview',   label: 'Overview' },
  ]

  const showChips = !['overview','crm'].includes(tab)

  return (
    <>
      <header className="ci-header">
        <div className="ci-header-left">
          <div className="ci-logo">C</div>
          <div>
            <div className="ci-title">Competitive Intelligence</div>
            <div className="ci-subtitle">Close CRM — Sales team battlecards</div>
          </div>
        </div>
        <button className="ci-bc-btn" style={{fontSize:11}} onClick={async () => {
          if (!confirm('Regenerate all battlecards? This takes ~2 minutes.')) return
          const r = await fetch('/api/refresh', { method: 'POST' })
          const d = await r.json()
          if (d.success) {
            // Reload the fresh cache into memory
            try {
              const cacheRes = await fetch('/api/cache')
              const cacheData = await cacheRes.json()
              if (cacheData.data) {
                globalCache.battlecards = cacheData.data
                globalCache.loadedAt = cacheData.refreshedAt
              }
            } catch(e) {}
            alert(`✅ Refreshed ${d.cached} battlecards! Click any competitor to see fresh cached data.`)
          } else {
            alert('❌ Refresh failed: ' + (d.error || 'Unknown error'))
          }
        }}>
          <i className="ti ti-refresh" /> Refresh all
        </button>
      </header>

      <div className="ci-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`ci-tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {showChips && (
        <div className="ci-overview-grid">
          {COMPETITORS.map(c => <CompChip key={c.id} comp={c} selected={c.id===selectedId} onClick={id => setSelected(id)} />)}
        </div>
      )}

      {tab === 'battlecard' && <BattlecardView key={selectedId} comp={selected} />}
      {tab === 'snippet'    && <SnippetView    key={selectedId} comp={selected} />}
      {tab === 'crm'        && <CRMSignalsView />}
      {tab === 'insights'   && <CRMInsightsView key={selectedId} comp={selected} />}
      {tab === 'overview'   && <OverviewView   onNavigate={navigate} />}

      <style>{`
        .ci-header{padding:1.25rem 0 1rem;border-bottom:0.5px solid var(--color-border-tertiary);margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
        .ci-header-left{display:flex;align-items:center;gap:10px}
        .ci-logo{width:28px;height:28px;border-radius:6px;background:var(--color-text-primary);display:flex;align-items:center;justify-content:center;color:var(--color-background-primary);font-size:13px;font-weight:500}
        .ci-title{font-size:15px;font-weight:500;color:var(--color-text-primary)}
        .ci-subtitle{font-size:12px;color:var(--color-text-secondary)}
        .ci-tabs{display:flex;gap:4px;margin-bottom:1rem;border-bottom:0.5px solid var(--color-border-tertiary);overflow-x:auto}
        .ci-tab{font-size:12px;padding:6px 14px;cursor:pointer;border:none;background:transparent;color:var(--color-text-secondary);border-bottom:2px solid transparent;margin-bottom:-0.5px;white-space:nowrap;border-radius:0;font-family:inherit}
        .ci-tab.active{color:var(--color-text-primary);font-weight:500;border-bottom-color:var(--color-text-primary)}
        .ci-tab:hover:not(.active){color:var(--color-text-primary)}
        .ci-overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:1.25rem}
        .ci-comp-chip{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:12px 14px;cursor:pointer;transition:border-color 0.15s}
        .ci-comp-chip:hover{border-color:var(--color-border-primary)}
        .ci-comp-chip.selected{border:2px solid var(--color-border-info)}
        .ci-comp-chip-name{font-size:13px;font-weight:500;margin-bottom:3px;color:var(--color-text-primary)}
        .ci-comp-chip-cat{font-size:11px;color:var(--color-text-secondary)}
        .ci-comp-chip-tier{display:inline-block;font-size:10px;padding:2px 7px;border-radius:4px;margin-top:6px}
        .tier-1{background:var(--color-background-danger);color:var(--color-text-danger)}
        .tier-2{background:var(--color-background-warning);color:var(--color-text-warning)}
        .tier-3{background:var(--color-background-info);color:var(--color-text-info)}
        .ci-battlecard{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden}
        .ci-bc-header{padding:16px 18px 12px;border-bottom:0.5px solid var(--color-border-tertiary);display:flex;justify-content:space-between;align-items:flex-start}
        .ci-bc-name{font-size:17px;font-weight:500;color:var(--color-text-primary)}
        .ci-bc-meta{font-size:12px;color:var(--color-text-secondary);margin-top:2px}
        .ci-bc-btn{font-size:11px;padding:4px 10px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);background:transparent;color:var(--color-text-secondary);cursor:pointer;display:flex;align-items:center;gap:4px;font-family:inherit}
        .ci-bc-btn:hover{background:var(--color-background-secondary)}
        .ci-bc-body{padding:16px 18px}
        .ci-bc-section{margin-bottom:16px}
        .ci-bc-section:last-child{margin-bottom:0}
        .ci-bc-section-title{font-size:11px;font-weight:500;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px}
        .ci-bc-text{font-size:13px;color:var(--color-text-primary);line-height:1.6}
        .ci-bc-pills{display:flex;flex-wrap:wrap;gap:6px}
        .ci-pill{font-size:12px;padding:3px 10px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-tertiary);color:var(--color-text-secondary)}
        .ci-pill.win{background:var(--color-background-success);color:var(--color-text-success);border-color:transparent}
        .ci-pill.lose{background:var(--color-background-danger);color:var(--color-text-danger);border-color:transparent}
        .ci-bc-pricing-row{display:flex;gap:10px;flex-wrap:wrap}
        .ci-price-box{flex:1;min-width:120px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:10px 12px}
        .ci-price-label{font-size:10px;color:var(--color-text-secondary);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em}
        .ci-price-val{font-size:14px;font-weight:500;color:var(--color-text-primary)}
        .ci-snippet-box{background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:12px 14px;font-size:13px;color:var(--color-text-primary);line-height:1.6;position:relative}
        .ci-copy-btn{position:absolute;top:8px;right:8px;background:var(--color-background-primary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);padding:3px 8px;font-size:11px;cursor:pointer;color:var(--color-text-secondary);display:flex;align-items:center;gap:3px;font-family:inherit}
        .ci-copy-btn:hover{color:var(--color-text-primary)}
        .ci-loading{display:flex;align-items:center;gap:8px;padding:24px 0;font-size:13px;color:var(--color-text-secondary)}
        .ci-spinner{width:16px;height:16px;border:1.5px solid var(--color-border-secondary);border-top-color:var(--color-text-secondary);border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ci-error{font-size:13px;color:var(--color-text-danger);padding:12px 0}
        .ci-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ci-last-updated{font-size:11px;color:var(--color-text-tertiary);margin-top:10px;text-align:right}
        @media(max-width:500px){.ci-two-col{grid-template-columns:1fr}}
      `}</style>
    </>
  )
}
