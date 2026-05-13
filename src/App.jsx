import { useState, useRef } from 'react'

const COMPETITORS = [
  { id: 'hubspot',     name: 'HubSpot',      tier: 1, category: 'All-in-one CRM + marketing',      pricing: 'Free–$800+/mo',         icp: 'SMB to mid-market' },
  { id: 'salesforce',  name: 'Salesforce',   tier: 1, category: 'Enterprise CRM',                  pricing: '$25–$500+/user/mo',      icp: 'Mid-market to enterprise' },
  { id: 'pipedrive',   name: 'Pipedrive',    tier: 1, category: 'Pipeline-first CRM',              pricing: '$14–$99/user/mo',        icp: 'SMB sales teams' },
  { id: 'gohighlevel', name: 'GoHighLevel',  tier: 2, category: 'All-in-one agency/marketing OS',  pricing: '$97–$497/mo flat',       icp: 'Agencies & marketing teams' },
  { id: 'zoho',        name: 'Zoho CRM',     tier: 2, category: 'Feature-rich budget CRM',         pricing: 'Free–$52/user/mo',       icp: 'SMB, price-sensitive' },
  { id: 'freshsales',  name: 'Freshsales',   tier: 2, category: 'SMB sales CRM',                   pricing: '$9–$59/user/mo',         icp: 'Growing SMB teams' },
  { id: 'attio',       name: 'Attio',        tier: 3, category: 'AI-native CRM (emerging)',         pricing: '$34–$119/user/mo',       icp: 'PLG startups & tech teams' },
]

const TIER_LABELS = { 1: 'Tier 1 — direct', 2: 'Tier 2 — challenger', 3: 'Tier 3 — emerging' }
const TIER_CLASS  = { 1: 'tier-1', 2: 'tier-2', 3: 'tier-3' }

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

async function callClaude(messages, useWebSearch = false) {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages,
  }
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
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
  "targetICP": "Who is ${comp.name}'s ideal customer (1 sentence)",
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

// ─── Subcomponents ────────────────────────────────────────────────────────────

function CompChip({ comp, selected, onClick }) {
  return (
    <div
      className={`ci-comp-chip ${selected ? 'selected' : ''}`}
      onClick={() => onClick(comp.id)}
    >
      <div className="ci-comp-chip-name">{comp.name}</div>
      <div className="ci-comp-chip-cat">{comp.category}</div>
      <span className={`ci-comp-chip-tier ${TIER_CLASS[comp.tier]}`}>
        {TIER_LABELS[comp.tier]}
      </span>
    </div>
  )
}

function Spinner({ label }) {
  return (
    <div className="ci-loading">
      <div className="ci-spinner" />
      {label}
    </div>
  )
}

