/* Vercel Serverless — прокси для JSONBin
   env vars: JSONBIN_API_KEY, JSONBIN_BIN_ID
   Установите их в Vercel Dashboard → Settings → Environment Variables
*/
export default async function handler(req, res) {
  const isLatest = req.query.latest === 'true';
  const url = `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}${isLatest ? '/latest' : ''}`;

  const options = {
    method: req.method,
    headers: {
      'X-Master-Key': process.env.JSONBIN_API_KEY,
      'Content-Type': 'application/json'
    }
  };

  if (req.method === 'PUT') {
    options.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
