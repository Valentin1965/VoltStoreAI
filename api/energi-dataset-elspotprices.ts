/**
 * GET /api/energi-dataset-elspotprices?... → https://api.energidataservice.dk/dataset/Elspotprices?...
 * Single-segment path: reliable on Vercel (nested /api/energi/dataset/... often 404s).
 */
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const params = new URLSearchParams()
  const q = req.query || {}
  for (const [key, val] of Object.entries(q)) {
    if (val == null) continue
    if (Array.isArray(val)) val.forEach((v) => params.append(key, String(v)))
    else params.append(key, String(val))
  }
  const upstream = `https://api.energidataservice.dk/dataset/Elspotprices?${params.toString()}`
  try {
    const r = await fetch(upstream)
    const text = await r.text()
    res.status(r.status)
    const ct = r.headers.get('content-type')
    if (ct) res.setHeader('Content-Type', ct)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(text)
  } catch (e) {
    console.error('[energi proxy]', e)
    res.status(502).json({ error: 'Upstream fetch failed' })
  }
}
