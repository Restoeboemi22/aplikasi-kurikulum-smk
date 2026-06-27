"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Loader2,
  AlertCircle,
  BookOpen,
  ChevronRight,
  Download,
  Upload,
} from "lucide-react";
import { ClassMajorOption } from "@/lib/class-major-options";
import { splitSubjects } from "@/lib/current-teacher";
import {
  buildSemesterLabel,
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
} from "@/lib/grade-period";

// ─── Konstanta ────────────────────────────────────────────────────────────────

const DEFAULT_SUBJECTS = [
  { id: 1, name: "Pendidikan Agama dan Budi Pekerti", code: "PABP" },
  { id: 2, name: "Pendidikan Pancasila", code: "PPKn" },
  { id: 3, name: "Bahasa Indonesia", code: "BIN" },
  { id: 4, name: "Pendidikan Jasmani, Olah Raga dan Kesehatan", code: "PJOK" },
  { id: 5, name: "Sejarah", code: "SEJ" },
  { id: 6, name: "Seni Budaya", code: "SB" },
  { id: 7, name: "Bahasa dan Sastra Jawa", code: "BSJ" },
  { id: 8, name: "Matematika", code: "MTK" },
  { id: 9, name: "Bahasa Inggris", code: "BING" },
  { id: 10, name: "Informatika", code: "IF" },
  { id: 11, name: "Projek Ilmu Pengetahuan Alam dan Sosial", code: "PIPS" },
  { id: 12, name: "Dasar-Dasar Program Keahlian", code: "DDPK" },
  { id: 13, name: "Konsentrasi Keahlian", code: "KK" },
  { id: 14, name: "Projek Kreatif dan Kewirausahaan", code: "PKK" },
  { id: 15, name: "Praktik Kerja Lapangan", code: "PKL" },
];

// ─── Tipe ─────────────────────────────────────────────────────────────────────

interface Teacher {
  id: string;
  userId?: string;
  kodeGuru: string;
  tanggalLahir: string;
  name: string;
  email?: string;
  nip?: string;
  mataPelajaran: string;
  tingkatKelas: string[];
  jurusan: string[];
  jenisKelamin: string;
  teachingAssignments?: TeachingAssignmentEntry[];
}

interface TeachingAssignmentEntry {
  id?: string;
  subject: string;
  className: string;
  classLevel?: string;
  majorCode?: string;
  majorName?: string | null;
}

interface TeacherFormData {
  kodeGuru: string;
  nip: string;
  tanggalLahir: string;
  name: string;
  jenisKelamin: string;
  teachingAssignments: TeachingAssignmentEntry[];
}

interface Subject {
  id: string | number;
  code: string;
  name: string;
}

// Tipe data nilai satu siswa (setara $row di PHP)
interface NilaiSiswa {
  id_siswa: string;
  nama: string;
  // AH = Asesmen Harian (ah1, ah2, ah3)
  uh_1: number | null;
  uh_2: number | null;
  uh_3: number | null;
  rata_rata_uh: number | null;   // setara $rh di PHP
  // Tugas
  tugas_1: number | null;
  tugas_2: number | null;
  tugas_3: number | null;
  rata_rata_tugas: number | null; // setara $rt di PHP
  // Sumatif
  sts: number | null;
  sas: number | null;
  // Afektif & Akhir
  nilai_sikap: number | null;
  nilai_raport: number | null;   // setara $nilai_raport di PHP
}

// Menu yang bisa dipilih guru (setara "menu_yang_diklik" di pseudo-code)
type MenuNilai = "UH" | "Tugas" | "STS" | "SAS" | "Nilai Sikap";

const MENU_ITEMS: { key: MenuNilai; label: string; color: string }[] = [
  { key: "UH",           label: "Asesmen Harian",    color: "bg-blue-100 text-blue-700 border-blue-300" },
  { key: "Tugas",        label: "Tugas",              color: "bg-purple-100 text-purple-700 border-purple-300" },
  { key: "STS",          label: "STS",                color: "bg-orange-100 text-orange-700 border-orange-300" },
  { key: "SAS",          label: "SAS",                color: "bg-teal-100 text-teal-700 border-teal-300" },
  { key: "Nilai Sikap",  label: "Nilai Sikap",        color: "bg-pink-100 text-pink-700 border-pink-300" },
];

interface StudentRecord {
  id: string;
  nis?: string;
  name: string;
  className?: string;
}

interface GradeRecord {
  id: string;
  studentId: string;
  student?: StudentRecord;
  subject?: string;
  jenisPenilaian: "UH" | "TUGAS" | "STS" | "SAS" | "SIKAP";
  nilai1?: string | null;
  nilai2?: string | null;
  nilai3?: string | null;
  nilaiAkhir?: string | null;
}

interface TeacherClassOption {
  key: string;
  label: string;
  grade: string;
  major: string;
}

// ─── Fungsi Utilitas ───────────────────────────────────────────────────────────

