const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const teachers = await prisma.teacher.findMany({
    select: {
      id: true,
      kodeGuru: true,
      mataPelajaran: true,
      user: { select: { id: true, name: true, email: true, nip: true, role: true } },
    },
    orderBy: { kodeGuru: "asc" },
  });

  console.log(JSON.stringify(teachers, null, 2));
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
