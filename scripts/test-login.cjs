const https = require('https');

async function testLogin() {
  console.log('1. Signing in with Firebase Auth REST API...');
  const apiKey = 'AIzaSyATcC8lCeWAkd35vTBvLPGbJSl23QI5k4M';
  const authRes = await postJson(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    email: '03041984@kurikulum-smks-pacet.local',
    password: 'smks_pacet',
    returnSecureToken: true
  });

  if (!authRes.idToken) {
    console.error('Firebase Auth sign in failed:', authRes);
    return;
  }
  console.log('Firebase Auth success! Email:', authRes.email, 'idToken length:', authRes.idToken.length);

  console.log('2. Calling /api/auth/session on live web app...');
  const sessionRes = await postSession('https://aplikasi-kurikulum-smks-pacet.web.app/api/auth/session', {
    idToken: authRes.idToken
  });

  console.log('Session response status:', sessionRes.statusCode);
  console.log('Session headers:', sessionRes.headers);
  console.log('Session body:', sessionRes.body);

  const rawCookie = sessionRes.headers['set-cookie'];
  if (rawCookie) {
    const cleanCookie = (Array.isArray(rawCookie) ? rawCookie[0] : rawCookie).split(';')[0];
    console.log('Clean cookie:', cleanCookie.slice(0, 40) + '...');
    console.log('3. Testing /api/subjects with clean session cookie...');
    const subjectsRes = await getWithCookie('https://aplikasi-kurikulum-smks-pacet.web.app/api/subjects', cleanCookie);
    console.log('Subjects response status:', subjectsRes.statusCode);
    console.log('Subjects count:', Array.isArray(subjectsRes.body) ? subjectsRes.body.length : subjectsRes.body);
  }
}

function postJson(urlStr, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function postSession(urlStr, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { body = JSON.parse(body); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getWithCookie(urlStr, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Cookie': Array.isArray(cookie) ? cookie.join('; ') : cookie
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { body = JSON.parse(body); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

testLogin().catch(console.error);