const fmt = (v: number | null) => (v === null ? "–" : v);

const toNumber = (value?: string | null) => {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateAverage = (...values: Array<number | null>) => {
  const validValues = values.filter((value): value is number => value !== null);
  if (validValues.length === 0) return null;
  return Math.round((validValues.reduce((sum, value) => sum + value, 0) / validValues.length) * 100) / 100;
};

const calculateRaport = (nilai: NilaiSiswa) => {
  if (
    nilai.rata_rata_uh === null ||
    nilai.rata_rata_tugas === null ||
    nilai.sts === null ||
    nilai.sas === null
  ) {
    return null;
  }

  return Math.round(
    (0.3 * nilai.rata_rata_uh +
      0.2 * nilai.rata_rata_tugas +
      0.2 * nilai.sts +
      0.3 * nilai.sas) *
      100
  ) / 100;
};

const dedupeTeachingAssignments = (assignments: TeachingAssignmentEntry[]) =>
  Array.from(
    new Map(
      assignments
        .filter((assignment) => assignment.subject && assignment.className)
        .map((assignment) => [`${assignment.subject}::${assignment.className}`, assignment])
    ).values()
  );

const buildTeacherAssignmentSummary = (assignments: TeachingAssignmentEntry[]) => ({
  mataPelajaran: Array.from(new Set(assignments.map((assignment) => assignment.subject))).join(", "),
  tingkatKelas: Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.classLevel || assignment.className.split(" ")[0] || "")
        .filter(Boolean)
    )
  ),
  jurusan: Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.majorCode || assignment.className.split(" ")[1] || "")
        .filter(Boolean)
    )
  ),
});

const serializeTeachingAssignments = (assignments: TeachingAssignmentEntry[]) =>
  assignments.map((assignment) => `${assignment.subject}|${assignment.className}`).join("; ");

const parseTeachingAssignmentsCell = (
  value: unknown,
  classMajors: ClassMajorOption[]
): TeachingAssignmentEntry[] =>
  dedupeTeachingAssignments(
    String(value || "")
      .split(/[;\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [subjectPart, classNamePart] = item.split("|").map((part) => part.trim());
        if (!subjectPart || !classNamePart) return null;
        const classInfo = classMajors.find((classMajor) => classMajor.className === classNamePart);
        return {
          subject: subjectPart,
          className: classNamePart,
          classLevel: classInfo?.grade || classNamePart.split(" ")[0] || "",
          majorCode: classInfo?.majorCode || classNamePart.split(" ")[1] || "",
          majorName: classInfo?.majorName || null,
        };
      })
      .filter(Boolean) as TeachingAssignmentEntry[]
  );

const buildAssignmentsFromLegacyColumns = (
  subjects: string[],
  grades: string[],
  majors: string[],
  classMajors: ClassMajorOption[]
) =>
  dedupeTeachingAssignments(
    classMajors
      .filter((item) => grades.includes(item.grade) && majors.includes(item.majorCode))
      .flatMap((item) =>
        subjects.map((subject) => ({
          subject,
          className: item.className,
          classLevel: item.grade,
          majorCode: item.majorCode,
          majorName: item.majorName || null,
        }))
      )
  );

const buildAssignmentsFromTeacherData = (teacher: Teacher, classMajors: ClassMajorOption[]) => {
  if (teacher.teachingAssignments && teacher.teachingAssignments.length > 0) {
    return dedupeTeachingAssignments(teacher.teachingAssignments);
  }

  return buildAssignmentsFromLegacyColumns(
    splitSubjects(teacher.mataPelajaran),
    teacher.tingkatKelas || [],
    teacher.jurusan || [],
    classMajors
  );
};

const padDatePart = (value: number) => String(value).padStart(2, "0");

const toIsoDateString = (year: number, month: number, day: number) =>
  `${year}-${padDatePart(month)}-${padDatePart(day)}`;

const normalizeTeacherBirthDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDateString(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    const parsedExcelDate = XLSX.SSF.parse_date_code(Number(rawValue));
    if (parsedExcelDate) {
      return toIsoDateString(parsedExcelDate.y, parsedExcelDate.m, parsedExcelDate.d);
    }
  }

  const dateMatch = rawValue.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const yearPart = Number(dateMatch[3]);
    const year = dateMatch[3].length === 2 ? (yearPart >= 50 ? 1900 + yearPart : 2000 + yearPart) : yearPart;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return toIsoDateString(year, month, day);
    }
  }

  const parsedDate = new Date(rawValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return toIsoDateString(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate());
  }

  return "";
};

const formatTeacherBirthDate = (value?: string | null) => {
  const normalizedValue = normalizeTeacherBirthDate(value);
  if (!normalizedValue) return "-";

  const [year, month, day] = normalizedValue.split("-");
  return `${day}/${month}/${year}`;
};

