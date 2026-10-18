const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_LEVEL_MAPPINGS = {
  PABP: "X,XI,XII",
  PPS: "X,XI,XII",
  BIN: "X,XI,XII",
  PJOK: "X,XI",
  SEJ: "X,XI",
  SBD: "X",
  BSJ: "X,XI,XII",
  MTK: "X,XI,XII",
  BIG: "X,XI,XII",
  INF: "X",
  IPAS: "X",
  DDPK: "X",
  KK: "XI,XII",
  PKK: "XI,XII",
  PKL: "XII",
  BK: "X,XI,XII",
};

async function main() {
  console.log("1. Adding column 'levels' to 'Subject' table if not exists...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "levels" TEXT DEFAULT 'X,XI,XII';
  `);
  console.log("Column 'levels' verified/added.");

  console.log("2. Updating existing subjects with standard SMK levels...");
  const subjects = await prisma.subject.findMany();
  for (const s of subjects) {
    const codeUpper = (s.code || "").trim().toUpperCase();
    const mappedLevels = DEFAULT_LEVEL_MAPPINGS[codeUpper] || "X,XI,XII";
    await prisma.$executeRawUnsafe(
      `UPDATE "Subject" SET "levels" = $1 WHERE "id" = $2;`,
      mappedLevels,
      s.id
    );
    console.log(`Updated subject [${s.code}] ${s.name} -> levels: ${mappedLevels}`);
  }

  console.log("3. Verifying updated subjects from database...");
  const updated = await prisma.$queryRawUnsafe(`
    SELECT "code", "name", "levels" FROM "Subject" ORDER BY "code" ASC;
  `);
  console.log("Current DB subjects with levels:", updated);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
