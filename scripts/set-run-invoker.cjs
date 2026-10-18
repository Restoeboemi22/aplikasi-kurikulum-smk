const fs = require('fs');
const https = require('https');
const path = require('path');
const os = require('os');

async function main() {
  const configFile = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configFile)) {
    console.error('Config file not found:', configFile);
    return;
  }
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const tokens = config.tokens;
  let accessToken = tokens.access_token;
  console.log('User:', config.user?.email);

  // If token might need refresh, try refresh
  if (tokens.refresh_token) {
    try {
      const refreshed = await refreshToken(tokens.refresh_token);
      if (refreshed.access_token) {
        accessToken = refreshed.access_token;
        console.log('Access token successfully refreshed');
      }
    } catch (err) {
      console.log('Refresh failed, attempting with current access token...', err.message);
    }
  }

  // 1. Get current IAM policy
  const serviceName = 'projects/aplikasi-kurikulum-smks-pacet/locations/us-central1/services/ssraplikasikurikulumsmk';
  const getUrl = `https://run.googleapis.com/v1/${serviceName}:getIamPolicy`;
  
  console.log('Getting current IAM policy for Cloud Run...');
  const currentPolicy = await doRequest(getUrl, 'GET', accessToken);
  console.log('Current policy:', JSON.stringify(currentPolicy, null, 2));

  // Add allUsers to roles/run.invoker
  const bindings = currentPolicy.bindings || [];
  let invokerBinding = bindings.find(b => b.role === 'roles/run.invoker');
  if (!invokerBinding) {
    invokerBinding = { role: 'roles/run.invoker', members: [] };
    bindings.push(invokerBinding);
  }
  if (!invokerBinding.members.includes('allUsers')) {
    invokerBinding.members.push('allUsers');
  }

  const setUrl = `https://run.googleapis.com/v1/${serviceName}:setIamPolicy`;
  const setBody = {
    policy: {
      bindings: bindings
    }
  };

  console.log('Setting updated IAM policy...');
  const setResult = await doRequest(setUrl, 'POST', accessToken, setBody);
  console.log('Set IAM result:', JSON.stringify(setResult, null, 2));
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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

main().catch(console.error);
