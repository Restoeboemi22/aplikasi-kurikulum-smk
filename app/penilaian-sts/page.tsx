"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { ClassMajorOption } from "@/lib/class-major-options";
import { useAuth } from "@/lib/auth-context";
import {
  getTeacherClassOptions,
  getTeacherSubjectOptions,
  resolveCurrentTeacher,
  type CurrentTeacher,
} from "@/lib/current-teacher";
import {
  buildSemesterLabel,
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
} from "@/lib/grade-period";

interface Student {
  id: string;
  nis: string;
  name: string;
  gender: string;
  className?: string;
  nilaiAkhir?: string;
}

interface GradeRecord {
  studentId: string;
  nilaiAkhir?: string | null;
}

const clampScore = (raw: string): string => {
  if (raw === "" || raw === "-") return raw;
  const n = parseFloat(raw);
  if (isNaN(n)) return "";
  const clamped = Math.min(100, Math.max(0, n));
  return String(clamped);
};

export default function PenilaianSTSPage() {
  const defaultPeriod = getDefaultGradePeriod();
  const { user } = useAuth();
  const role = user?.role ?? "TEACHER";
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSemester, setSelectedSemester] = useState(defaultPeriod.term);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(defaultPeriod.academicYear);
  const [students, setStudents] = useState<Student[]>([]);
  const [classMajors, setClassMajors] = useState<ClassMajorOption[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<CurrentTeacher | null>(null);
  const [subjectCatalog, setSubjectCatalog] = useState<string[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [teacherError, setTeacherError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const academicYearOptions = getAcademicYearOptions();
  const subjectOptions =
    role === "ADMIN" ? subjectCatalog : getTeacherSubjectOptions(currentTeacher);
  const teacherClassAssignments =
    role === "ADMIN" ? [] : getTeacherClassOptions(currentTeacher, selectedSubject);

  // Dapatkan daftar kelas yang tersedia: untuk admin semua kelas, untuk guru hanya kelas yang ditugaskan
  const availableClasses = role === "ADMIN"
    ? classMajors
    : classMajors.filter((cls) =>
        teacherClassAssignments.some(
          (assignment) =>
            assignment.className === cls.className
        )
      );

  useEffect(() => {
    fetchClassMajors();
  }, []);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    loadCurrentTeacher();
  }, [role, user?.uid, user?.nip, user?.name]);

  useEffect(() => {
    if (!subjectOptions.length) {
      setSelectedSubject("");
      return;
    }

    if (!subjectOptions.includes(selectedSubject)) {
      setSelectedSubject(subjectOptions[0]);
    }
  }, [selectedSubject, subjectOptions]);

  useEffect(() => {
    if (selectedClassId && !availableClasses.some((cls) => cls.id === selectedClassId)) {
      setSelectedClassId("");
    }
  }, [availableClasses, selectedClassId]);

  useEffect(() => {
    if (selectedClassId && selectedSubject && (role === "ADMIN" || currentTeacher)) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [selectedClassId, currentTeacher?.id, role, selectedSubject, selectedSemester, selectedAcademicYear]);

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

  const loadSubjects = async () => {
    try {
      const response = await fetch("/api/subjects", { cache: "no-store" });
      if (!response.ok) return;

      const subjects = await response.json();
      setSubjectCatalog(
        subjects
          .map((subject: { name?: string }) => subject.name?.trim() || "")
          .filter(Boolean)
      );
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const loadCurrentTeacher = async () => {
    if (role === "ADMIN") {
      setCurrentTeacher(null);
      setTeacherError("");
      setTeacherLoading(false);
      return;
    }

    setTeacherLoading(true);
    setTeacherError("");
    try {
      const teacher = await resolveCurrentTeacher(user);
      if (!teacher) {
        setCurrentTeacher(null);
        setTeacherError("Profil guru aktif tidak ditemukan di database admin.");
        return;
      }

      setCurrentTeacher(teacher);
    } catch (error: any) {
      setCurrentTeacher(null);
      setTeacherError(error.message || "Gagal memuat profil guru aktif.");
    } finally {
      setTeacherLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!(role === "ADMIN" || currentTeacher) || !selectedSubject) return;
    const selectedClass = classMajors.find((cls) => cls.id === selectedClassId);
    if (!selectedClass) return;

    setIsLoading(true);
    try {
      const gradeParams = new URLSearchParams({
        classLevel: selectedClass.grade,
        major: selectedClass.majorCode,
        jenisPenilaian: "STS",
        subject: selectedSubject,
        semester: buildSemesterLabel(selectedSemester, selectedAcademicYear),
      });
      if (currentTeacher?.id) {
        gradeParams.set("teacherId", currentTeacher.id);
      }

      const [studentRes, gradeRes] = await Promise.all([
        fetch(
          `/api/students?${new URLSearchParams({
            classLevel: selectedClass.grade,
            major: selectedClass.majorCode,
            subject: selectedSubject,
          }).toString()}`
        ),
        fetch(`/api/grades?${gradeParams.toString()}`),
      ]);

      if (studentRes.ok && gradeRes.ok) {
        const studentData = await studentRes.json();
        const gradeData: GradeRecord[] = await gradeRes.json();
        const gradeMap = new Map(gradeData.map((grade) => [grade.studentId, grade]));
        const filteredStudents = studentData.filter((s: Student) => {
          const className = s.className || "";
          return className === selectedClass.className;
        }).map((s: any) => ({
          id: s.id,
          nis: s.nis,
          name: s.name,
          gender: s.gender === "Laki-laki" ? "L" : "P",
          className: s.className,
          nilaiAkhir: gradeMap.get(s.id)?.nilaiAkhir || ""
        }));
        setStudents(filteredStudents);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const selectedClass = classMajors.find((cls) => cls.id === selectedClassId);
    const data = students.map((s, idx) => ({
      "NO": idx + 1,
      "NAMA SISWA": s.name,
      "L/P": s.gender,
      "STS": s.nilaiAkhir || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nilai STS");
    
    // Generate descriptive filename
    const cleanKelas = selectedClass?.className.replace(/\s+/g, "_") || "";
    const cleanMapel = selectedSubject.replace(/\s+/g, "_");
    const cleanTahunAjaran = selectedAcademicYear.replace(/\//g, "-");
    const fileName = `STS_${cleanKelas}_${cleanMapel}_${selectedSemester}_${cleanTahunAjaran}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      setStudents((prevStudents) => {
        const updatedStudents = [...prevStudents];
        data.forEach((row: any) => {
          const studentName = row["NAMA SISWA"]?.toString().trim().toUpperCase();
          if (!studentName) return;

          const studentIndex = updatedStudents.findIndex(
            (s) => s.name.trim().toUpperCase() === studentName
          );

          if (studentIndex !== -1) {
            updatedStudents[studentIndex] = {
              ...updatedStudents[studentIndex],
              nilaiAkhir: clampScore(row["STS"]?.toString() || ""),
            };
          }
        });
        return updatedStudents;
      });
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateField = (id: string, field: keyof Student, value: string) => {
    setStudents((prevStudents) =>
      prevStudents.map((s) =>
        s.id === id
          ? {
              ...s,
              [field]: field.startsWith("nilai") ? clampScore(value) : value,
            }
          : s
      )
    );
  };

  const handleKirim = async () => {
    if (!selectedClassId) {
      setMessage({ text: "Pilih kelas terlebih dahulu!", type: "error" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    const selectedClass = classMajors.find((cls) => cls.id === selectedClassId);
    if (!selectedClass) return;

    if (!selectedSubject) {
      setMessage({ text: "Mata pelajaran belum dipilih.", type: "error" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (!currentTeacher) {
      setMessage({ text: "Akun ini belum terhubung ke profil guru, jadi belum bisa mengirim nilai.", type: "error" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      for (const student of students) {
        if (!student.name.trim()) continue;

        const response = await fetch("/api/grades", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentName: student.name,
            classLevel: selectedClass.grade,
            major: selectedClass.majorCode,
            subject: selectedSubject,
            semester: buildSemesterLabel(selectedSemester, selectedAcademicYear),
            jenisPenilaian: "STS",
            nilaiAkhir: student.nilaiAkhir,
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || `Gagal mengirim nilai STS untuk ${student.name}.`);
        }
      }

      setMessage({ text: "Data penilaian STS berhasil dikirim ke admin!", type: "success" });
    } catch (error) {
      console.error(error);
      setMessage({ text: error instanceof Error ? error.message : "Gagal mengirim data!", type: "error" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const inputCls = "w-full px-1 py-1 text-center text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Sumatif Tengah Semester (STS)</h3>
          <p className="text-sm text-gray-500">Input format penilaian STS siswa</p>
        </div>
      </div>

      {teacherError && role !== "ADMIN" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {teacherError}
        </div>
      )}

      {(currentTeacher || role === "ADMIN") && (
        <div className="rounded-xl border bg-white px-4 py-3 text-sm text-gray-600">
          {role === "ADMIN" ? (
            <>Mode admin: <span className="font-semibold text-gray-800">memakai daftar mata pelajaran master</span></>
          ) : (
            <>Guru aktif: <span className="font-semibold text-gray-800">{currentTeacher?.name}</span></>
          )}
          {" · "}Mapel: <span className="font-semibold text-gray-800">{selectedSubject || "-"}</span>
          {" · "}Periode: <span className="font-semibold text-gray-800">{selectedSemester} {selectedAcademicYear}</span>
        </div>
      )}

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
            {availableClasses.map((kelas) => (
              <option key={kelas.id} value={kelas.id}>
                {kelas.className}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">Mata Pelajaran</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={teacherLoading || subjectOptions.length === 0}
          >
            <option value="">-- Pilih Mata Pelajaran --</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
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

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      {!selectedClassId || !selectedSubject ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Silakan pilih <b>Kelas</b> dan <b>Mata Pelajaran</b> terlebih dahulu untuk menampilkan data siswa.
        </div>
      ) : isLoading || teacherLoading ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Memuat data siswa...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Belum ada siswa untuk {classMajors.find((cls) => cls.id === selectedClassId)?.className} di database.
        </div>
      ) : (
        <>
          {role !== "ADMIN" && (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                <Download size={16} /> Download Format
              </button>

              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                <Upload size={16} /> Upload Nilai
              </button>

              <button
                onClick={handleKirim}
                disabled={isLoading}
                className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} /> {isLoading ? "Mengirim..." : "Kirim"}
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="border-collapse text-xs w-full">
              <thead className="text-gray-700">
                <tr>
                  <th className="border border-gray-400 bg-gray-100 px-2 py-2 w-12 text-center">NO</th>
                  <th className="border border-gray-400 bg-gray-100 px-4 py-2 text-left min-w-[250px]">NAMA SISWA</th>
                  <th className="border border-gray-400 bg-gray-100 px-2 py-2 w-16 text-center">L/P</th>
                  <th className="border border-gray-400 bg-gray-100 px-2 py-2 w-32 text-center">NILAI STS</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-pink-50 transition-colors">
                    <td className="border border-gray-300 text-center py-2">{idx + 1}</td>
                    <td className="border border-gray-300 px-2 py-2">{s.name}</td>
                    <td className="border border-gray-300 px-1 py-2 text-center">{s.gender}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <input type="number" min={0} max={100} value={s.nilaiAkhir} onChange={(e) => updateField(s.id, "nilaiAkhir", e.target.value)} placeholder="-" className={`${inputCls} py-1.5`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
