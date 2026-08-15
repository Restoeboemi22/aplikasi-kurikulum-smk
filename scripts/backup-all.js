const { PrismaClient } = require('@prisma/client');
const { list } = require('@vercel/blob');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

const models = [
  'user', 'teacher', 'teachingAssignment', 'subject', 'classMajor',
  'student', 'curriculum', 'guidanceBookEntry', 'schedule', 'classPicketSchedule',
  'classPicketReport', 'aIScheduleConfig', 'religiousPicketSchedule',
  'religiousPicketReport', 'curriculumSubmission', 'curriculumActivity',
  'journal', 'grade', 'calendarEvent', 'teachingObjective', 'reportCardSupplement'
];

async function backupDatabase() {
  console.log("--- Starting Database Backup ---");
  const backupDir = path.join(__dirname, '../backup_data', 'database');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  for (const model of models) {
    try {
      const data = await prisma[model].findMany();
      fs.writeFileSync(path.join(backupDir, `${model}.json`), JSON.stringify(data, null, 2));
      console.log(`✅ ${model}: ${data.length} records saved.`);
    } catch (e) {
      console.error(`❌ Error on ${model}:`, e.message);
    }
  }
}

async function backupBlobs() {
  console.log("\n--- Starting Vercel Blob Backup ---");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.log('⚠️ BLOB_READ_WRITE_TOKEN not found in .env.local');
    return;
  }

  const blobDir = path.join(__dirname, '../backup_data', 'blobs');
  if (!fs.existsSync(blobDir)) fs.mkdirSync(blobDir, { recursive: true });

  try {
    let hasMore = true;
    let cursor;
    let total = 0;
    
    console.log("Fetching list of files from Vercel...");
    
    while (hasMore) {
      const listResult = await list({ token, cursor });
      
      for (const blob of listResult.blobs) {
        const safeName = blob.pathname.replace(/[\/\\]/g, '_');
        const dest = path.join(blobDir, safeName);
        
        await new Promise((resolve, reject) => {
          https.get(blob.url, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`Failed to download: ${res.statusCode}`));
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
          }).on('error', reject);
        });
        
        console.log(`✅ Downloaded: ${blob.pathname}`);
        total++;
      }
      
      hasMore = listResult.hasMore;
      cursor = listResult.cursor;
    }
    console.log(`\n🎉 Blob backup finished! Total files: ${total}`);
  } catch (err) {
    console.error("❌ Error backing up blobs:", err.message);
  }
}

async function main() {
  await backupDatabase();
  await backupBlobs();
  await prisma.$disconnect();
  console.log("\n✅ SEMUA PROSES BACKUP SELESAI! ✅");
}

main();
