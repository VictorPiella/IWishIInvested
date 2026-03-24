// Vercel Serverless Function — CORS proxy for Yahoo Finance & OpenFIGI

const https = require('https');

const ALLOWED_HOSTS = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'api.openfigi.com',
];

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-OPENFIGI-APIKEY');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  let target;
  try {
    const urlParam = new URL(req.url, 'http://localhost').searchParams.get('url');
    if (!urlParam) { res.status(400).end('Missing url param'); return; }
    target = new URL(urlParam);
  } catch {
    res.status(400).end('Bad target URL'); return;
  }

  if (!ALLOWED_HOSTS.includes(target.hostname)) {
    res.status(403).end('Host not allowed'); return;
  }

  const isYahoo    = target.hostname.includes('yahoo.com');
  const isOpenfigi = target.hostname === 'api.openfigi.com';

  const options = {
    hostname : target.hostname,
    path     : target.pathname + target.search,
    method   : req.method,
    headers  : {
      'Accept'       : 'application/json',
      'Content-Type' : req.headers['content-type'] || 'application/json',
      ...(isYahoo && {
        'User-Agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept'          : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language' : 'en-US,en;q=0.5',
        'Accept-Encoding' : 'identity',
        'Referer'         : 'https://finance.yahoo.com/',
        'Origin'          : 'https://finance.yahoo.com',
      }),
      ...(isOpenfigi && req.headers['x-openfigi-apikey'] && {
        'X-OPENFIGI-APIKEY': req.headers['x-openfigi-apikey'],
      }),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode).setHeader(
      'Content-Type',
      proxyRes.headers['content-type'] || 'application/json',
    );
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.status(502).json({ error: e.message });
  });

  if (req.method === 'POST') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
};
