"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Printer,
} from "lucide-react";
import dknHeaderImage from "../../KOP SMK.png";
import type { DKNSubjectConfig } from "@/lib/dkn";
import {
  buildSemesterLabel,
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
  type SemesterTerm,
} from "@/lib/grade-period";

type ClassOption = {
  id: string;
  className: string;
  grade: string;
  majorCode: string;
  majorName?: string | null;
  room?: string | null;
  homeroomTeacher: string;
};

type DKNScoreMap = Record<string, number | null>;

type DKNStudentRow = {
  no: number;
  studentId: string;
  nis: string;
  nisn: string;
  name: string;
  gender: string;
  rr: {
    label: string;
    scores: DKNScoreMap;
    average: number | null;
  };
  psaj: {
    label: string;
    scores: DKNScoreMap;
    total: number | null;
    average: number | null;
    minimum: number | null;
  };
  nsp: {
    label: string;
    scores: DKNScoreMap;
    average: number | null;
    characterValue: string;
    status: string;
  };
};

type DKNPreviewResponse = {
  filter: {
    academicYear: string;
    semester: SemesterTerm;
    semesterLabel: string;
  };
  schoolInfo: {
    title: string;
    schoolYearTitle: string;
    city: string;
    schoolName: string;
    schoolAddress: string;
  };
  criteria: {
    reportWeightPercent: number;
    psajWeightPercent: number;
    minimumReportAverage: number;
    minimumPsajScore: number;
    minimumNspAverage: number;
  };
  classInfo: {
    className: string;
    grade: string;
    majorCode: string;
    majorName: string;
    room: string;
    homeroomTeacher: string;
    concentration: string;
  };
  subjects: DKNSubjectConfig[];
  rows: DKNStudentRow[];
};

const formatScore = (value: number | null) => (value === null ? "" : value.toFixed(2));
const formatSummary = (value: number | null) => (value === null ? "" : value.toFixed(2));
const SUBJECT_COLUMN_WIDTH = 84;

const MAIN_COLGROUP_WIDTHS = [
  56, 142, 113, 312, 58, 70,
  ...Array.from({ length: 16 }, () => SUBJECT_COLUMN_WIDTH),
  85, 89, 78, 66,
];

function buildWorksheetRows(preview: DKNPreviewResponse) {
  const umumSubjects = preview.subjects.filter((subject) => subject.group === "UMUM");
  const kejuruanSubjects = preview.subjects.filter((subject) => subject.group === "KEJURUAN");

  const topRows = [
    [preview.schoolInfo.title],
    [preview.schoolInfo.schoolYearTitle],
    ["Kab/Kota", "", "", `: ${preview.schoolInfo.city}`],
    ["Nama Sekolah/Status", "", "", `: ${preview.schoolInfo.schoolName}`],
    ["Alamat/Nomor Telpon", "", "", `: ${preview.schoolInfo.schoolAddress}`],
    ["Konsentrasi Keahlian", "", "", `: ${preview.classInfo.concentration}`],
    ["Kelas / Semester", "", "", `: ${preview.classInfo.className} / ${preview.filter.semester}`],
  ];

  const headerRow1 = [
    "No. Urut",
    "NIS",
    "NISN",
    "Nama Peserta",
    "L/P",
    "Mata Pelajaran",
    "KELOMPOK MAPEL UMUM",
    ...Array.from({ length: Math.max(umumSubjects.length - 1, 0) }, () => ""),
    "KELOMPOK MAPEL KEJURUAN",
    ...Array.from({ length: Math.max(kejuruanSubjects.length - 1, 0) }, () => ""),
    "Jumlah",
    "Rata-Rata",
    "Nilai karakter",
    "Ket. (L/TL)",
  ];

  const headerRow2 = [
    "",
    "",
    "",
    "",
    "",
    "",
    ...preview.subjects.map((subject) => subject.headerLabel),
    "",
    "",
    "",
    "",
  ];

  const headerRow3 = [
    "",
    "",
    "",
    "",
    "",
    "",
    ...preview.subjects.map(() => ""),
    "",
    "",
    "",
    "",
  ];

  const headerRow4 = [
    "",
    "",
    "",
    "",
    "",
    "Nilai",
    ...preview.subjects.map((subject) => subject.orderLabel),
    "17",
    "18",
    "19",
    "20",
  ];

  const bodyRows = preview.rows.flatMap((student) => [
    [
      student.no,
      student.nis,
      student.nisn,
      student.name,
      student.gender,
      "RR",
      ...preview.subjects.map((subject) => {
        const score = student.rr.scores[subject.name];
        return score === null ? "" : score;
      }),
      "",
      student.rr.average === null ? "" : student.rr.average,
      "",
      "",
    ],
    [
      "",
      "",
      "",
      "",
      "",
      "PSAJ",
      ...preview.subjects.map((subject) => {
        const score = student.psaj.scores[subject.name];
        return score === null ? "" : score;
      }),
      student.psaj.total === null ? "" : student.psaj.total,
      student.psaj.average === null ? "" : student.psaj.average,
      "",
      "",
    ],
    [
      "",
      "",
      "",
      "",
      "",
      "NSP",
      ...preview.subjects.map((subject) => {
        const score = student.nsp.scores[subject.name];
        return score === null ? "" : score;
      }),
      "",
      student.nsp.average === null ? "" : student.nsp.average,
      student.nsp.characterValue,
      student.nsp.status,
    ],
  ]);

  return [...topRows, [], headerRow1, headerRow2, headerRow3, headerRow4, ...bodyRows];
}

