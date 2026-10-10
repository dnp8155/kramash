import https from 'node:https';

const version = "1.1.7";
const payload = JSON.stringify({
  version,
  title: `🚀 Kramasha v${version} Live!`,
  content: "New PDF templates, saved passwords, quotation link toggle and support tickets. Tap to update!",
  url: "/app-updates"
});

const req = https.request({
  hostname: 'fyfbpboxdkyxsgjbvqmg.supabase.co',
  path: '/functions/v1/broadcastAppUpdate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-cron-secret': 'kramash_cron_secret_7b29a1d3f90e',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`[Push Broadcast Response] HTTP ${res.statusCode}: ${body}`);
  });
});

req.on('error', (e) => {
  console.error('[Push Broadcast Error]', e.message);
});

req.write(payload);
req.end();
