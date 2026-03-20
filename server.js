// IWishIInvested — local proxy server
// Run: node server.js
// Then open index.html with Live Server as usual

const http  = require('http');
const https = require('https');

const PORT = 3001;
const ALLOWED_HOSTS = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'api.openfigi.com',
];

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-OPENFIGI-APIKEY');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  let target;
  try {
    target = new URL(decodeURIComponent(req.url.slice(1)));
  } catch {
    res.writeHead(400); return res.end('Bad target URL');
  }

  if (!ALLOWED_HOSTS.includes(target.hostname)) {
    res.writeHead(403); return res.end('Host not allowed');
  }

  const isYahoo   = target.hostname.includes('yahoo.com');
  const isOpenfigi = target.hostname === 'api.openfigi.com';

  const options = {
    hostname : target.hostname,
    path     : target.pathname + target.search,
    method   : req.method,
    headers  : {
      'Accept'        : 'application/json',
      'Content-Type'  : req.headers['content-type'] || 'application/json',
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
    console.log(`  ${req.method} ${target.hostname}${target.pathname} → ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode, {
      'Content-Type'                : proxyRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin' : '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  });

  // Forward POST body
  if (req.method === 'POST') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }

}).listen(PORT, '127.0.0.1', () => {
  console.log('\n  ✓ IWishIInvested proxy ready at http://localhost:' + PORT);
  console.log('  Keep this terminal open while using the app.\n');
});
