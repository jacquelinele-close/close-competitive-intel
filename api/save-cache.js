export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch(e) {} }

    const { data, refreshedAt } = body || {}
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No data provided' })
    }

    const payload = JSON.stringify({
      data,
      refreshedAt: refreshedAt || new Date().toISOString(),
      nextRefresh: 'Sunday midnight UTC'
    })

    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not set' })

    // Use Vercel Blob REST API directly — no package needed
    const blobRes = await fetch('https://blob.vercel-storage.com/battlecards-cache.json', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-content-type': 'application/json',
        'x-cache-control': 'public, max-age=0',
      },
      body: payload,
    })

    if (!blobRes.ok) {
      const errText = await blobRes.text()
      return res.status(500).json({ error: `Blob PUT failed: ${blobRes.status}`, detail: errText })
    }

    const blobData = await blobRes.json()
    return res.status(200).json({ success: true, blobUrl: blobData.url, cached: Object.keys(data).length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
