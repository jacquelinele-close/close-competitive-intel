import { list, head } from '@vercel/blob'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  try {
    // List all blobs to find our cache file
    const { blobs } = await list({
      prefix: 'battlecards-cache',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: 'Cache not yet generated. Click Refresh all to generate.' })
    }

    // Fetch the cached JSON
    const cacheRes = await fetch(blobs[0].url)
    if (!cacheRes.ok) {
      return res.status(500).json({ error: `Failed to fetch blob: ${cacheRes.status}` })
    }

    const cache = await cacheRes.json()
    return res.status(200).json(cache)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
