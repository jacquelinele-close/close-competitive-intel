export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  try {
    // List blobs to find our cache file
    const listRes = await fetch(
      `https://blob.vercel-storage.com?prefix=battlecards-cache`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        },
      }
    )

    const listData = await listRes.json()
    const blobs = listData.blobs || []

    if (blobs.length === 0) {
      return res.status(404).json({ error: 'Cache not yet generated. Trigger /api/refresh first.' })
    }

    // Fetch the cached data
    const cacheRes = await fetch(blobs[0].url)
    const cache = await cacheRes.json()

    return res.status(200).json(cache)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
