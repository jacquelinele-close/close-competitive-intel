export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not set' })

    // List blobs using REST API directly
    const listRes = await fetch(
      'https://blob.vercel-storage.com?prefix=battlecards-cache&limit=1',
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    if (!listRes.ok) {
      const errText = await listRes.text()
      return res.status(500).json({ error: `List failed: ${listRes.status}`, detail: errText })
    }

    const listData = await listRes.json()
    const blobs = listData.blobs || []

    if (blobs.length === 0) {
      return res.status(404).json({ error: 'Cache not yet generated. Click Refresh all to generate.' })
    }

    // Fetch the cached JSON from the blob URL
    const cacheRes = await fetch(blobs[0].url)
    if (!cacheRes.ok) {
      return res.status(500).json({ error: `Fetch blob failed: ${cacheRes.status}` })
    }

    const cache = await cacheRes.json()
    return res.status(200).json(cache)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
