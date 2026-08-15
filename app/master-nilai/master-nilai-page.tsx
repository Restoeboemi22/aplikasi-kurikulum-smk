"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import { ClassMajorOption, getGradeOptions, getMajorOptions } from "@/lib/class-major-options";
import {
  buildSemesterLabel,
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
} from "@/lib/grade-period";

type MasterNilaiPageProps = {
  allowedClassNames?: string[];
  mode?: "admin" | "homeroom";
};

type GradeType = "UH" | "TUGAS" | "STS" | "SAS" | "SIKAP";

type Grade = {
  id: string;
  studentId: string;
  student: { id: string; name: string; gender?: string | null; nis?: string; nisn?: string | null; className?: string };
  teacher?: { id?: string; user?: { name?: string | null } | null } | null;
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

type SubjectMetrics = {
  teacherName: string;
  uh: { nilai1: string; nilai2: string; nilai3: string; rata: number | null };
  tugas: { nilai1: string; nilai2: string; nilai3: string; rata: number | null };
  sts: string;
  sas: string;
  sikap: string;
};

type SubjectColumn = {
  key: string;
  subject: string;
  teacherName: string;
  label: string;
};

type MasterNilaiRow = {
  studentId: string;
  nis: string;
  nisn: string;
  name: string;
  gender: string;
  sakit: string;
  izin: string;
  alfa: string;
  subjectMetrics: Record<string, SubjectMetrics>;
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

const toExcelNumber = (value: string | number | null | undefined): number | string => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : text;
};

export default function MasterNilaiPage({
  allowedClassNames = [],
  mode = "admin",
}: MasterNilaiPageProps) {
  const defaultPeriod = getDefaultGradePeriod();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState(defaultPeriod.term);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(defaultPeriod.academicYear);
  const [selectedSubject, setSelectedSubject] = useState("SEMUA");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classMajors, setClassMajors] = useState<ClassMajorOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const academicYearOptions = getAcademicYearOptions();
  const allowedClassNameSet = useMemo(
    () => new Set(allowedClassNames.map((item) => item.trim().toUpperCase()).filter(Boolean)),
    [allowedClassNames]
  );
  const visibleClassMajors = useMemo(() => {
    if (allowedClassNameSet.size === 0) return classMajors;
    return classMajors.filter((cls) => allowedClassNameSet.has(cls.className.trim().toUpperCase()));
  }, [allowedClassNameSet, classMajors]);
  const selectedClass = visibleClassMajors.find((cls) => cls.id === selectedClassId);

  useEffect(() => {
    fetchClassMajors();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchGrades();
    } else {
      setGrades([]);
    }
  }, [selectedClassId, selectedSemester, selectedAcademicYear, visibleClassMajors]);

  useEffect(() => {
    setSelectedSubject("SEMUA");
  }, [selectedClassId, selectedSemester, selectedAcademicYear]);

  useEffect(() => {
    if (visibleClassMajors.length === 0) {
      if (selectedClassId) {
        setSelectedClassId("");
      }
      return;
    }

    const stillValid = visibleClassMajors.some((cls) => cls.id === selectedClassId);
    if (!stillValid) {
      setSelectedClassId(visibleClassMajors[0]?.id || "");
    }
  }, [selectedClassId, visibleClassMajors]);

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
    const selectedClass = visibleClassMajors.find((cls) => cls.id === selectedClassId);
    if (!selectedClass) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        classLevel: selectedClass.grade,
        major: selectedClass.majorCode,
        className: selectedClass.className,
        semester: buildSemesterLabel(selectedSemester, selectedAcademicYear),
      });
      if (mode === "homeroom") {
        params.set("viewerScope", "homeroom-summary");
      }
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

  const subjectColumns = useMemo<SubjectColumn[]>(() => {
    const subjectTeacherMap = new Map<string, { subject: string; teacherName: string }>();
    const subjectUsageCount = new Map<string, number>();

    grades.forEach((grade) => {
      const teacherName = grade.teacher?.user?.name?.trim() || "-";
      const teacherKey = grade.teacher?.id || teacherName;
      const pairKey = `${grade.subject}||${teacherKey}`;
      if (!subjectTeacherMap.has(pairKey)) {
        subjectTeacherMap.set(pairKey, {
          subject: grade.subject,
          teacherName,
        });
        subjectUsageCount.set(grade.subject, (subjectUsageCount.get(grade.subject) || 0) + 1);
      }
    });

    return Array.from(subjectTeacherMap.entries())
      .map(([pairKey, value]) => ({
        key: pairKey,
        subject: value.subject,
        teacherName: value.teacherName,
        label:
          (subjectUsageCount.get(value.subject) || 0) > 1
            ? `${value.subject} (${value.teacherName})`
            : value.subject,
      }))
      .sort((a, b) => {
        const bySubject = a.subject.localeCompare(b.subject, "id-ID");
        if (bySubject !== 0) return bySubject;
        return a.teacherName.localeCompare(b.teacherName, "id-ID");
      });
  }, [grades]);

  // Group grades by student
  const masterNilaiRows = useMemo<MasterNilaiRow[]>(() => {
    const studentMap = new Map<string, MasterNilaiRow>();

    grades.forEach((grade) => {
      if (!studentMap.has(grade.studentId)) {
        studentMap.set(grade.studentId, {
          studentId: grade.studentId,
          nis: grade.student.nis || "-",
          nisn: grade.student.nisn?.trim() || "-",
          name: grade.student.name,
          gender: grade.student.gender?.trim() || "-",
          sakit: "",
          izin: "",
          alfa: "",
          subjectMetrics: {},
        });
      }

      const student = studentMap.get(grade.studentId)!;
      const teacherName = grade.teacher?.user?.name?.trim() || "-";
      const teacherKey = grade.teacher?.id || teacherName;
      const subjectKey = `${grade.subject}||${teacherKey}`;

      if (!student.subjectMetrics[subjectKey]) {
        student.subjectMetrics[subjectKey] = {
          teacherName,
          uh: { nilai1: "", nilai2: "", nilai3: "", rata: null },
          tugas: { nilai1: "", nilai2: "", nilai3: "", rata: null },
          sts: "",
          sas: "",
          sikap: "",
        };
      }

      const subjectMetrics = student.subjectMetrics[subjectKey];

      switch (grade.jenisPenilaian) {
        case "UH":
          subjectMetrics.uh.nilai1 = grade.nilai1 || "";
          subjectMetrics.uh.nilai2 = grade.nilai2 || "";
          subjectMetrics.uh.nilai3 = grade.nilai3 || "";
          subjectMetrics.uh.rata = hitungRataRata([
            grade.nilai1,
            grade.nilai2,
            grade.nilai3,
          ]);
          break;
        case "TUGAS":
          subjectMetrics.tugas.nilai1 = grade.nilai1 || "";
          subjectMetrics.tugas.nilai2 = grade.nilai2 || "";
          subjectMetrics.tugas.nilai3 = grade.nilai3 || "";
          subjectMetrics.tugas.rata = hitungRataRata([
            grade.nilai1,
            grade.nilai2,
            grade.nilai3,
          ]);
          break;
        case "STS":
          subjectMetrics.sts = grade.nilaiAkhir || "";
          break;
        case "SAS":
          subjectMetrics.sas = grade.nilaiAkhir || "";
          break;
        case "SIKAP":
          subjectMetrics.sikap = grade.nilaiAkhir || "";
          break;
      }
    });

    return Array.from(studentMap.values()).sort((a, b) => {
      const byStudent = a.name.localeCompare(b.name, "id-ID");
      if (byStudent !== 0) return byStudent;
      return a.nis.localeCompare(b.nis, "id-ID");
    });
  }, [grades]);

  const subjectOptions = useMemo(
    () => Array.from(new Set(subjectColumns.map((item) => item.subject))).sort((a, b) => a.localeCompare(b, "id-ID")),
    [subjectColumns]
  );

  const filteredSubjectColumns = useMemo(
    () =>
      selectedSubject === "SEMUA"
        ? subjectColumns
        : subjectColumns.filter((item) => item.subject === selectedSubject),
    [selectedSubject, subjectColumns]
  );

  const filteredMasterNilaiRows = useMemo(
    () => masterNilaiRows,
    [masterNilaiRows]
  );

  const calculateSubjectRaport = (subjectMetrics?: SubjectMetrics): number | null => {
    if (
      !subjectMetrics ||
      subjectMetrics.uh.rata === null ||
      subjectMetrics.tugas.rata === null ||
      !subjectMetrics.sts ||
      !subjectMetrics.sas
    ) {
      return null;
    }
    return round2(
      0.3 * subjectMetrics.uh.rata +
        0.2 * subjectMetrics.tugas.rata +
        0.2 * parseFloat(subjectMetrics.sts) +
        0.3 * parseFloat(subjectMetrics.sas)
    );
  };

  const calculateOverallAverage = (student: MasterNilaiRow): number | null => {
    const raportValues: number[] = [];
    filteredSubjectColumns.forEach((column) => {
      const metrics = student.subjectMetrics[column.key];
      const raport = calculateSubjectRaport(metrics);
      if (raport !== null) {
        raportValues.push(raport);
      }
    });
    if (raportValues.length === 0) return null;
    return round2(raportValues.reduce((a, b) => a + b, 0) / raportValues.length);
  };

  const exportToExcel = async () => {
    if (!selectedClass || filteredMasterNilaiRows.length === 0 || filteredSubjectColumns.length === 0) return;

    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Master Nilai", {
        views: [{ state: "frozen", xSplit: 5, ySplit: 3 }],
      });

      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } } as const;
      const highlightFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFE03" } } as const;
      const border = {
        top: { style: "thin" as const, color: { argb: "FF9CA3AF" } },
        left: { style: "thin" as const, color: { argb: "FF9CA3AF" } },
        bottom: { style: "thin" as const, color: { argb: "FF9CA3AF" } },
        right: { style: "thin" as const, color: { argb: "FF9CA3AF" } },
      };

      const baseColumns = [
        { title: "NO", key: "no", width: 6 },
        { title: "NIS", key: "nis", width: 14 },
        { title: "NISN", key: "nisn", width: 16 },
        { title: "NAMA SISWA", key: "nama", width: 28 },
        { title: "L/P", key: "gender", width: 10 },
      ];
      const subjectLeafColumns = [
        { title: "1", width: 8, highlight: false },
        { title: "2", width: 8, highlight: false },
        { title: "3", width: 8, highlight: false },
        { title: "RH", width: 9, highlight: true },
        { title: "1", width: 8, highlight: false },
        { title: "2", width: 8, highlight: false },
        { title: "3", width: 8, highlight: false },
        { title: "RT", width: 9, highlight: true },
        { title: "Nilai", width: 9, highlight: false },
        { title: "Nilai", width: 9, highlight: false },
        { title: "Nilai", width: 9, highlight: false },
        { title: "Nilai", width: 10, highlight: true },
      ];
      const attendanceColumns = [
        { title: "S", width: 6 },
        { title: "I", width: 6 },
        { title: "A", width: 6 },
        { title: "Jml", width: 8 },
      ];

      const columnWidths = [
        ...baseColumns.map((column) => column.width),
        ...filteredSubjectColumns.flatMap(() => subjectLeafColumns.map((column) => column.width)),
        ...attendanceColumns.map((column) => column.width),
        11,
        18,
      ];
      worksheet.columns = columnWidths.map((width) => ({ width }));

      let currentCol = 1;
      baseColumns.forEach((column) => {
        worksheet.mergeCells(1, currentCol, 3, currentCol);
        worksheet.getCell(1, currentCol).value = column.title;
        currentCol++;
      });

      const highlightedColumnIndexes = new Set<number>();

      filteredSubjectColumns.forEach((column) => {
        const startCol = currentCol;
        const endCol = startCol + subjectLeafColumns.length - 1;
        worksheet.mergeCells(1, startCol, 1, endCol);
        worksheet.getCell(1, startCol).value = column.label;

        worksheet.mergeCells(2, startCol, 2, startCol + 3);
        worksheet.getCell(2, startCol).value = "Penilaian Harian";

        worksheet.mergeCells(2, startCol + 4, 2, startCol + 7);
        worksheet.getCell(2, startCol + 4).value = "Tugas";

        worksheet.getCell(2, startCol + 8).value = "STS";
        worksheet.getCell(2, startCol + 9).value = "SAS";
        worksheet.getCell(2, startCol + 10).value = "Sikap";
        worksheet.getCell(2, startCol + 11).value = "Raport";

        subjectLeafColumns.forEach((leafColumn, index) => {
          const targetCol = startCol + index;
          worksheet.getCell(3, targetCol).value = leafColumn.title;
          if (leafColumn.highlight) {
            highlightedColumnIndexes.add(targetCol);
          }
        });

        currentCol = endCol + 1;
      });

      const attendanceStartCol = currentCol;
      const attendanceEndCol = attendanceStartCol + attendanceColumns.length - 1;
      worksheet.mergeCells(1, attendanceStartCol, 1, attendanceEndCol);
      worksheet.getCell(1, attendanceStartCol).value = "KEHADIRAN";

      attendanceColumns.forEach((column, index) => {
        const targetCol = attendanceStartCol + index;
        worksheet.mergeCells(2, targetCol, 3, targetCol);
        worksheet.getCell(2, targetCol).value = column.title;
      });

      const averageCol = attendanceEndCol + 1;
      const notesCol = averageCol + 1;
      worksheet.mergeCells(1, averageCol, 3, averageCol);
      worksheet.getCell(1, averageCol).value = "Rata-rata";
      worksheet.mergeCells(1, notesCol, 3, notesCol);
      worksheet.getCell(1, notesCol).value = "Keterangan";

      const totalColumnCount = notesCol;

      for (let row = 1; row <= 3; row++) {
        const excelRow = worksheet.getRow(row);
        excelRow.height = 22;
        for (let col = 1; col <= totalColumnCount; col++) {
          const cell = excelRow.getCell(col);
          cell.border = border;
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.font = { bold: true, color: { argb: "FF374151" } };
          cell.fill = row === 3 && highlightedColumnIndexes.has(col) ? highlightFill : headerFill;
        }
      }

      filteredMasterNilaiRows.forEach((student, idx) => {
        const jumlahKehadiran = [student.sakit, student.izin, student.alfa].reduce(
          (sum, value) => sum + (parseInt(value, 10) || 0),
          0
        );
        const rataRata = calculateOverallAverage(student);
        const keterangan = rataRata === null ? "–" : rataRata < 78 ? "Tidak Naik Kelas" : "Naik Kelas";
        const rowIndex = idx + 4;
        const rowValues: Array<string | number> = [
          idx + 1,
          student.nis,
          student.nisn,
          student.name,
          student.gender,
        ];

        filteredSubjectColumns.forEach((column) => {
          const metrics = student.subjectMetrics[column.key];
          rowValues.push(
            toExcelNumber(metrics?.uh.nilai1),
            toExcelNumber(metrics?.uh.nilai2),
            toExcelNumber(metrics?.uh.nilai3),
            metrics?.uh.rata ?? "–",
            toExcelNumber(metrics?.tugas.nilai1),
            toExcelNumber(metrics?.tugas.nilai2),
            toExcelNumber(metrics?.tugas.nilai3),
            metrics?.tugas.rata ?? "–",
            toExcelNumber(metrics?.sts),
            toExcelNumber(metrics?.sas),
            toExcelNumber(metrics?.sikap),
            calculateSubjectRaport(metrics) ?? "–"
          );
        });

        rowValues.push(
          toExcelNumber(student.sakit),
          toExcelNumber(student.izin),
          toExcelNumber(student.alfa),
          jumlahKehadiran,
          rataRata ?? "–",
          keterangan
        );

        const row = worksheet.getRow(rowIndex);
        row.values = [null, ...rowValues];
        row.height = 20;

        for (let col = 1; col <= totalColumnCount; col++) {
          const cell = row.getCell(col);
          cell.border = border;
          cell.alignment = {
            vertical: "middle",
            horizontal: col === 4 ? "left" : "center",
          };

          if (highlightedColumnIndexes.has(col) || col === averageCol) {
            cell.fill = highlightFill;
            cell.font = { bold: true, color: { argb: "FF1F2937" } };
          }

          if (col === notesCol || col === averageCol || col === attendanceEndCol) {
            cell.font = { ...(cell.font || {}), bold: true, color: { argb: "FF1F2937" } };
          }
        }
      });

      const cleanClass = selectedClass.className.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
      const cleanSemester = selectedSemester.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
      const cleanAcademicYear = selectedAcademicYear.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
      const cleanSubject =
        selectedSubject === "SEMUA"
          ? "Semua_Mapel"
          : selectedSubject.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
      const filename = `Master_Nilai_${cleanClass}_${cleanSemester}_${cleanAcademicYear}_${cleanSubject}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting master nilai:", error);
      alert("Terjadi kesalahan saat menyiapkan file Excel.");
    }
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
        <button
          type="button"
          onClick={exportToExcel}
          disabled={!selectedClassId || filteredMasterNilaiRows.length === 0 || filteredSubjectColumns.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Download Excel
        </button>
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
            {visibleClassMajors.map((cls) => (
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
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">Mata Pelajaran</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={!selectedClassId || subjectColumns.length === 0}
          >
            <option value="SEMUA">Semua Mata Pelajaran</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
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
          {mode === "homeroom"
            ? "Belum ada kelas wali yang terhubung ke akun guru ini."
            : <>Silakan pilih <b>Kelas</b> terlebih dahulu untuk menampilkan data siswa.</>}
        </div>
      ) : masterNilaiRows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Belum ada data penilaian untuk {selectedClass?.className}.
        </div>
      ) : filteredSubjectColumns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          Tidak ada data untuk mata pelajaran {selectedSubject} pada kelas {selectedClass?.className}.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead className="text-gray-700">
              <tr>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">
                  NO
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-24 text-center">
                  NIS
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-28 text-center">
                  NISN
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-56 text-left">
                  NAMA SISWA
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-16 text-center">
                  L/P
                </th>
                {filteredSubjectColumns.map((column) => (
                  <th
                    key={column.key}
                    colSpan={12}
                    className="border border-gray-400 bg-gray-100 px-2 py-1 text-center"
                    title={column.teacherName !== "-" ? `Guru: ${column.teacherName}` : undefined}
                  >
                    {column.label}
                  </th>
                ))}
                <th colSpan={4} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                  KEHADIRAN
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-20 text-center">
                  Rata-rata
                </th>
                <th rowSpan={3} className="border border-gray-400 bg-gray-100 px-2 py-1 w-28 text-center">
                  Keterangan
                </th>
              </tr>

              <tr>
                {filteredSubjectColumns.map((column) => (
                  <Fragment key={`${column.key}-groups`}>
                    <th colSpan={4} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                      Penilaian Harian
                    </th>
                    <th colSpan={4} className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">
                      Tugas
                    </th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">STS</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">SAS</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">Sikap</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 text-center">Raport</th>
                  </Fragment>
                ))}
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
                {filteredSubjectColumns.map((column) => (
                  <Fragment key={`${column.key}-leaf`}>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">1</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">2</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">3</th>
                    <th className="border border-gray-400 bg-[#fffe03] font-bold text-center px-2 py-1 w-12 text-center">RH</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">1</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">2</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-10 text-center">3</th>
                    <th className="border border-gray-400 bg-[#fffe03] font-bold text-center px-2 py-1 w-12 text-center">RT</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-12 text-center">Nilai</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-12 text-center">Nilai</th>
                    <th className="border border-gray-400 bg-gray-100 px-2 py-1 w-12 text-center">Nilai</th>
                    <th className="border border-gray-400 bg-[#fffe03] font-bold text-center px-2 py-1 w-14 text-center">Nilai</th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredMasterNilaiRows.map((student, idx) => {
                const jml = [student.sakit, student.izin, student.alfa].reduce(
                  (sum, v) => sum + (parseInt(v) || 0),
                  0
                );
                return (
                  <tr key={idx} className="hover:bg-pink-50">
                    <td className="border border-gray-300 text-center py-2">{idx + 1}</td>
                    <td className="border border-gray-300 px-1 py-2 text-center">{student.nis}</td>
                    <td className="border border-gray-300 px-1 py-2 text-center">{student.nisn}</td>
                    <td className="border border-gray-300 px-1 py-2">{student.name}</td>
                    <td className="border border-gray-300 px-1 py-2 text-center">{student.gender}</td>
                    {filteredSubjectColumns.map((column) => {
                      const metrics = student.subjectMetrics[column.key];
                      const nilaiRaport = calculateSubjectRaport(metrics);
                      return (
                        <Fragment key={`${student.studentId}-${column.key}`}>
                          <td className="border border-gray-300 px-2 py-2 text-center">{metrics?.uh.nilai1 || ""}</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{metrics?.uh.nilai2 || ""}</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{metrics?.uh.nilai3 || ""}</td>
                          <td className="border border-gray-300 py-2 bg-[#fffe03] font-bold text-center text-gray-800">
                            {metrics?.uh.rata === null || metrics?.uh.rata === undefined ? "–" : metrics.uh.rata}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{metrics?.tugas.nilai1 || ""}</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{metrics?.tugas.nilai2 || ""}</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{metrics?.tugas.nilai3 || ""}</td>
                          <td className="border border-gray-300 py-2 bg-[#fffe03] font-bold text-center text-gray-800">
                            {metrics?.tugas.rata === null || metrics?.tugas.rata === undefined ? "–" : metrics.tugas.rata}
                          </td>
                          <td className="border border-gray-300 px-1 py-2 text-center">{metrics?.sts || ""}</td>
                          <td className="border border-gray-300 px-1 py-2 text-center">{metrics?.sas || ""}</td>
                          <td className="border border-gray-300 px-1 py-2 text-center">{metrics?.sikap || ""}</td>
                          <td className="border border-gray-300 py-2 bg-[#fffe03] font-bold text-center text-gray-800">
                            {nilaiRaport === null ? "–" : nilaiRaport}
                          </td>
                        </Fragment>
                      );
                    })}

                    <td className="border border-gray-300 px-2 py-2 text-center">{student.sakit}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{student.izin}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{student.alfa}</td>
                    <td className="border border-gray-300 text-center font-semibold py-2">{jml}</td>
                    <td className="border border-gray-300 text-center font-bold py-2 bg-[#fffe03] text-gray-800">
                      {calculateOverallAverage(student) === null ? "–" : calculateOverallAverage(student)}
                    </td>
                    <td className="border border-gray-300 text-center font-semibold py-2">
                      {calculateOverallAverage(student) === null ? "–" : (calculateOverallAverage(student)! < 78 ? "Tidak Naik Kelas" : "Naik Kelas")}
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
