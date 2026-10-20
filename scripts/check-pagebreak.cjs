const https = require('https');
https.get('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const idx = data.indexOf('mode:');
    console.log(data.slice(idx, idx + 1500));
  });
});
