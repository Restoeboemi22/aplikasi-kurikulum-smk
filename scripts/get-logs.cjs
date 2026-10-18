const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
const token = config.tokens.access_token;

const postData = JSON.stringify({
  resourceNames: ['projects/aplikasi-kurikulum-smks-pacet'],
  filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="ssraplikasikurikulumsmk"',
  orderBy: 'timestamp desc',
  pageSize: 15
});

const req = https.request({
  hostname: 'logging.googleapis.com',
  path: '/v2/entries:list',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.entries) {
        parsed.entries.forEach(e => {
          const reqInfo = e.httpRequest ? `${e.httpRequest.requestMethod} ${e.httpRequest.requestUrl} -> ${e.httpRequest.status}` : '';
          console.log(e.timestamp, e.severity || 'DEFAULT', reqInfo, e.textPayload || JSON.stringify(e.jsonPayload) || '');
        });
      } else {
        console.log(data);
      }
    } catch (e) {
      console.log(data);
    }
  });
});
req.write(postData);
req.end();
