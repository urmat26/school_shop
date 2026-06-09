/* Vercel Serverless — прокси для ImgBB
   env var: IMGBB_API_KEY
   Установите в Vercel Dashboard → Settings → Environment Variables
*/
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const formData = new FormData();
  formData.append('image', req.body.image);

  try {
    const response = await fetch('https://api.imgbb.com/1/upload?key=' + process.env.IMGBB_API_KEY, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