function exportToExcel(preview: DKNPreviewResponse) {
  const worksheetRows = buildWorksheetRows(preview);
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);

  const umumCount = preview.subjects.filter((subject) => subject.group === "UMUM").length;
  const kejuruanCount = preview.subjects.filter((subject) => subject.group === "KEJURUAN").length;
  const totalColumns = 6 + preview.subjects.length + 4;

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColumns - 1 } },
    { s: { r: 8, c: 0 }, e: { r: 11, c: 0 } },
    { s: { r: 8, c: 1 }, e: { r: 11, c: 1 } },
    { s: { r: 8, c: 2 }, e: { r: 11, c: 2 } },
    { s: { r: 8, c: 3 }, e: { r: 11, c: 3 } },
    { s: { r: 8, c: 4 }, e: { r: 11, c: 4 } },
    { s: { r: 8, c: 5 }, e: { r: 10, c: 5 } },
    { s: { r: 8, c: 6 }, e: { r: 8, c: 6 + umumCount - 1 } },
    {
      s: { r: 8, c: 6 + umumCount },
      e: { r: 8, c: 6 + umumCount + kejuruanCount - 1 },
    },
    { s: { r: 8, c: totalColumns - 4 }, e: { r: 11, c: totalColumns - 4 } },
    { s: { r: 8, c: totalColumns - 3 }, e: { r: 11, c: totalColumns - 3 } },
    { s: { r: 8, c: totalColumns - 2 }, e: { r: 11, c: totalColumns - 2 } },
    { s: { r: 8, c: totalColumns - 1 }, e: { r: 11, c: totalColumns - 1 } },
  ];

  worksheet["!cols"] = MAIN_COLGROUP_WIDTHS.map((width) => ({ wpx: width }));
  worksheet["!rows"] = [
    { hpx: 16 },
    { hpx: 16 },
    { hpx: 15 },
    { hpx: 15 },
    { hpx: 15 },
    { hpx: 18 },
    { hpx: 15 },
    { hpx: 8 },
    { hpx: 22 },
    { hpx: 24 },
    { hpx: 18 },
    { hpx: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DKN");
  XLSX.writeFile(
    workbook,
    `DKN-${preview.classInfo.className}-${preview.filter.academicYear}-${preview.filter.semester}.xlsx`
  );
}

export default function DKNPage() {
  const defaultPeriod = getDefaultGradePeriod();
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(defaultPeriod.academicYear);
  const [selectedSemester, setSelectedSemester] = useState<SemesterTerm>(defaultPeriod.term);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [preview, setPreview] = useState<DKNPreviewResponse | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const umumSubjects = preview?.subjects.filter((subject) => subject.group === "UMUM") ?? [];
  const kejuruanSubjects =
    preview?.subjects.filter((subject) => subject.group === "KEJURUAN") ?? [];

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    setPreview(null);
  }, [selectedAcademicYear, selectedSemester, selectedClassName]);

  async function loadOptions() {
    setIsLoadingOptions(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/dkn/options", { cache: "no-store" });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal memuat opsi Cetak DKN.");
      }

      setClasses(result.classes || []);
      setSelectedClassName((current) => {
        if ((result.classes || []).some((item: ClassOption) => item.className === current)) {
          return current;
        }
        return result.classes?.length === 1 ? result.classes[0].className : "";
      });
    } catch (error: any) {
      setErrorMessage(error.message || "Gagal memuat opsi Cetak DKN.");
    } finally {
      setIsLoadingOptions(false);
    }
  }

  async function loadPreview() {
    if (!selectedClassName) {
      setErrorMessage("Pilih kelas terlebih dahulu.");
      return;
    }

    setIsLoadingPreview(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        className: selectedClassName,
        academicYear: selectedAcademicYear,
        semester: selectedSemester,
      });

      const response = await fetch(`/api/dkn/preview?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal memuat preview DKN.");
      }

      setPreview(result);
    } catch (error: any) {
      setPreview(null);
      setErrorMessage(error.message || "Gagal memuat preview DKN.");
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function handlePrint() {
    if (!previewRef.current || !preview) return;

    const printWindow = window.open("", "_blank", "width=1500,height=900");
    if (!printWindow) {
      setErrorMessage("Popup print diblokir browser. Izinkan pop-up lalu coba lagi.");
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>DKN ${preview.classInfo.className}</title>
          <style>
            @page { size: A4 landscape; margin: 9mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: white; }
            .dkn-sheet { width: 100%; }
            .dkn-sheet-frame { border: 1px solid #64748b; padding: 6px; }
            .dkn-header-image { width: 100%; display: block; margin-bottom: 6px; }
            .dkn-title { text-align: center; font-weight: 700; font-size: 14px; line-height: 1.2; }
            .dkn-subtitle { text-align: center; font-weight: 700; font-size: 12px; margin-bottom: 6px; line-height: 1.2; }
            .dkn-top-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 6px; margin-bottom: 6px; }
            .dkn-meta-table, .dkn-side-table, .dkn-main-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .dkn-meta-table td, .dkn-side-table td { border: 1px solid #64748b; padding: 3px 5px; font-size: 10px; vertical-align: middle; line-height: 1.15; }
            .dkn-main-table th, .dkn-main-table td { border: 1px solid #64748b; padding: 2px 3px; font-size: 8.5px; line-height: 1.15; }
            .dkn-main-table th { font-weight: 700; text-align: center; vertical-align: middle; }
            .dkn-main-table td { text-align: center; vertical-align: middle; }
            .dkn-main-table td.left { text-align: left; }
            .dkn-row-label { font-weight: 700; }
            .dkn-group-header { background: #e5e7eb !important; }
            .dkn-right-heading { text-align: center; font-weight: 700; }
            .dkn-criteria-title { font-weight: 700; text-align: center; }
          </style>
        </head>
        <body>
          ${previewRef.current.innerHTML}
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Cetak DKN</h3>
          <p className="text-sm text-gray-500">
            Template DKN mengikuti workbook sekolah dengan tiga baris nilai per siswa: RR, PSAJ,
            dan NSP.
          </p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          Akses Admin
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-primary-600" />
          <h4 className="font-semibold text-gray-800">Filter DKN</h4>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tahun Ajaran
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as SemesterTerm)}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {SEMESTER_OPTIONS.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Kelas
            </label>
            <select
              value={selectedClassName}
              onChange={(e) => setSelectedClassName(e.target.value)}
              disabled={isLoadingOptions}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">Pilih kelas</option>
              {classes.map((item) => (
                <option key={item.id} value={item.className}>
                  {item.className}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={loadPreview}
            disabled={!selectedClassName || isLoadingPreview}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingPreview ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            Tampilkan Preview
          </button>

          <button
            onClick={handlePrint}
            disabled={!preview}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer size={16} />
            Print
          </button>

          <button
            onClick={() => preview && exportToExcel(preview)}
            disabled={!preview}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            Export Excel
          </button>

          <div className="text-sm text-gray-500">
            Periode aktif:{" "}
            <span className="font-medium text-gray-700">
              {buildSemesterLabel(selectedSemester, selectedAcademicYear)}
            </span>
          </div>
        </div>
      </div>

      {!preview ? (
        <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
            <FileSpreadsheet size={34} className="text-primary-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800">Preview DKN Belum Ditampilkan</h4>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Pilih tahun ajaran, semester, dan kelas terlebih dahulu, lalu klik tombol
            `Tampilkan Preview`.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-gray-800">
                Preview DKN {preview.classInfo.className}
              </h4>
              <p className="text-sm text-gray-500">
                {preview.rows.length} siswa • {preview.subjects.length} mata pelajaran
              </p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {preview.filter.semesterLabel}
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Baris `RR` mengambil nilai akhir semester aktif, `PSAJ` memakai nilai `SAS`, dan `NSP`
            dihitung otomatis mengikuti formula template sekolah.
          </div>

          <div ref={previewRef} className="dkn-sheet rounded-2xl border border-slate-200 bg-white p-4">
            <div className="dkn-sheet-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dknHeaderImage.src}
                alt="Kop SMK"
                className="w-full h-auto block"
                style={{ display: "block", width: "100%", height: "auto" }}
              />

              <div className="dkn-title text-center text-base font-bold text-slate-900">
                {preview.schoolInfo.title}
              </div>
              <div className="dkn-subtitle text-center text-sm font-bold text-slate-800">
                {preview.schoolInfo.schoolYearTitle}
              </div>

              <div className="dkn-top-grid mb-2 grid gap-2 xl:grid-cols-[1fr_360px]">
                <table className="dkn-meta-table w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-[170px] border px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                        Kab/Kota
                      </td>
                      <td className="w-[24px] border px-2 py-1.5 text-center text-[10px] text-slate-900">
                        :
                      </td>
                      <td className="border px-3 py-1.5 text-[10px] text-slate-900">
                        {preview.schoolInfo.city}
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                        Nama Sekolah/Status
                      </td>
                      <td className="border px-2 py-1.5 text-center text-[10px] text-slate-900">
                        :
                      </td>
                      <td className="border px-3 py-1.5 text-[10px] text-slate-900">
                        {preview.schoolInfo.schoolName}
                      </td>
                    </tr>
                    <tr>
                      <td className="border px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                        Alamat/Nomor Telpon
                      </td>
                      <td className="border px-2 py-1.5 text-center text-[10px] text-slate-900">
                        :
                      </td>
                      <td className="border px-3 py-1.5 text-[10px] text-slate-900">
                        {preview.schoolInfo.schoolAddress}
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                        Konsentrasi Keahlian
                      </td>
                      <td className="border px-2 py-1.5 text-center text-[10px] text-slate-900">
                        :
                      </td>
                      <td className="border px-3 py-1.5 text-[10px] text-slate-900">
                        {preview.classInfo.concentration}
                      </td>
                    </tr>
                    <tr>
                      <td className="border px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                        Kelas / Semester
                      </td>
                      <td className="border px-2 py-1.5 text-center text-[10px] text-slate-900">
                        :
                      </td>
                      <td className="border px-3 py-1.5 text-[10px] text-slate-900">
                        {preview.classInfo.className} / {preview.filter.semester}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table className="dkn-side-table w-full border-collapse">
                  <tbody>
                    <tr>
                      <td colSpan={4} className="dkn-right-heading border px-3 py-1.5 text-[10px]">
                        FORMULA NSP
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="border px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                        RAPOR
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        {preview.criteria.reportWeightPercent}
                      </td>
                      <td className="border px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                        PSAJ
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        {preview.criteria.psajWeightPercent}
                      </td>
                    </tr>
                    <tr>
                      <td className="border px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                        NSP =
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        {preview.criteria.reportWeightPercent}
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        +
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        {preview.criteria.psajWeightPercent}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="dkn-criteria-title border px-3 py-1.5 text-[10px]">
                        KRITERIA KELULUSAN
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="border px-3 py-1.5 text-[10px] text-slate-700">
                        NILAI RATA - RATA RAPOR
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        {preview.criteria.minimumReportAverage}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="border px-3 py-1.5 text-[10px] text-slate-700">
                        NILAI MINIMAL PSAJ
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        {preview.criteria.minimumPsajScore}
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="border px-3 py-1.5 text-[10px] text-slate-700">
                        MINIMAL NILAI RATA RATA NSP
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        {preview.criteria.minimumNspAverage}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="border px-3 py-1.5 text-[10px] text-slate-700">
                        WALI KELAS
                      </td>
                      <td className="border px-3 py-1.5 text-center text-[10px] text-slate-900">
                        {preview.classInfo.homeroomTeacher}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto">
                <table className="dkn-main-table min-w-[1760px] border-collapse">
                  <colgroup>
                    {MAIN_COLGROUP_WIDTHS.map((width, index) => (
                      <col key={index} style={{ width: `${width}px` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="h-[28px]">
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        No. Urut
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        NIS
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        NISN
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        Nama Peserta
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        L/P
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        Mata Pelajaran
                      </th>
                      <th
                        colSpan={umumSubjects.length}
                        className="dkn-group-header border px-2 py-1 text-[10px] font-bold text-slate-700"
                      >
                        KELOMPOK MAPEL UMUM
                      </th>
                      <th
                        colSpan={kejuruanSubjects.length}
                        className="dkn-group-header border px-2 py-1 text-[10px] font-bold text-slate-700"
                      >
                        KELOMPOK MAPEL KEJURUAN
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        Jumlah
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        Rata-Rata
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        Nilai karakter
                      </th>
                      <th rowSpan={4} className="border px-2 py-1 text-[10px] font-bold text-slate-700">
                        Ket. (L/TL)
                      </th>
                    </tr>
                    <tr className="h-[24px]">
                      {preview.subjects.map((subject) => (
                        <th
                          key={subject.name}
                          className="border px-1 py-1 text-[9px] font-bold text-slate-700"
                          title={subject.name}
                        >
                          {subject.headerLabel}
                        </th>
                      ))}
                    </tr>
                    <tr className="h-[18px]">
                      {preview.subjects.map((subject) => (
                        <th key={`${subject.name}-blank`} className="border px-1 py-0.5 text-[8px]" />
                      ))}
                    </tr>
                    <tr className="h-[22px]">
                      {preview.subjects.map((subject) => (
                        <th
                          key={`${subject.name}-order`}
                          className="border px-1 py-0.5 text-[8px] font-bold text-slate-700"
                        >
                          {subject.orderLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {preview.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={preview.subjects.length + 10}
                          className="border px-4 py-12 text-center text-sm text-slate-500"
                        >
                          Belum ada data siswa atau data nilai untuk kelas ini.
                        </td>
                      </tr>
                    ) : (
                      preview.rows.map((student, index) => (
                        <Fragment key={student.studentId}>
                          <tr className={index % 2 === 0 ? "bg-white h-[24px]" : "bg-slate-50/30 h-[24px]"}>
                            <td rowSpan={3} className="border px-2 py-1 text-center text-[10px]">
                              {student.no}
                            </td>
                            <td rowSpan={3} className="border px-2 py-1 text-center text-[10px]">
                              {student.nis}
                            </td>
                            <td rowSpan={3} className="border px-2 py-1 text-center text-[10px]">
                              {student.nisn}
                            </td>
                            <td
                              rowSpan={3}
                              className="left border px-2 py-1 text-left text-[10px] font-medium text-slate-900"
                            >
                              {student.name}
                            </td>
                            <td rowSpan={3} className="border px-2 py-1 text-center text-[10px]">
                              {student.gender}
                            </td>
                            <td className="dkn-row-label border px-2 py-1 text-[10px] font-bold">
                              {student.rr.label}
                            </td>
                            {preview.subjects.map((subject) => (
                              <td
                                key={`${student.studentId}-rr-${subject.name}`}
                                className="border px-1 py-1 text-center text-[10px]"
                              >
                                {formatScore(student.rr.scores[subject.name])}
                              </td>
                            ))}
                            <td className="border px-1 py-1 text-center text-[10px]" />
                            <td className="border px-1 py-1 text-center text-[10px] font-semibold">
                              {formatSummary(student.rr.average)}
                            </td>
                            <td className="border px-1 py-1 text-center text-[10px]" />
                            <td className="border px-1 py-1 text-center text-[10px]" />
                          </tr>

                          <tr className={index % 2 === 0 ? "bg-white h-[24px]" : "bg-slate-50/30 h-[24px]"}>
                            <td className="dkn-row-label border px-2 py-1 text-[10px] font-bold">
                              {student.psaj.label}
                            </td>
                            {preview.subjects.map((subject) => (
                              <td
                                key={`${student.studentId}-psaj-${subject.name}`}
                                className="border px-1 py-1 text-center text-[10px]"
                              >
                                {formatScore(student.psaj.scores[subject.name])}
                              </td>
                            ))}
                            <td className="border px-1 py-1 text-center text-[10px] font-semibold">
                              {formatSummary(student.psaj.total)}
                            </td>
                            <td className="border px-1 py-1 text-center text-[10px] font-semibold">
                              {formatSummary(student.psaj.average)}
                            </td>
                            <td className="border px-1 py-1 text-center text-[10px]" />
                            <td className="border px-1 py-1 text-center text-[10px]" />
                          </tr>

                          <tr className={index % 2 === 0 ? "bg-white h-[24px]" : "bg-slate-50/30 h-[24px]"}>
                            <td className="dkn-row-label border px-2 py-1 text-[10px] font-bold">
                              {student.nsp.label}
                            </td>
                            {preview.subjects.map((subject) => (
                              <td
                                key={`${student.studentId}-nsp-${subject.name}`}
                                className="border px-1 py-1 text-center text-[10px]"
                              >
                                {formatScore(student.nsp.scores[subject.name])}
                              </td>
                            ))}
                            <td className="border px-1 py-1 text-center text-[10px]" />
                            <td className="border px-1 py-1 text-center text-[10px] font-semibold">
                              {formatSummary(student.nsp.average)}
                            </td>
                            <td className="border px-1 py-1 text-center text-[10px]">
                              {student.nsp.characterValue}
                            </td>
                            <td className="border px-1 py-1 text-center text-[10px] font-bold">
                              {student.nsp.status}
                            </td>
                          </tr>
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
