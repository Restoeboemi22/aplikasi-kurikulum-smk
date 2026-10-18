export type DefaultSubject = {
  code: string;
  name: string;
  levels?: string;
};

export const DEFAULT_SUBJECTS: DefaultSubject[] = [
  { code: "PABP", name: "Pendidikan Agama Islam dan Budi Pekerti", levels: "X,XI,XII" },
  { code: "PPS", name: "Pendidikan Pancasila", levels: "X,XI,XII" },
  { code: "BIN", name: "Bahasa Indonesia", levels: "X,XI,XII" },
  { code: "PJOK", name: "Pendidikan Jasmani , Olah Raga dan Kesehatan", levels: "X,XI" },
  { code: "SEJ", name: "Sejarah", levels: "X,XI" },
  { code: "SBD", name: "Seni Budaya", levels: "X" },
  { code: "BSJ", name: "Bahasa dan Sastra Jawa", levels: "X,XI,XII" },
  { code: "MTK", name: "Matematika", levels: "X,XI,XII" },
  { code: "BIG", name: "Bahasa Inggris", levels: "X,XI,XII" },
  { code: "INF", name: "Informatika", levels: "X" },
  { code: "IPAS", name: "Projek Ilmu Pengetahuan Alam dan Sosial", levels: "X" },
  { code: "DDPK", name: "Dasar-Dasar Program Keahlian", levels: "X" },
  { code: "KK", name: "Konsentrasi Keahlian", levels: "XI,XII" },
  { code: "PKK", name: "Projek Kreatif dan Kewirausahaan", levels: "XI,XII" },
  { code: "PKL", name: "Praktik Kerja Lapangan", levels: "XII" },
  { code: "BK", name: "Bimbingan Konseling", levels: "X,XI,XII" },
];

