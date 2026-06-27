const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const subjects = [
  { code: "PABP", name: "Pendidikan Agama dan Budi Pekerti" },
  { code: "PPS", name: "Pendidikan Pancasila" },
  { code: "BIN", name: "Bahasa Indonesia" },
  { code: "PJOK", name: "Pendidikan Jasmani , Olah Raga dan Kesehatan" },
  { code: "SEJ", name: "Sejarah" },
  { code: "SBD", name: "Seni Budaya" },
  { code: "BSJ", name: "Bahasa dan Sastra Jawa" },
  { code: "MTK", name: "Matematika" },
  { code: "BIG", name: "Bahasa Inggris" },
  { code: "INF", name: "Informatika" },
  { code: "IPAS", name: "Projek Ilmu Pengetahuan Alam dan Sosial" },
  { code: "DDPK", name: "Dasar-Dasar Program Keahlian" },
  { code: "KK", name: "Konsentrasi Keahlian" },
  { code: "PKK", name: "Projek Kreatif dan Kewirausahaan" },
  { code: "PKL", name: "Praktik Kerja Lapangan" },
  { code: "MPP", name: "Mata Pelajaran pilihan" },
];

(async () => {
  const result = await prisma.subject.createMany({ data: subjects, skipDuplicates: true });
  console.log(JSON.stringify({ createdCount: result.count, totalDefaults: subjects.length }, null, 2));
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
