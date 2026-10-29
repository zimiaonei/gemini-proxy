export const config = {
  regions: ['iad1'],
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // 1. 拼接 Google 官方真实端点
  const url = new URL(req.url, 'https://generativelanguage.googleapis.com');
  const targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;

  // 2. 清洗入站请求头：剔除所有暴露真实 IP 的标头
  const newHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    const k = key.toLowerCase();
    if (
      !k.startsWith('x-forwarded') &&
      !k.startsWith('x-real-ip') &&
      !k.startsWith('x-vercel') &&
      !k.startsWith('cf-') &&
      k !== 'host' &&
      k !== 'content-length'
    ) {
      newHeaders[k] = value;
    }
  }
  newHeaders['host'] = 'generativelanguage.googleapis.com';

  try {
    const fetchOptions = {
      method: req.method,
      headers: newHeaders,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const response = await fetch(targetUrl, fetchOptions);

    // 3. 清洗出站响应头：关键修复点！
    // 剔除 content-encoding 和 content-length，防止客户端重复解压报错
    response.headers.forEach((val, key) => {
      const k = key.toLowerCase();
      if (
        k !== 'content-encoding' &&
        k !== 'content-length' &&
        k !== 'transfer-encoding'
      ) {
        res.setHeader(key, val);
      }
    });

    const data = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(data));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
}