function BattlecardView({ comp }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [ts, setTs]           = useState(null)
  const cache = useRef({})

  const load = async (c, force = false) => {
    if (!force && cache.current[c.id]) { setData(cache.current[c.id]); return }
    setLoading(true); setError(null); setData(null)
    try {
      const d = await fetchBattlecard(c)
      cache.current[c.id] = d
      setData(d)
      setTs(new Date().toLocaleTimeString())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // load when comp changes
  useState(() => { load(comp) }, [comp.id])
  // also fire on mount
  if (!data && !loading && !error) load(comp)

  return (
    <>
      {loading && <Spinner label={`Fetching live intel for ${comp.name}…`} />}
      {error   && <div className="ci-error"><i className="ti ti-alert-circle" /> {error}</div>}
      {data    && (
        <div className="ci-battlecard">
          <div className="ci-bc-header">
            <div>
              <div className="ci-bc-name">{comp.name}</div>
              <div className="ci-bc-meta">{comp.category} · {comp.icp}</div>
            </div>
            <div className="ci-bc-actions">
              <button className="ci-bc-btn" onClick={() => load(comp, true)}>
                <i className="ti ti-refresh" /> Refresh
              </button>
            </div>
          </div>
          <div className="ci-bc-body">
            <Section title="Positioning summary">
              <p className="ci-bc-text">{data.summary}</p>
            </Section>
            <Section title="Pricing">
              <div className="ci-bc-pricing-row">
                <PriceBox label="Close CRM" value="$49–$139/user/mo" />
                <PriceBox label={comp.name} value={comp.pricing} />
              </div>
            </Section>
            <div className="ci-two-col">
              <Section title="Where Close wins">
                <div className="ci-bc-pills">
                  {(data.closeWins || []).map((w, i) => <span key={i} className="ci-pill win">{w}</span>)}
                </div>
              </Section>
              <Section title={`Where ${comp.name} wins`}>
                <div className="ci-bc-pills">
                  {(data.compWins || []).map((w, i) => <span key={i} className="ci-pill lose">{w}</span>)}
                </div>
              </Section>
            </div>
            <Section title="Key objection + response">
              <p className="ci-bc-text" style={{ marginBottom: 8 }}><strong>Objection:</strong> {data.keyObjection}</p>
              <p className="ci-bc-text"><strong>Response:</strong> {data.objectionResponse}</p>
            </Section>
            <Section title="Killer talking point">
              <div className="ci-snippet-box">{data.talkingPoint}</div>
            </Section>
            <Section title="Recent intel">
              <p className="ci-bc-text">{data.recentNews}</p>
            </Section>
          </div>
        </div>
      )}
      {ts && <div className="ci-last-updated">Updated {ts}</div>}
    </>
  )
}

function SnippetView({ comp }) {
  const [text, setText]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [copied, setCopied]   = useState(false)
  const cache = useRef({})

  const load = async (c, force = false) => {
    if (!force && cache.current[c.id]) { setText(cache.current[c.id]); return }
    setLoading(true); setError(null); setText(null)
    try {
      const t = await fetchSnippet(c)
      cache.current[c.id] = t
      setText(t)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!text && !loading && !error) load(comp)

  const copy = () => {
    navigator.clipboard.writeText(text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      {loading && <Spinner label={`Generating snippet for ${comp.name}…`} />}
      {error   && <div className="ci-error">{error}</div>}
      {text    && (
        <Section title={`Email snippet — Close vs ${comp.name}`}>
          <div className="ci-snippet-box" style={{ position: 'relative' }}>
            <button className="ci-copy-btn" onClick={copy}>
              <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <div style={{ paddingRight: 60 }}>{text}</div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="ci-bc-btn" onClick={() => load(comp, true)}>
              <i className="ti ti-refresh" /> Regenerate
            </button>
          </div>
        </Section>
      )}
    </>
  )
}

function OverviewView({ onNavigate }) {
  return (
    <div>
      {COMPETITORS.map(c => (
        <div key={c.id} className="ci-battlecard" style={{ marginBottom: 10 }}>
          <div className="ci-bc-body" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                <span className={`ci-comp-chip-tier ${TIER_CLASS[c.tier]}`} style={{ marginLeft: 8 }}>
                  {TIER_LABELS[c.tier]}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{c.pricing}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {c.category} · {c.icp}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="ci-bc-btn" onClick={() => onNavigate('battlecard', c.id)}>
                <i className="ti ti-id" /> View battlecard
              </button>
              <button className="ci-bc-btn" onClick={() => onNavigate('snippet', c.id)}>
                <i className="ti ti-mail" /> Get snippet
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="ci-bc-section">
      <div className="ci-bc-section-title">{title}</div>
      {children}
    </div>
  )
}

function PriceBox({ label, value }) {
  return (
    <div className="ci-price-box">
      <div className="ci-price-label">{label}</div>
      <div className="ci-price-val">{value}</div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab]           = useState('battlecard')
  const [selectedId, setSelected] = useState('hubspot')
  const selected = COMPETITORS.find(c => c.id === selectedId)

  const navigate = (newTab, compId) => {
    setTab(newTab)
    setSelected(compId)
  }

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
      </header>

      <div className="ci-tabs">
        {['battlecard', 'snippet', 'overview'].map(t => (
          <button
            key={t}
            className={`ci-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}{t !== 'overview' ? 's' : ''}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="ci-overview-grid">
          {COMPETITORS.map(c => (
            <CompChip
              key={c.id}
              comp={c}
              selected={c.id === selectedId}
              onClick={id => setSelected(id)}
            />
          ))}
        </div>
      )}

      {tab === 'battlecard' && <BattlecardView key={selectedId} comp={selected} />}
      {tab === 'snippet'    && <SnippetView    key={selectedId} comp={selected} />}
      {tab === 'overview'   && <OverviewView   onNavigate={navigate} />}

      <style>{`
        .ci-header { padding: 1.25rem 0 1rem; border-bottom: 0.5px solid var(--color-border-tertiary); margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .ci-header-left { display: flex; align-items: center; gap: 10px; }
        .ci-logo { width: 28px; height: 28px; border-radius: 6px; background: var(--color-text-primary); display: flex; align-items: center; justify-content: center; color: var(--color-background-primary); font-size: 13px; font-weight: 500; }
        .ci-title { font-size: 15px; font-weight: 500; color: var(--color-text-primary); }
        .ci-subtitle { font-size: 12px; color: var(--color-text-secondary); }
        .ci-tabs { display: flex; gap: 4px; margin-bottom: 1rem; border-bottom: 0.5px solid var(--color-border-tertiary); overflow-x: auto; }
        .ci-tab { font-size: 12px; padding: 6px 14px; cursor: pointer; border: none; background: transparent; color: var(--color-text-secondary); border-bottom: 2px solid transparent; margin-bottom: -0.5px; white-space: nowrap; border-radius: 0; font-family: inherit; }
        .ci-tab.active { color: var(--color-text-primary); font-weight: 500; border-bottom-color: var(--color-text-primary); }
        .ci-tab:hover:not(.active) { color: var(--color-text-primary); }
        .ci-overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 1.25rem; }
        .ci-comp-chip { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 12px 14px; cursor: pointer; transition: border-color 0.15s; }
        .ci-comp-chip:hover { border-color: var(--color-border-primary); }
        .ci-comp-chip.selected { border: 2px solid var(--color-border-info); }
        .ci-comp-chip-name { font-size: 13px; font-weight: 500; margin-bottom: 3px; color: var(--color-text-primary); }
        .ci-comp-chip-cat { font-size: 11px; color: var(--color-text-secondary); }
        .ci-comp-chip-tier { display: inline-block; font-size: 10px; padding: 2px 7px; border-radius: 4px; margin-top: 6px; }
        .tier-1 { background: var(--color-background-danger); color: var(--color-text-danger); }
        .tier-2 { background: var(--color-background-warning); color: var(--color-text-warning); }
        .tier-3 { background: var(--color-background-info); color: var(--color-text-info); }
        .ci-battlecard { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); overflow: hidden; }
        .ci-bc-header { padding: 16px 18px 12px; border-bottom: 0.5px solid var(--color-border-tertiary); display: flex; justify-content: space-between; align-items: flex-start; }
        .ci-bc-name { font-size: 17px; font-weight: 500; color: var(--color-text-primary); }
        .ci-bc-meta { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
        .ci-bc-actions { display: flex; gap: 6px; }
        .ci-bc-btn { font-size: 11px; padding: 4px 10px; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); background: transparent; color: var(--color-text-secondary); cursor: pointer; display: flex; align-items: center; gap: 4px; font-family: inherit; }
        .ci-bc-btn:hover { background: var(--color-background-secondary); }
        .ci-bc-body { padding: 16px 18px; }
        .ci-bc-section { margin-bottom: 16px; }
        .ci-bc-section:last-child { margin-bottom: 0; }
        .ci-bc-section-title { font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .ci-bc-text { font-size: 13px; color: var(--color-text-primary); line-height: 1.6; }
        .ci-bc-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .ci-pill { font-size: 12px; padding: 3px 10px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-tertiary); color: var(--color-text-secondary); }
        .ci-pill.win { background: var(--color-background-success); color: var(--color-text-success); border-color: transparent; }
        .ci-pill.lose { background: var(--color-background-danger); color: var(--color-text-danger); border-color: transparent; }
        .ci-bc-pricing-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .ci-price-box { flex: 1; min-width: 120px; background: var(--color-background-secondary); border-radius: var(--border-radius-md); padding: 10px 12px; }
        .ci-price-label { font-size: 10px; color: var(--color-text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .ci-price-val { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
        .ci-snippet-box { background: var(--color-background-secondary); border-radius: var(--border-radius-md); padding: 12px 14px; font-size: 13px; color: var(--color-text-primary); line-height: 1.6; position: relative; }
        .ci-copy-btn { position: absolute; top: 8px; right: 8px; background: var(--color-background-primary); border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); padding: 3px 8px; font-size: 11px; cursor: pointer; color: var(--color-text-secondary); display: flex; align-items: center; gap: 3px; font-family: inherit; }
        .ci-copy-btn:hover { color: var(--color-text-primary); }
        .ci-loading { display: flex; align-items: center; gap: 8px; padding: 24px 0; font-size: 13px; color: var(--color-text-secondary); }
        .ci-spinner { width: 16px; height: 16px; border: 1.5px solid var(--color-border-secondary); border-top-color: var(--color-text-secondary); border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ci-error { font-size: 13px; color: var(--color-text-danger); padding: 12px 0; }
        .ci-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ci-last-updated { font-size: 11px; color: var(--color-text-tertiary); margin-top: 10px; text-align: right; }
        @media (max-width: 500px) { .ci-two-col { grid-template-columns: 1fr; } }
      `}</style>
    </>
  )
}
