const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    requestType: 'PASSWORD_RESET', 
    email: '29041982@kurikulum-smks-pacet.local', 
    returnOobLink: true 
  })
}).then(r => r.json()).then(console.log).catch(console.error);
