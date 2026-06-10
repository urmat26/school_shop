/* Vercel Serverless — прокси для ImgBB
   env var: IMGBB_API_KEY
   Установите в Vercel Dashboard → Settings → Environment Variables
   Клиент присылает JSON: { image: "base64string" }
*/
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Missing image' });

  const buffer = Buffer.from(image, 'base64');
  const formData = new FormData();
  formData.append('image', new Blob([buffer]), 'image.jpg');

  try {
    const response = await fetch('https://api.imgbb.com/1/upload?key=' + process.env.IMGBB_API_KEY, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
