const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'Subject';
  `;
  console.log("Subject columns:", columns);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
