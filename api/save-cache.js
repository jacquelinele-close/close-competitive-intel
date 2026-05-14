import { put } from '@vercel/blob'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    let body = req.body
    // Handle cases where body might be a string
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch(e) {}
    }

    const { data, refreshedAt } = body || {}

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No data provided', receivedKeys: Object.keys(body || {}) })
    }

    const payload = JSON.stringify({
      data,
      refreshedAt: refreshedAt || new Date().toISOString(),
      nextRefresh: 'Sunday midnight UTC'
    })

    const blob = await put('battlecards-cache.json', payload, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return res.status(200).json({ success: true, blobUrl: blob.url, cached: Object.keys(data).length })
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack?.split('\n')[0] })
  }
}
