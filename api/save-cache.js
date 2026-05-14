import { put } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    const { data, refreshedAt } = req.body

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No data provided' })
    }

    const blob = await put('battlecards-cache.json', JSON.stringify({
      data,
      refreshedAt: refreshedAt || new Date().toISOString(),
      nextRefresh: 'Sunday midnight UTC'
    }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })

    return res.status(200).json({ success: true, blobUrl: blob.url, cached: Object.keys(data).length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