const getTeacherClassOptions = (teacher: Teacher, classMajors: ClassMajorOption[]): TeacherClassOption[] => {
  if (teacher.teachingAssignments && teacher.teachingAssignments.length > 0) {
    return Array.from(
      new Map(
        teacher.teachingAssignments.map((assignment) => [
          assignment.className,
          {
            key: assignment.className,
            label: assignment.className,
            grade: assignment.classLevel || assignment.className.split(" ")[0] || "",
            major: assignment.majorCode || assignment.className.split(" ")[1] || "",
          },
        ])
      ).values()
    );
  }

  const matchedOptions = classMajors
    .filter(
      (item) =>
        teacher.tingkatKelas.includes(item.grade) &&
        teacher.jurusan.includes(item.majorCode)
    )
    .map((item) => ({
      key: `${item.grade}-${item.majorCode}`,
      label: item.className,
      grade: item.grade,
      major: item.majorCode,
    }));

  if (matchedOptions.length > 0) {
    return matchedOptions;
  }

  return teacher.tingkatKelas.flatMap((grade) =>
    teacher.jurusan.map((major) => ({
      key: `${grade}-${major}`,
      label: `${grade} ${major}`,
      grade,
      major,
    }))
  );
};

/** Warna badge berdasarkan nilai */
const nilaiColor = (v: number | null) => {
  if (v === null) return "text-gray-400";
  if (v >= 85) return "text-green-700 font-bold";
  if (v >= 75) return "text-blue-700 font-semibold";
  if (v >= 65) return "text-yellow-700 font-semibold";
  return "text-red-700 font-semibold";
};

