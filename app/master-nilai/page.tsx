"use client";

import { useState, useEffect } from "react";
import { ClassMajorOption, getGradeOptions, getMajorOptions } from "@/lib/class-major-options";
import {
  buildSemesterLabel,
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
} from "@/lib/grade-period";

type GradeType = "UH" | "TUGAS" | "STS" | "SAS" | "SIKAP";

type Grade = {
  id: string;
  studentId: string;
  student: { id: string; name: string; nis?: string; className?: string };
  subject: string;
  classLevel: string;
  major: string;
  jenisPenilaian: GradeType;
  semester: string;
  nilai1: string | null;
  nilai2: string | null;
  nilai3: string | null;
  nilaiAkhir: string | null;
  createdAt: string;
  updatedAt: string;
};

type StudentData = {
  name: string;
  gender: string;
  uh: { nilai1: string; nilai2: string; nilai3: string; rata: number | null };
  tugas: { nilai1: string; nilai2: string; nilai3: string; rata: number | null };
  sts: string;
  sas: string;
  sikap: string;
  sakit: string;
  izin: string;
  alfa: string;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const hitungRataRata = (vals: (string | null)[]): number | null => {
  let totalNilai = 0;
  let jumlahData = 0;
  vals.forEach((v) => {
    if (v) {
      const n = parseFloat(v);
      const terisi = v.trim() !== "" && !isNaN(n);
      if (terisi) {
        totalNilai += n;
        jumlahData++;
      }
    }
  });
  if (jumlahData === 0) return null;
  return round2(totalNilai / jumlahData);
};

export default function MasterNilaiPage() {
  const defaultPeriod = getDefaultGradePeriod();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState(defaultPeriod.term);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(defaultPeriod.academicYear);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classMajors, setClassMajors] = useState<ClassMajorOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const academicYearOptions = getAcademicYearOptions();

  useEffect(() => {
    fetchClassMajors();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchGrades();
    } else {
      setGrades([]);
    }
  }, [selectedClassId, selectedSemester, selectedAcademicYear]);

  const fetchClassMajors = async () => {
    try {
      const res = await fetch("/api/class-majors");
      if (res.ok) {
        const data = await res.json();
        setClassMajors(data);
      }
    } catch (error) {
      console.error("Error fetching class majors:", error);
    }
  };

  const fetchGrades = async () => {
    const selectedClass = classMajors.find((cls) => cls.id === selectedClassId);
    if (!selectedClass) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        classLevel: selectedClass.grade,
        major: selectedClass.majorCode,
        semester: buildSemesterLabel(selectedSemester, selectedAcademicYear),
      });
      const res = await fetch(`/api/grades?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch grades");
      const data = await res.json();
      setGrades(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group grades by student
  const studentsData: StudentData[] = (() => {
    const studentMap = new Map<string, StudentData>();

    grades.forEach((grade) => {
      const studentName = grade.student.name;
      if (!studentMap.has(studentName)) {
        studentMap.set(studentName, {
          name: studentName,
          gender: "L",
          uh: { nilai1: "", nilai2: "", nilai3: "", rata: null },
          tugas: { nilai1: "", nilai2: "", nilai3: "", rata: null },
          sts: "",
          sas: "",
          sikap: "",
          sakit: "",
          izin: "",
          alfa: "",
        });
      }

      const student = studentMap.get(studentName)!;

      switch (grade.jenisPenilaian) {
        case "UH":
          student.uh.nilai1 = grade.nilai1 || "";
          student.uh.nilai2 = grade.nilai2 || "";
          student.uh.nilai3 = grade.nilai3 || "";
          student.uh.rata = hitungRataRata([
            grade.nilai1,
            grade.nilai2,
            grade.nilai3,
          ]);
          break;
        case "TUGAS":
          student.tugas.nilai1 = grade.nilai1 || "";
          student.tugas.nilai2 = grade.nilai2 || "";
          student.tugas.nilai3 = grade.nilai3 || "";
          student.tugas.rata = hitungRataRata([
            grade.nilai1,
            grade.nilai2,
            grade.nilai3,
          ]);
          break;
        case "STS":
          student.sts = grade.nilaiAkhir || "";
          break;
        case "SAS":
          student.sas = grade.nilaiAkhir || "";
          break;
        case "SIKAP":
          student.sikap = grade.nilaiAkhir || "";
          break;
      }
    });

    return Array.from(studentMap.values());
  })();

  const calculateRaport = (student: StudentData): number | null => {
    if (!student.uh.rata || !student.tugas.rata || !student.sts || !student.sas) {
      return null;
    }
    return round2(
      0.3 * student.uh.rata +
        0.2 * student.tugas.rata +
        0.2 * parseFloat(student.sts) +
        0.3 * parseFloat(student.sas)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Master Format Nilai Siswa
          </h3>
          <p className="text-sm text-gray-500">
            Rekap kognitif, sumatif, kehadiran, sikap & nilai raport
          </p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap items-center gap-4">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">Kelas</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">-- Pilih Kelas --</option>
            {classMajors.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.className}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">Semester</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as "Ganjil" | "Genap")}
          >
            {SEMESTER_OPTIONS.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">Tahun Ajaran</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
          >
            {academicYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Memuat data...
        </div>
      )}

      {!selectedClassId ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Silakan pilih <b>Kelas</b> terlebih dahulu untuk menampilkan data siswa.
        </div>
      ) : studentsData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Belum ada data penilaian untuk {classMajors.find((cls) => cls.id === selectedClassId)?.className}.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead className="text-gray-700">
              <tr>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">
                  NO
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-56 text-left">
                  NAMA SISWA
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-16 text-center">
                  L/P
                </th>
                <th colSpan={8} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  KOGNITIF
                </th>
                <th rowSpan={2} colSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  STS
                </th>
                <th rowSpan={2} colSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  SAS
                </th>
                <th colSpan={4} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  KEHADIRAN
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-20 text-center">
                  Nilai<br />Sikap
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-20 text-center">
                  Nilai<br />Raport
                </th>
              </tr>

              <tr>
                <th colSpan={4} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  Penilaian Harian
                </th>
                <th colSpan={4} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  Tugas
                </th>
                <th rowSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-1 w-9 text-center">
                  S
                </th>
                <th rowSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-1 w-9 text-center">
                  I
                </th>
                <th rowSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-1 w-9 text-center">
                  A
                </th>
                <th rowSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-1 w-12 text-center">
                  Jml
                </th>
              </tr>

              <tr>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">1</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">2</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">3</th>
                <th className="border border-gray-400 bg-[#fffe03] font-bold text-center px-2 py-1 w-12 text-center">RH</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">1</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">2</th>
                <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">3</th>
                <th className="border border-gray-400 bg-[#fffe03] font-bold text-center px-2 py-1 w-12 text-center">RT</th>
                <th colSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  NILAI
                </th>
                <th colSpan={2} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  NILAI
                </th>
              </tr>
            </thead>

            <tbody>
              {studentsData.map((student, idx) => {
                const jml = [student.sakit, student.izin, student.alfa].reduce(
                  (sum, v) => sum + (parseInt(v) || 0),
                  0
                );
                const nilaiRaport = calculateRaport(student);
                return (
                  <tr key={idx} className="hover:bg-pink-50">
                    <td className="border border-gray-300 text-center py-2">{idx + 1}</td>
                    <td className="border border-gray-300 px-1 py-2">{student.name}</td>
                    <td className="border border-gray-300 px-1 py-2 text-center">{student.gender}</td>

                    <td className="border border-gray-300 px-2 py-2 text-center">{student.uh.nilai1}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{student.uh.nilai2}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{student.uh.nilai3}</td>
                    <td className="border border-gray-300 py-2 bg-[#fffe03] font-bold text-center text-gray-800">
                      {student.uh.rata === null ? "–" : student.uh.rata}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-center">{student.tugas.nilai1}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{student.tugas.nilai2}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{student.tugas.nilai3}</td>
                    <td className="border border-gray-300 py-2 bg-[#fffe03] font-bold text-center text-gray-800">
                      {student.tugas.rata === null ? "–" : student.tugas.rata}
                    </td>

                    <td colSpan={2} className="border border-gray-300 px-1 py-2 text-center">{student.sts}</td>
                    <td colSpan={2} className="border border-gray-300 px-1 py-2 text-center">{student.sas}</td>

                    <td className="border border-gray-300 px-2 py-2 text-center">{student.sakit}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{student.izin}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{student.alfa}</td>
                    <td className="border border-gray-300 text-center font-semibold py-2">{jml}</td>

                    <td className="border border-gray-300 px-2 py-2 text-center">{student.sikap}</td>

                    <td className="border border-gray-300 py-2 bg-[#fffe03] font-bold text-center text-gray-800">
                      {nilaiRaport === null ? "–" : nilaiRaport}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">📐 Keterangan Kolom Kuning (Otomatis):</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>
            <strong>RH</strong> = Rata-rata Penilaian Harian (AH 1–3, hanya kolom terisi)
          </li>
          <li>
            <strong>RT</strong> = Rata-rata Tugas (Tugas 1–3, hanya kolom terisi)
          </li>
          <li>
            <strong>Jml</strong> = Sakit + Izin + Alfa
          </li>
          <li>
            <strong>Nilai Raport</strong> = (0.3 × RH) + (0.2 × RT) + (0.2 × STS) + (0.3 × SAS)
          </li>
        </ul>
        <p className="text-blue-500 mt-1">
          Semua nilai berkisar 0–100. Kolom kuning tidak dapat diedit secara manual.
        </p>
      </div>
    </div>
  );
}
