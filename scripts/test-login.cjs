const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: '01111986@kurikulum-smks-pacet.local', password: 'guru123', returnSecureToken: true })
}).then(r => r.json()).then(data => console.log(data.idToken ? 'SUCCESS' : data.error.message)).catch(console.error);