const splitImportValue = (value: unknown) =>
  String(value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

// ─── Sub-komponen: Panel Nilai Siswa ──────────────────────────────────────────
/**
 * Fungsi Tampilkan_Menu_User(id_siswa_login, menu_yang_diklik)
 *
 * Pseudo-code → TypeScript:
 * - "data_nilai" = array DUMMY_NILAI (simulasi SELECT dari DB)
 * - "menu_yang_diklik" = state `activeMenu`
 * - Setiap Kasus (AH / Tugas / STS / dll.) dirender sebagai tab konten
 */
function PanelNilaiSiswa({
  teacher,
  classMajors,
  onClose,
}: {
  teacher: Teacher;
  classMajors: ClassMajorOption[];
  onClose: () => void;
}) {
  const defaultPeriod = getDefaultGradePeriod();
  const [activeMenu, setActiveMenu] = useState<MenuNilai>("UH");
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSemester, setSelectedSemester] = useState(defaultPeriod.term);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(defaultPeriod.academicYear);
  const [dataNilai, setDataNilai] = useState<NilaiSiswa[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const classOptions = getTeacherClassOptions(teacher, classMajors);
  const subjectOptions = splitSubjects(teacher.mataPelajaran);
  const academicYearOptions = getAcademicYearOptions();

  useEffect(() => {
    if (!classOptions.length) {
      setSelectedClassKey("");
      setDataNilai([]);
      return;
    }

    if (!classOptions.some((option) => option.key === selectedClassKey)) {
      setSelectedClassKey(classOptions[0].key);
    }
  }, [classOptions, selectedClassKey]);

  useEffect(() => {
    if (!subjectOptions.length) {
      setSelectedSubject("");
      return;
    }

    if (!subjectOptions.includes(selectedSubject)) {
      setSelectedSubject(subjectOptions[0]);
    }
  }, [subjectOptions, selectedSubject]);

  useEffect(() => {
    const selectedClass = classOptions.find((option) => option.key === selectedClassKey);
    if (!selectedClass || !selectedSubject) return;

    const fetchNilai = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const gradeParams = new URLSearchParams({
          classLevel: selectedClass.grade,
          major: selectedClass.major,
          teacherId: teacher.id,
          subject: selectedSubject,
          semester: buildSemesterLabel(selectedSemester, selectedAcademicYear),
        });

        const [studentsRes, gradesRes] = await Promise.all([
          fetch("/api/students"),
          fetch(`/api/grades?${gradeParams.toString()}`),
        ]);

        if (!studentsRes.ok || !gradesRes.ok) {
          throw new Error("Gagal memuat data nilai siswa.");
        }

        const studentsData: StudentRecord[] = await studentsRes.json();
        const gradesData: GradeRecord[] = await gradesRes.json();

        const relevantStudents = studentsData.filter((student) => {
          const className = student.className || "";
          return className.startsWith(selectedClass.grade) && className.includes(selectedClass.major);
        });

        const nilaiMap = new Map<string, NilaiSiswa>();
        const upsertStudent = (student: StudentRecord) => {
          if (!nilaiMap.has(student.id)) {
            nilaiMap.set(student.id, {
              id_siswa: student.id,
              nama: student.name,
              uh_1: null,
              uh_2: null,
              uh_3: null,
              rata_rata_uh: null,
              tugas_1: null,
              tugas_2: null,
              tugas_3: null,
              rata_rata_tugas: null,
              sts: null,
              sas: null,
              nilai_sikap: null,
              nilai_raport: null,
            });
          }

          return nilaiMap.get(student.id)!;
        };

        relevantStudents.forEach(upsertStudent);

        gradesData.forEach((grade) => {
          const student = grade.student;
          if (student) {
            upsertStudent(student);
          }

          const current = nilaiMap.get(grade.studentId);
          if (!current) return;

          switch (grade.jenisPenilaian) {
            case "UH":
              current.uh_1 = toNumber(grade.nilai1);
              current.uh_2 = toNumber(grade.nilai2);
              current.uh_3 = toNumber(grade.nilai3);
              current.rata_rata_uh = calculateAverage(current.uh_1, current.uh_2, current.uh_3);
              break;
            case "TUGAS":
              current.tugas_1 = toNumber(grade.nilai1);
              current.tugas_2 = toNumber(grade.nilai2);
              current.tugas_3 = toNumber(grade.nilai3);
              current.rata_rata_tugas = calculateAverage(current.tugas_1, current.tugas_2, current.tugas_3);
              break;
            case "STS":
              current.sts = toNumber(grade.nilaiAkhir);
              break;
            case "SAS":
              current.sas = toNumber(grade.nilaiAkhir);
              break;
            case "SIKAP":
              current.nilai_sikap = toNumber(grade.nilaiAkhir);
              break;
          }

          current.nilai_raport = calculateRaport(current);
        });

        const result = Array.from(nilaiMap.values()).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
        setDataNilai(result);
      } catch (error: any) {
        setLoadError(error.message || "Gagal memuat nilai siswa.");
        setDataNilai([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNilai();
  }, [classOptions, selectedClassKey, selectedSubject, selectedSemester, selectedAcademicYear, teacher.id]);

  const renderKonten = () => {
    switch (activeMenu) {
      case "UH":
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-300 px-3 py-2 text-left">No</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Nama Siswa</th>
                <th className="border border-gray-300 px-3 py-2 text-center">AH 1</th>
                <th className="border border-gray-300 px-3 py-2 text-center">AH 2</th>
                <th className="border border-gray-300 px-3 py-2 text-center">AH 3</th>
                <th className="border border-gray-300 px-3 py-2 text-center bg-yellow-100">
                  Rata-rata (RH)
                </th>
              </tr>
            </thead>
            <tbody>
              {dataNilai.map((d, i) => (
                <tr key={d.id_siswa} className="hover:bg-blue-50/50">
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">
                    {d.nama}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.uh_1)}`}>
                    {fmt(d.uh_1)}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.uh_2)}`}>
                    {fmt(d.uh_2)}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.uh_3)}`}>
                    {fmt(d.uh_3)}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center bg-yellow-50 ${nilaiColor(d.rata_rata_uh)}`}>
                    {fmt(d.rata_rata_uh)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "Tugas":
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-purple-50">
                <th className="border border-gray-300 px-3 py-2 text-left">No</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Nama Siswa</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Tugas 1</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Tugas 2</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Tugas 3</th>
                <th className="border border-gray-300 px-3 py-2 text-center bg-yellow-100">
                  Rata-rata (RT)
                </th>
              </tr>
            </thead>
            <tbody>
              {dataNilai.map((d, i) => (
                <tr key={d.id_siswa} className="hover:bg-purple-50/50">
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">
                    {d.nama}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.tugas_1)}`}>
                    {fmt(d.tugas_1)}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.tugas_2)}`}>
                    {fmt(d.tugas_2)}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.tugas_3)}`}>
                    {fmt(d.tugas_3)}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center bg-yellow-50 ${nilaiColor(d.rata_rata_tugas)}`}>
                    {fmt(d.rata_rata_tugas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "STS":
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-orange-50">
                <th className="border border-gray-300 px-3 py-2 text-left">No</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Nama Siswa</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Nilai STS</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {dataNilai.map((d, i) => (
                <tr key={d.id_siswa} className="hover:bg-orange-50/50">
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">
                    {d.nama}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.sts)}`}>
                    {fmt(d.sts)}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      (d.sts ?? 0) >= 75 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {(d.sts ?? 0) >= 75 ? "Tuntas" : "Belum Tuntas"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "SAS":
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-teal-50">
                <th className="border border-gray-300 px-3 py-2 text-left">No</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Nama Siswa</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Nilai SAS</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {dataNilai.map((d, i) => (
                <tr key={d.id_siswa} className="hover:bg-teal-50/50">
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">
                    {d.nama}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.sas)}`}>
                    {fmt(d.sas)}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      (d.sas ?? 0) >= 75 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {(d.sas ?? 0) >= 75 ? "Tuntas" : "Belum Tuntas"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "Nilai Sikap":
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-pink-50">
                <th className="border border-gray-300 px-3 py-2 text-left">No</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Nama Siswa</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Nilai Sikap</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Predikat</th>
              </tr>
            </thead>
            <tbody>
              {dataNilai.map((d, i) => (
                <tr key={d.id_siswa} className="hover:bg-pink-50/50">
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">
                    {d.nama}
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center ${nilaiColor(d.nilai_sikap)}`}>
                    {fmt(d.nilai_sikap)}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      (d.nilai_sikap ?? 0) >= 90 ? "bg-green-100 text-green-700" :
                      (d.nilai_sikap ?? 0) >= 80 ? "bg-blue-100 text-blue-700" :
                      (d.nilai_sikap ?? 0) >= 70 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {(d.nilai_sikap ?? 0) >= 90 ? "SB (Sangat Baik)" :
                       (d.nilai_sikap ?? 0) >= 80 ? "B (Baik)" :
                       (d.nilai_sikap ?? 0) >= 70 ? "C (Cukup)" : "K (Kurang)"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );



      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        {/* Header Panel */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <BookOpen size={20} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">{teacher.name}</h3>
              <p className="text-xs text-gray-500">
                {teacher.mataPelajaran} &nbsp;·&nbsp;
                {teacher.tingkatKelas?.join(", ")} – {teacher.jurusan?.join(", ")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="px-6 py-3 border-b bg-white flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">Kelas ditampilkan</label>
            <select
              value={selectedClassKey}
              onChange={(e) => setSelectedClassKey(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {classOptions.length === 0 ? (
                <option value="">Belum ada kelas/jurusan</option>
              ) : (
                classOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
            <label className="ml-2 text-xs font-semibold text-gray-500">Mata pelajaran</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {subjectOptions.length === 0 ? (
                <option value="">Belum ada mapel</option>
              ) : (
                subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))
              )}
            </select>
            <label className="ml-2 text-xs font-semibold text-gray-500">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as "Ganjil" | "Genap")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {SEMESTER_OPTIONS.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
            <label className="ml-2 text-xs font-semibold text-gray-500">Tahun ajaran</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500">
            Data nilai riil diambil dari database admin berdasarkan guru, kelas, jurusan, dan mata pelajaran.
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b bg-white overflow-x-auto">
          {MENU_ITEMS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMenu(m.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border transition whitespace-nowrap ${
                activeMenu === m.key
                  ? m.color + " shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {activeMenu === m.key && <ChevronRight size={12} />}
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Konten Tabel (Tampilkan_Ke_Layar berdasarkan menu aktif) ── */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <p className="text-xs text-gray-400 mb-3">
            Menampilkan: <span className="font-semibold text-gray-600">{activeMenu}</span>
            &nbsp;·&nbsp; {dataNilai.length} siswa
          </p>
          {classOptions.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700">
              Guru ini belum memiliki kombinasi kelas dan jurusan yang bisa ditampilkan.
            </div>
          ) : !selectedSubject ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700">
              Guru ini belum memiliki mata pelajaran yang bisa difilter.
            </div>
          ) : isLoading ? (
            <div className="rounded-lg border border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
              <Loader2 size={18} className="inline mr-2 animate-spin" />
              Memuat data nilai siswa...
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
              {loadError}
            </div>
          ) : dataNilai.length === 0 ? (
            <div className="rounded-lg border border-gray-200 px-4 py-6 text-sm text-gray-500">
              Belum ada data siswa atau nilai untuk kelas yang dipilih.
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              {renderKonten()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Komponen Utama: Halaman Guru ─────────────────────────────────────────────
export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [classMajors, setClassMajors] = useState<ClassMajorOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State untuk panel nilai siswa (pseudo-code: id_siswa_login → guru yang dipilih)
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const visibleIds = new Set(teachers.map((teacher) => teacher.id));
    setSelectedTeacherIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [teachers]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError("");
    try {
      const [teacherRes, classRes, subjectRes] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/class-majors"),
        fetch("/api/subjects"),
      ]);

      if (!teacherRes.ok) {
        const teacherError = await teacherRes.json().catch(() => null);
        throw new Error(teacherError?.error || "Gagal memuat data guru.");
      }

      const teacherData = await teacherRes.json();
      setTeachers(teacherData);

      if (classRes.ok) {
        const classData = await classRes.json();
        setClassMajors(classData);
      }

      if (subjectRes.ok) {
        const subjectData = await subjectRes.json();
        if (subjectData.length > 0) {
          setSubjects(subjectData);
        }
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data awal.");
    } finally {
      setLoading(false);
    }
  };

  // ── Form State ─────────────────────────────────────────────────────────────
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TeacherFormData>({
    kodeGuru: "",
    nip: "",
    tanggalLahir: "",
    name: "",
    jenisKelamin: "Laki-laki",
    teachingAssignments: [],
  });

  const subjectsList = subjects.map((s) => s.name);

  const handleAddTeacher = async () => {
    setError("");
    if (!formData.name.trim() || !formData.kodeGuru.trim()) {
      setError("Kode Guru dan Nama wajib diisi.");
      return;
    }

    const normalizedAssignments = dedupeTeachingAssignments(
      formData.teachingAssignments.map((assignment) => ({
        ...assignment,
        subject: assignment.subject.trim(),
        className: assignment.className.trim(),
      }))
    );

    if (normalizedAssignments.length === 0) {
      setError("Minimal tambahkan satu penugasan mengajar.");
      return;
    }

    const normalizedKodeGuru = formData.kodeGuru.trim().toLowerCase();
    const normalizedNip = formData.nip.trim();
    const duplicateTeacher = teachers.find((teacher) => {
      const sameKodeGuru = teacher.kodeGuru.trim().toLowerCase() === normalizedKodeGuru;
      const sameNip =
        normalizedNip !== "" &&
        (teacher.nip || "").trim() !== "" &&
        (teacher.nip || "").trim() === normalizedNip;

      if (isEditing && teacher.id === editingId) {
        return false;
      }

      return sameKodeGuru || sameNip;
    });

    if (duplicateTeacher) {
      if (duplicateTeacher.kodeGuru.trim().toLowerCase() === normalizedKodeGuru) {
        setError(
          `Kode Guru ${formData.kodeGuru.trim()} sudah dipakai oleh ${duplicateTeacher.name}. Gunakan Edit pada data yang sudah ada.`
        );
      } else {
        setError(
          `NIP ${normalizedNip} sudah terhubung ke guru ${duplicateTeacher.name}. Gunakan Edit pada data yang sudah ada.`
        );
      }
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const method = isEditing ? "PUT" : "POST";
      const payload = {
        ...formData,
        tanggalLahir: normalizeTeacherBirthDate(formData.tanggalLahir),
        teachingAssignments: normalizedAssignments,
      };
      const body = isEditing ? { id: editingId, ...payload } : payload;

      const response = await fetch("/api/teachers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const responseError = await response.json().catch(() => null);
        throw new Error(responseError?.error || "Gagal menyimpan data guru.");
      }

      const result = await response.json().catch(() => null);

      if (!isEditing && result?.firebaseAuth) {
        const authInfo = result.firebaseAuth;
        if (authInfo.status === "created") {
          setSuccess(
            `Data guru tersimpan dan akun login Firebase berhasil dibuat. Username: ${authInfo.loginHint}. Password default: ${authInfo.initialPassword}`
          );
        } else if (authInfo.status === "exists") {
          setSuccess(
            `Data guru tersimpan. Akun login Firebase untuk ${authInfo.loginHint} sudah ada dan tetap dipakai.`
          );
        } else {
          setSuccess(
            `Data guru tersimpan, tetapi akun login Firebase belum dibuat otomatis: ${authInfo.reason}`
          );
        }
      } else {
        setSuccess(isEditing ? "Data guru dan akun terkait berhasil diperbarui." : "Data guru berhasil ditambahkan.");
      }

      await fetchInitialData();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data guru.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setError("");
    setSuccess("");
    setEditingId(teacher.id);
    setFormData({
      kodeGuru: teacher.kodeGuru ?? "",
      nip: teacher.nip ?? "",
      tanggalLahir: normalizeTeacherBirthDate(teacher.tanggalLahir ?? ""),
      name: teacher.name ?? "",
      jenisKelamin: teacher.jenisKelamin ?? "Laki-laki",
      teachingAssignments: buildAssignmentsFromTeacherData(teacher, classMajors),
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const deleteTeachers = async (ids: string[]) => {
    if (ids.length === 0) return false;

    try {
      setIsDeleting(true);
      setError("");
      setSuccess("");
      const params = new URLSearchParams();
      ids.forEach((id) => params.append("id", id));

      const response = await fetch(`/api/teachers?${params.toString()}`, { method: "DELETE" });
      if (!response.ok) {
        const responseError = await response.json().catch(() => null);
        throw new Error(responseError?.error || "Gagal menghapus data guru.");
      }
      await fetchInitialData();
      setSelectedTeacherIds([]);
      setSuccess(
        ids.length === 1
          ? "Data guru dan akun aplikasi terkait berhasil dihapus."
          : `${ids.length} data guru dan akun aplikasi terkait berhasil dihapus.`
      );
      return true;
    } catch (err: any) {
      setError(err.message || "Gagal menghapus data.");
    } finally {
      setIsDeleting(false);
    }

    return false;
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus guru ini?")) return;
    await deleteTeachers([id]);
  };

  const toggleTeacherSelection = (id: string) => {
    setSelectedTeacherIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleSelectAllTeachers = () => {
    const allTeacherIds = teachers.map((teacher) => teacher.id);
    const allSelected =
      allTeacherIds.length > 0 && allTeacherIds.every((id) => selectedTeacherIds.includes(id));

    setSelectedTeacherIds(allSelected ? [] : allTeacherIds);
  };

  const handleBulkDelete = async () => {
    if (selectedTeacherIds.length === 0) {
      setError("Pilih minimal satu guru yang ingin dihapus.");
      return;
    }

    const confirmed = confirm(
      `Apakah Anda yakin ingin menghapus ${selectedTeacherIds.length} guru terpilih?`
    );
    if (!confirmed) return;

    await deleteTeachers(selectedTeacherIds);
  };

  const resetForm = () => {
    setError("");
    setFormData({
      kodeGuru: "",
      nip: "",
      tanggalLahir: "",
      name: "",
      jenisKelamin: "Laki-laki",
      teachingAssignments: [],
    });
    setIsEditing(false);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const formatKeterangan = (tingkat: string[], jurusan: string[]) => {
    if (!tingkat?.length || !jurusan?.length) return "-";
    return `${tingkat.join(", ")} - ${jurusan.join(", ")}`;
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        "Kode Guru": "GRU001",
        NIP: "198001012010011001",
        "Tanggal Lahir": "16/12/1963",
        "Nama Guru": "Nama Guru",
        "Jenis Kelamin": "Laki-laki",
        "Penugasan Mengajar": "IPA|X TKJ 1; IPS|X TKJ 1; IPS|XI TKJ 1",
        "Mata Pelajaran": "Opsional fallback: IPA, IPS",
        "Tingkat Kelas": "Opsional fallback: X, XI",
        Jurusan: "Opsional fallback: TKJ",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Guru");
    XLSX.writeFile(wb, "template_data_guru.xlsx");
  };

  const handleExportData = () => {
    const exportData = teachers.map((teacher, index) => ({
      No: index + 1,
      "Kode Guru": teacher.kodeGuru,
      NIP: teacher.nip || "",
      "Tanggal Lahir": formatTeacherBirthDate(teacher.tanggalLahir),
      "Nama Guru": teacher.name,
      "Jenis Kelamin": teacher.jenisKelamin || "",
      "Penugasan Mengajar": serializeTeachingAssignments(teacher.teachingAssignments || []),
      "Mata Pelajaran": teacher.mataPelajaran || "",
      "Tingkat Kelas": (teacher.tingkatKelas || []).join(", "),
      Jurusan: (teacher.jurusan || []).join(", "),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Guru");
    XLSX.writeFile(wb, "data_guru.xlsx");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setError("");
      setSuccess("");

      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      const importedTeachers = jsonData
        .map((row: any) => {
          const subjects = splitImportValue(
            row["Mata Pelajaran"] || row["mataPelajaran"] || row["Mapel"] || ""
          );
          const grades = splitImportValue(row["Tingkat Kelas"] || row["tingkatKelas"]);
          const majors = splitImportValue(row["Jurusan"] || row["jurusan"]);
          const teachingAssignments = parseTeachingAssignmentsCell(
            row["Penugasan Mengajar"] || row["teachingAssignments"] || row["Penugasan"] || "",
            classMajors
          );

          return {
            kodeGuru: String(row["Kode Guru"] || row["kodeGuru"] || row["Kode"] || "").trim(),
            nip: String(row["NIP"] || row["nip"] || "").trim(),
            tanggalLahir: normalizeTeacherBirthDate(
              row["Tanggal Lahir"] || row["tanggalLahir"] || row["Tgl Lahir"] || row["tglLahir"] || ""
            ),
            name: String(row["Nama Guru"] || row["Nama"] || row["name"] || "").trim(),
            jenisKelamin: String(
              row["Jenis Kelamin"] || row["jenisKelamin"] || row["Gender"] || "Laki-laki"
            ).trim(),
            teachingAssignments:
              teachingAssignments.length > 0
                ? teachingAssignments
                : buildAssignmentsFromLegacyColumns(subjects, grades, majors, classMajors),
          };
        })
        .filter((teacher) => teacher.kodeGuru && teacher.name);

      if (importedTeachers.length === 0) {
        setError("Tidak ada data guru valid yang bisa diimport dari file tersebut.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      for (const teacher of importedTeachers) {
        try {
          const response = await fetch("/api/teachers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(teacher),
          });

          if (response.ok) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (importError) {
          console.error("Error importing teacher:", importError);
          failedCount++;
        }
      }

      await fetchInitialData();
      setSuccess(`Import selesai. Berhasil: ${successCount} guru. Gagal: ${failedCount} guru.`);
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const allTeacherIds = teachers.map((teacher) => teacher.id);
  const allTeachersSelected =
    allTeacherIds.length > 0 && allTeacherIds.every((id) => selectedTeacherIds.includes(id));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Data Guru</h3>
          <p className="text-sm text-gray-500">Kelola data guru SMK via database terpusat</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition hover:bg-gray-200"
          >
            <Download size={18} />
            Download Template
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary-100 px-4 py-2 text-primary-700 transition hover:bg-primary-200">
            <Upload size={18} />
            Import XLSX
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleImportData}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
          >
            <Download size={18} />
            Export XLSX
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedTeacherIds.length === 0 || isDeleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Hapus Terpilih
          </button>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700"
          >
            <Plus size={18} />
            Tambah Guru
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <AlertCircle size={18} /> <span>{success}</span>
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Menyimpan data guru sekarang otomatis membuat atau menyinkronkan akun di menu `Kelola Akun`.
        Gunakan `NIP` agar identitas guru, akun aplikasi, dan akun login Firebase selalu cocok.
      </div>

      {selectedTeacherIds.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {selectedTeacherIds.length} guru dipilih untuk dihapus.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={allTeachersSelected}
                  onChange={toggleSelectAllTeachers}
                  aria-label="Pilih semua guru"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kode Guru</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">NIP</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal Lahir</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Guru</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas &amp; Jurusan</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  <Loader2 size={20} className="animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  Belum ada data guru. Klik &quot;Tambah Guru&quot; untuk menambahkan.
                </td>
              </tr>
            ) : (
              teachers.map((teacher: Teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTeacherIds.includes(teacher.id)}
                      onChange={() => toggleTeacherSelection(teacher.id)}
                      aria-label={`Pilih guru ${teacher.name}`}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-mono">{teacher.kodeGuru}</td>
                  <td className="px-6 py-4 text-gray-700">{teacher.nip || "-"}</td>
                  <td className="px-6 py-4 text-gray-700">{formatTeacherBirthDate(teacher.tanggalLahir)}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">{teacher.name}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{teacher.mataPelajaran}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatKeterangan(teacher.tingkatKelas, teacher.jurusan)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Tombol Eye → membuka PanelNilaiSiswa (Fungsi Tampilkan_Menu_User) */}
                      <button
                        className="p-2 hover:bg-green-100 rounded-lg"
                        title="Lihat Nilai Siswa"
                        onClick={() => setViewingTeacher(teacher)}
                      >
                        <Eye size={16} className="text-green-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-blue-100 rounded-lg"
                        title="Edit"
                        onClick={() => handleEditTeacher(teacher)}
                      >
                        <Edit size={16} className="text-blue-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-100 rounded-lg"
                        title="Hapus"
                        onClick={() => handleDeleteTeacher(teacher.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Panel Nilai Siswa (Fungsi Tampilkan_Menu_User) ── */}
      {viewingTeacher && (
        <PanelNilaiSiswa
          teacher={viewingTeacher}
          classMajors={classMajors}
          onClose={() => setViewingTeacher(null)}
        />
      )}

      {/* ── Dialog Tambah/Edit Guru ── */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Guru" : "Tambah Guru Baru"}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kode Guru</label>
                  <input
                    type="text"
                    value={formData.kodeGuru}
                    onChange={(e) => setFormData({ ...formData, kodeGuru: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    placeholder="Contoh: GRU001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NIP</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Isi NIP agar akun user sinkron"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Guru</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nama lengkap guru"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin</label>
                <select
                  value={formData.jenisKelamin}
                  onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Penugasan Mengajar</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        teachingAssignments: [
                          ...prev.teachingAssignments,
                          { subject: subjectsList[0] || "", className: classMajors[0]?.className || "" },
                        ],
                      }))
                    }
                    className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
                  >
                    Tambah Penugasan
                  </button>
                </div>

                <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                  {formData.teachingAssignments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                      Belum ada penugasan. Tambahkan kombinasi mata pelajaran dan kelas, misalnya IPA ke X TKJ 1 dan IPS ke XI TKJ 1.
                    </div>
                  ) : (
                    formData.teachingAssignments.map((assignment, index) => (
                      <div
                        key={`${assignment.subject}-${assignment.className}-${index}`}
                        className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[1fr_1fr_auto]"
                      >
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Mata Pelajaran</label>
                          <select
                            value={assignment.subject}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                teachingAssignments: prev.teachingAssignments.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, subject: e.target.value } : item
                                ),
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Pilih mata pelajaran</option>
                            {subjectsList.map((subj) => (
                              <option key={subj} value={subj}>
                                {subj}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Kelas</label>
                          <select
                            value={assignment.className}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                teachingAssignments: prev.teachingAssignments.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, className: e.target.value } : item
                                ),
                              }))
                            }
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Pilih kelas</option>
                            {classMajors.map((classItem) => (
                              <option key={classItem.id} value={classItem.className}>
                                {classItem.className}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                teachingAssignments: prev.teachingAssignments.filter((_, itemIndex) => itemIndex !== index),
                              }))
                            }
                            className="rounded-lg bg-red-50 px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-100"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Rule sekarang disimpan per kombinasi `guru + mata pelajaran + kelas`, sehingga mapel tidak lagi otomatis melebar ke semua kelas guru.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddTeacher}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
