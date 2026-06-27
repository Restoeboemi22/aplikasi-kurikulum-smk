const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      nip: true,
      role: true,
      teacher: { select: { id: true, kodeGuru: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
