const fs = require('fs');
const https = require('https');
const path = require('path');
const os = require('os');

async function main() {
  const configFile = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const tokens = config.tokens;
  let accessToken = tokens.access_token;

  if (tokens.refresh_token) {
    try {
      const refreshed = await refreshToken(tokens.refresh_token);
      if (refreshed.access_token) accessToken = refreshed.access_token;
    } catch (e) {}
  }

  const funcName = 'projects/aplikasi-kurikulum-smks-pacet/locations/us-central1/functions/ssraplikasikurikulumsmk';
  const patchUrl = `https://cloudfunctions.googleapis.com/v2/${funcName}?updateMask=serviceConfig.availableMemory%2CserviceConfig.availableCpu`;

  console.log('Updating Cloud Function memory to 1024M and CPU to 1...');
  const res = await doRequest(patchUrl, 'PATCH', accessToken, {
    serviceConfig: {
      availableMemory: '1024M',
      availableCpu: '1'
    }
  });

  console.log('Update operation:', JSON.stringify(res, null, 2));
}

function refreshToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho85qd6.apps.googleusercontent.com',
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function doRequest(urlStr, method, token, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

main().catch(console.error);
