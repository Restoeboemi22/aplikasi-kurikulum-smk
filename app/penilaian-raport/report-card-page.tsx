"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  Eye,
  FileSearch,
  GraduationCap,
  Loader2,
} from "lucide-react";
import reportHeaderImage from "../../KOP SMK.png";
import {
  buildSemesterLabel,
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
  type SemesterTerm,
} from "@/lib/grade-period";
import { getReportProfile, type ReportMajorCode } from "@/lib/report-profiles";

type ViewerInfo = {
  role: "ADMIN" | "TEACHER";
  isHomeroomTeacher: boolean;
  allowedClassNames: string[];
};

type ClassOption = {
  id: string;
  className: string;
  grade: string;
  majorCode: string;
  majorName?: string | null;
  room?: string | null;
  homeroomTeacher: string;
};

type StudentOption = {
  id: string;
  nis: string;
  name: string;
  className?: string | null;
};

type PreviewRow = {
  no: number;
  groupCode: string;
  groupName: string;
  subjectName: string;
  uhAverage: number | null;
  tugasAverage: number | null;
  stsScore: number | null;
  sasScore: number | null;
  finalScore: number | null;
  roundedScore: number | null;
  sikapScore: string | null;
  competenceNote: string;
  isComplete: boolean;
};

type PreviewResponse = {
  filter: {
    academicYear: string;
    semester: SemesterTerm;
    semesterLabel: string;
  };
  student: {
    id: string;
    name: string;
    nis: string;
    nisn: string;
    className: string;
    phase: string;
  };
  classInfo: {
    classLevel: string;
    majorCode: string;
    majorName: string;
    bidangKeahlian: string;
    programKeahlian: string;
    konsentrasiKeahlian: string;
    homeroomTeacher: string;
  };
  schoolInfo: {
    name: string;
    title: string;
    academicYearTitle: string;
  };
  summary: {
    totalScore: number;
    averageScore: number | null;
    completedSubjects: number;
    totalSubjects: number;
  };
  groupedRows: Array<{
    code: string;
    name: string;
    items: PreviewRow[];
  }>;
  notes: {
    attendance: {
      sakit: number;
      izin: number;
      alpha: number;
    };
    personality: Array<{ aspect: string; value: string }>;
    development: Array<{ activity: string; value: string }>;
    homeroomNote: string;
    location: {
      city: string;
      date: string;
    };
    signatures: {
      homeroom: {
        name: string;
        title: string;
      };
      principal: {
        name: string;
        title: string;
        nip: string;
      };
    };
    finalization: {
      isFinalized: boolean;
      finalizedAt: string | null;
    };
  };
};

type SupplementForm = {
  sakit: string;
  izin: string;
  alpha: string;
  developmentPramuka: string;
  developmentSholatDhuha: string;
  personalityAkhlak: string;
  personalityKerajinan: string;
  personalityKerapian: string;
  homeroomNote: string;
  reportCity: string;
  reportDate: string;
  homeroomSignatureName: string;
  homeroomSignatureTitle: string;
  principalSignatureName: string;
  principalSignatureTitle: string;
  principalNip: string;
};

const formatNumber = (value: number | null) => (value === null ? "-" : value.toFixed(2));
const formatRounded = (value: number | null) => (value === null ? "-" : String(value));

const createEmptySupplementForm = (): SupplementForm => ({
  sakit: "0",
  izin: "0",
  alpha: "0",
  developmentPramuka: "-",
  developmentSholatDhuha: "-",
  personalityAkhlak: "-",
  personalityKerajinan: "-",
  personalityKerapian: "-",
  homeroomNote: "",
  reportCity: "Pacet",
  reportDate: "",
  homeroomSignatureName: "",
  homeroomSignatureTitle: "Wali Kelas",
  principalSignatureName: "Kepala SMKS PACET",
  principalSignatureTitle: "Kepala Sekolah",
  principalNip: "",
});

type ReportCardPageProps = {
  reportMajorCode?: ReportMajorCode;
  reportLabel?: string;
  reportVariant?: "STS" | "SAS";
};

export default function ReportCardPage({
  reportMajorCode,
  reportLabel,
  reportVariant = "STS",
}: ReportCardPageProps = {}) {
  const defaultPeriod = getDefaultGradePeriod();
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const reportProfile = reportMajorCode ? getReportProfile(reportMajorCode) : null;

  const [viewer, setViewer] = useState<ViewerInfo | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(defaultPeriod.academicYear);
  const [selectedSemester, setSelectedSemester] = useState<SemesterTerm>(defaultPeriod.term);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSavingSupplement, setIsSavingSupplement] = useState(false);
  const [isTogglingFinalization, setIsTogglingFinalization] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [supplementForm, setSupplementForm] = useState<SupplementForm>(createEmptySupplementForm);
  const reportDocumentTitle = useMemo(() => {
    if (!preview) return "";
    const semesterLabel = preview.filter.semester.toUpperCase();
    return reportVariant === "SAS"
      ? `Laporan Hasil Belajar Siswa Sumatif Akhir Semester ${semesterLabel}`
      : `Laporan Hasil Belajar Siswa Sumatif Tengah Semester ${semesterLabel}`;
  }, [preview, reportVariant]);
  const competenceLabel = reportVariant === "SAS" ? "Capaian Kompetensi" : "Capaian Pembelajaran";

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    if (!selectedClassName) {
      setStudents([]);
      setSelectedStudentId("");
      setPreview(null);
      setSupplementForm(createEmptySupplementForm());
      return;
    }

    void loadStudents(selectedClassName);
  }, [selectedClassName]);

  useEffect(() => {
    if (!preview) {
      setSupplementForm(createEmptySupplementForm());
      return;
    }

    setSupplementForm({
      sakit: String(preview.notes.attendance.sakit ?? 0),
      izin: String(preview.notes.attendance.izin ?? 0),
      alpha: String(preview.notes.attendance.alpha ?? 0),
      developmentPramuka: preview.notes.development.find((item) => item.activity === "Pramuka")?.value ?? "-",
      developmentSholatDhuha:
        preview.notes.development.find((item) => item.activity === "Sholat Dhuha")?.value ?? "-",
      personalityAkhlak:
        preview.notes.personality.find((item) => item.aspect === "Akhlak")?.value ?? "-",
      personalityKerajinan:
        preview.notes.personality.find((item) => item.aspect === "Kerajinan")?.value ?? "-",
      personalityKerapian:
        preview.notes.personality.find((item) => item.aspect === "Kerapian")?.value ?? "-",
      homeroomNote: preview.notes.homeroomNote ?? "",
      reportCity: preview.notes.location.city ?? "Pacet",
      reportDate: preview.notes.location.date ?? "",
      homeroomSignatureName: preview.notes.signatures.homeroom.name ?? "",
      homeroomSignatureTitle: preview.notes.signatures.homeroom.title ?? "Wali Kelas",
      principalSignatureName: preview.notes.signatures.principal.name ?? "Kepala SMKS PACET",
      principalSignatureTitle: preview.notes.signatures.principal.title ?? "Kepala Sekolah",
      principalNip: preview.notes.signatures.principal.nip ?? "",
    });
  }, [preview]);

  const selectedClass = classes.find((item) => item.className === selectedClassName) ?? null;
  const selectedStudent = students.find((item) => item.id === selectedStudentId) ?? null;

  async function loadOptions() {
    setIsLoadingOptions(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const params = new URLSearchParams();
      if (reportMajorCode) {
        params.set("reportMajorCode", reportMajorCode);
      }

      const response = await fetch(
        `/api/report-cards/options${params.size ? `?${params.toString()}` : ""}`,
        { cache: "no-store" }
      );
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal memuat opsi Cetak Raport.");
      }

      setViewer(result.viewer);
      setClasses(result.classes);

      setSelectedClassName((current) =>
        result.classes.some((item: ClassOption) => item.className === current)
          ? current
          : result.classes.length === 1
            ? result.classes[0].className
            : ""
      );
    } catch (error: any) {
      setErrorMessage(error.message || "Gagal memuat opsi Cetak Raport.");
    } finally {
      setIsLoadingOptions(false);
    }
  }

  async function loadStudents(className: string) {
    setIsLoadingStudents(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const params = new URLSearchParams({ className });
      if (reportMajorCode) {
        params.set("reportMajorCode", reportMajorCode);
      }
      const response = await fetch(`/api/report-cards/options?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal memuat daftar siswa.");
      }

      setViewer(result.viewer);
      setStudents(result.students);

      setSelectedStudentId((current) =>
        result.students.some((student: StudentOption) => student.id === current) ? current : ""
      );
      setPreview(null);
    } catch (error: any) {
      setStudents([]);
      setSelectedStudentId("");
      setPreview(null);
      setErrorMessage(error.message || "Gagal memuat daftar siswa.");
    } finally {
      setIsLoadingStudents(false);
    }
  }

  async function loadPreview() {
    if (!selectedStudentId || !selectedAcademicYear || !selectedSemester) {
      setErrorMessage("Pilih tahun ajaran, semester, kelas, dan siswa terlebih dahulu.");
      return;
    }

    setIsLoadingPreview(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const params = new URLSearchParams({
        studentId: selectedStudentId,
        academicYear: selectedAcademicYear,
        semester: selectedSemester,
      });
      if (reportMajorCode) {
        params.set("reportMajorCode", reportMajorCode);
      }
      if (reportVariant) {
        params.set("reportVariant", reportVariant);
      }

      const response = await fetch(`/api/report-cards/preview?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal memuat preview raport.");
      }

      setPreview(result);
    } catch (error: any) {
      setPreview(null);
      setErrorMessage(error.message || "Gagal memuat preview raport.");
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function saveSupplement() {
    if (!selectedStudentId) {
      setErrorMessage("Pilih siswa terlebih dahulu sebelum menyimpan data pelengkap raport.");
      return;
    }

    setIsSavingSupplement(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/report-cards/supplement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYear: selectedAcademicYear,
          semester: selectedSemester,
          ...supplementForm,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan data pelengkap raport.");
      }

      setSuccessMessage("Data pelengkap raport berhasil disimpan.");
      await loadPreview();
    } catch (error: any) {
      setErrorMessage(error.message || "Gagal menyimpan data pelengkap raport.");
    } finally {
      setIsSavingSupplement(false);
    }
  }

  async function toggleFinalization() {
    if (!selectedStudentId) {
      setErrorMessage("Pilih siswa terlebih dahulu sebelum mengubah finalisasi raport.");
      return;
    }

    setIsTogglingFinalization(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/report-cards/supplement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle-finalization",
          studentId: selectedStudentId,
          academicYear: selectedAcademicYear,
          semester: selectedSemester,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal mengubah finalisasi raport.");
      }

      setSuccessMessage(
        result?.isFinalized
          ? "Raport berhasil difinalisasi."
          : "Finalisasi raport berhasil dibatalkan."
      );
      await loadPreview();
    } catch (error: any) {
      setErrorMessage(error.message || "Gagal mengubah finalisasi raport.");
    } finally {
      setIsTogglingFinalization(false);
    }
  }

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  async function handlePrint() {
    if (!previewRef.current || !preview) return;

    setIsGeneratingPdf(true);
    setErrorMessage("");

    let origBorder = "";
    let origBoxShadow = "";
    let origBorderRadius = "";
    let origHeaderBorder = "";
    let origHeaderBorderRadius = "";
    let origLowerGridBreak = "";
    let origLowerGridBreakBefore = "";
    let headerEl: HTMLDivElement | null = null;
    let lowerGridEl: HTMLDivElement | null = null;

    try {
      // Dynamically load html2pdf.js from CDN
      const html2pdfModule = await new Promise<any>((resolve, reject) => {
        if ((window as any).html2pdf) {
          resolve((window as any).html2pdf);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
        script.onload = () => resolve((window as any).html2pdf);
        script.onerror = () => reject(new Error("Gagal memuat library PDF. Periksa koneksi internet."));
        document.head.appendChild(script);
      });

      const el = previewRef.current;

      // Temporarily clean up the element for PDF capture
      origBorder = el.style.border;
      origBoxShadow = el.style.boxShadow;
      origBorderRadius = el.style.borderRadius;
      el.style.border = "none";
      el.style.boxShadow = "none";
      el.style.borderRadius = "0";

      headerEl = el.querySelector(".report-header") as HTMLDivElement | null;
      if (headerEl) {
        origHeaderBorder = headerEl.style.border;
        origHeaderBorderRadius = headerEl.style.borderRadius;
        headerEl.style.border = "none";
        headerEl.style.borderRadius = "0";
      }

      // Force a clean page break before the lower grid (Pengembangan Diri & Absensi)
      // to keep it side-by-side and correctly aligned on Page 2.
      lowerGridEl = el.querySelector(".report-lower-grid") as HTMLDivElement | null;
      if (lowerGridEl) {
        origLowerGridBreak = lowerGridEl.style.pageBreakBefore;
        origLowerGridBreakBefore = lowerGridEl.style.breakBefore;
        lowerGridEl.style.pageBreakBefore = "always";
        lowerGridEl.style.breakBefore = "page";
      }

      const studentName = preview.student.name.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
      const semLabel = preview.filter.semester.toUpperCase();
      const fileName = `Raport_${reportVariant}_${semLabel}_${studentName}.pdf`;

      await html2pdfModule()
        .set({
          margin: [10, 8, 10, 8],
          filename: fileName,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(el)
        .save();

      setSuccessMessage(`PDF "${fileName}" berhasil didownload.`);
    } catch (error: any) {
      setErrorMessage(error.message || "Gagal mengunduh PDF. Coba lagi.");
    } finally {
      // Restore original styles
      if (previewRef.current) {
        previewRef.current.style.border = origBorder;
        previewRef.current.style.boxShadow = origBoxShadow;
        previewRef.current.style.borderRadius = origBorderRadius;
      }
      if (headerEl) {
        headerEl.style.border = origHeaderBorder;
        headerEl.style.borderRadius = origHeaderBorderRadius;
      }
      if (lowerGridEl) {
        lowerGridEl.style.pageBreakBefore = origLowerGridBreak;
        lowerGridEl.style.breakBefore = origLowerGridBreakBefore;
      }
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{reportLabel || "Cetak Raport"}</h3>
          <p className="text-sm text-gray-500">
            Filter hanya menampilkan siswa sesuai jalur raport dan kelasnya masing-masing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {viewer?.role === "ADMIN" ? "Akses Admin" : "Akses Guru Wali Kelas"}
          </span>
          {viewer?.role === "TEACHER" && viewer.allowedClassNames.length > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {viewer.allowedClassNames.length} kelas wali
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <GraduationCap size={18} className="text-primary-600" />
          <h4 className="font-semibold text-gray-800">Filter Raport</h4>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  {item.className} {item.room ? `• Ruang ${item.room}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Siswa
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={!selectedClassName || isLoadingStudents}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">Pilih siswa</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.nis})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={loadPreview}
            disabled={!selectedStudentId || isLoadingPreview}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingPreview ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            Tampilkan Preview
          </button>
          <button
            onClick={handlePrint}
            disabled={!preview || isGeneratingPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isGeneratingPdf ? "Membuat PDF..." : "Download PDF"}
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
            <FileSearch size={34} className="text-primary-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800">Preview Raport Belum Ditampilkan</h4>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Pilih tahun ajaran, semester, kelas, dan siswa terlebih dahulu, lalu klik tombol
            `Tampilkan Preview`.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-gray-800">
                Preview {reportLabel || "Raport"}
              </h4>
              <p className="text-sm text-gray-500">
                {selectedStudent?.name} • {preview.filter.semesterLabel}
              </p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {preview.summary.completedSubjects}/{preview.summary.totalSubjects} mapel lengkap
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="font-semibold text-slate-800">Data Pelengkap Raport</h5>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      preview.notes.finalization.isFinalized
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {preview.notes.finalization.isFinalized ? "Sudah Final" : "Masih Draft"}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Lengkapi absensi, pengembangan diri, kepribadian, tanda tangan, dan catatan wali
                  untuk <span className="font-medium text-slate-700">{preview.student.name}</span>.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={toggleFinalization}
                  disabled={isTogglingFinalization}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    preview.notes.finalization.isFinalized
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isTogglingFinalization ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />}
                  {preview.notes.finalization.isFinalized ? "Batalkan Finalisasi" : "Finalisasi Raport"}
                </button>
                <button
                  onClick={saveSupplement}
                  disabled={isSavingSupplement || preview.notes.finalization.isFinalized}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingSupplement ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <GraduationCap size={16} />
                  )}
                  Simpan Data Pelengkap
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Absensi</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sakit</label>
                      <input
                        type="number"
                        min="0"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.sakit}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, sakit: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Izin</label>
                      <input
                        type="number"
                        min="0"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.izin}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, izin: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Alpha</label>
                      <input
                        type="number"
                        min="0"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.alpha}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, alpha: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Pengembangan Diri</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Pramuka</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.developmentPramuka}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, developmentPramuka: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sholat Dhuha</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.developmentSholatDhuha}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, developmentSholatDhuha: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Kepribadian</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Akhlak</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.personalityAkhlak}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, personalityAkhlak: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Kerajinan</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.personalityKerajinan}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, personalityKerajinan: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Kerapian</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.personalityKerapian}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, personalityKerapian: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Pengesahan Raport</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Kota</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.reportCity}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, reportCity: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Pacet"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Raport</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.reportDate}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, reportDate: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="20 Juni 2026"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Wali Kelas</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.homeroomSignatureName}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, homeroomSignatureName: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Jabatan Wali</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.homeroomSignatureTitle}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, homeroomSignatureTitle: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Kepala Sekolah</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.principalSignatureName}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, principalSignatureName: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Jabatan Kepala Sekolah</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.principalSignatureTitle}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, principalSignatureTitle: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">NIP Kepala Sekolah</label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.principalNip}
                        onChange={(e) => setSupplementForm((prev) => ({ ...prev, principalNip: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan Wali Kelas</label>
                  <textarea
                    value={supplementForm.homeroomNote}
                    disabled={preview.notes.finalization.isFinalized}
                    onChange={(e) => setSupplementForm((prev) => ({ ...prev, homeroomNote: e.target.value }))}
                    rows={7}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                    placeholder="Tuliskan catatan wali kelas untuk siswa ini..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            ref={previewRef}
            className="report-sheet mx-auto w-full max-w-[794px] min-h-[1123px] rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="report-header overflow-hidden rounded-3xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reportHeaderImage.src}
                alt="Kop SMKS Pacet"
                className="w-full h-auto block"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
              <div className="report-header-bottom bg-white text-center">
                <p className="text-xl font-black uppercase tracking-wide text-slate-900">
                  {reportDocumentTitle || preview.schoolInfo.title}
                </p>
                <p className="mt-1 text-base font-bold uppercase tracking-wide text-slate-700">
                  {preview.schoolInfo.academicYearTitle}
                </p>
              </div>
            </div>

            <div className="report-student-meta mt-4">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600"><div className="flex justify-between"><span>Nama</span><span>:</span></div></td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">{preview.student.name}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600"><div className="flex justify-between"><span>Bidang Keahlian</span><span>:</span></div></td>
                    <td className="px-3 py-2 text-xs text-gray-900">{preview.classInfo.bidangKeahlian}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600"><div className="flex justify-between"><span>Induk / NIS</span><span>:</span></div></td>
                    <td className="px-3 py-2 text-xs text-gray-900">{preview.student.nis}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600"><div className="flex justify-between"><span>Program Keahlian</span><span>:</span></div></td>
                    <td className="px-3 py-2 text-xs text-gray-900">{preview.classInfo.programKeahlian}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600"><div className="flex justify-between"><span>NISN</span><span>:</span></div></td>
                    <td className="px-3 py-2 text-xs text-gray-900">{preview.student.nisn}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600"><div className="flex justify-between"><span>Konsentrasi Keahlian</span><span>:</span></div></td>
                    <td className="px-3 py-2 text-xs text-gray-900">{preview.classInfo.konsentrasiKeahlian}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600"><div className="flex justify-between"><span>Kelas</span><span>:</span></div></td>
                    <td className="px-3 py-2 text-xs text-gray-900">{preview.student.className}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-600"><div className="flex justify-between"><span>Fase</span><span>:</span></div></td>
                    <td className="px-3 py-2 text-xs text-gray-900">
                      {preview.student.phase}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-4">
              {preview.groupedRows.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-gray-500">
                  Belum ada data nilai yang bisa ditampilkan untuk periode ini.
                </div>
              ) : (
                preview.groupedRows.map((group, groupIndex) => (
                  <div key={group.code} className="report-group overflow-hidden rounded-2xl border border-slate-300">
                    <div className="report-group-title bg-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-800">
                      {group.code}. {group.name}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-full border-collapse">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="w-10 border px-2 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">No</th>
                            <th className="w-[26%] border px-2 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">Mata Pelajaran</th>
                            {reportVariant === "SAS" ? (
                              <>
                                <th className="w-20 border px-2 py-2 text-center text-[11px] font-semibold uppercase text-slate-600">Nilai Akhir</th>
                                <th className="border px-2 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">{competenceLabel}</th>
                              </>
                            ) : (
                              <>
                                <th className="w-12 border px-2 py-2 text-center text-[11px] font-semibold uppercase text-slate-600">AH</th>
                                <th className="w-12 border px-2 py-2 text-center text-[11px] font-semibold uppercase text-slate-600">Tugas</th>
                                <th className="w-12 border px-2 py-2 text-center text-[11px] font-semibold uppercase text-slate-600">STS</th>
                                <th className="w-16 border px-2 py-2 text-center text-[11px] font-semibold uppercase text-slate-600">Nilai Akhir</th>
                                <th className="border px-2 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">{competenceLabel}</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item) => (
                            <tr key={`${group.code}-${item.subjectName}`} className="align-top">
                              <td className="border px-2 py-2 text-[11px] text-slate-700">{item.no}</td>
                              <td className="border px-2 py-2 text-[11px] font-medium text-slate-900">{item.subjectName}</td>
                              {reportVariant === "SAS" ? (
                                <>
                                  <td className="border px-2 py-2 text-center text-[11px] font-semibold text-slate-900">{formatRounded(item.roundedScore)}</td>
                                  <td className="border px-2 py-2 text-[11px] leading-5 text-slate-700">{item.competenceNote}</td>
                                </>
                              ) : (
                                <>
                                  <td className="border px-2 py-2 text-center text-[11px] text-slate-700">{formatNumber(item.uhAverage)}</td>
                                  <td className="border px-2 py-2 text-center text-[11px] text-slate-700">{formatNumber(item.tugasAverage)}</td>
                                  <td className="border px-2 py-2 text-center text-[11px] text-slate-700">{formatNumber(item.stsScore)}</td>
                                  <td className="border px-2 py-2 text-center text-[11px] font-semibold text-slate-900">{formatRounded(item.roundedScore)}</td>
                                  <td className="border px-2 py-2 text-[11px] leading-5 text-slate-700">{item.competenceNote}</td>
                                </>
                              )}
                            </tr>
                          ))}
                          {groupIndex === preview.groupedRows.length - 1 && (
                            <>
                              <tr className="bg-slate-50">
                                <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                <td className="border px-2 py-2 text-[11px] font-semibold uppercase text-slate-800">
                                  Jumlah Nilai
                                </td>
                                {reportVariant === "SAS" ? (
                                  <>
                                    <td className="border px-2 py-2 text-center text-[11px] font-bold text-slate-900">
                                      {formatRounded(preview.summary.totalScore)}
                                    </td>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                  </>
                                ) : (
                                  <>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                    <td className="border px-2 py-2 text-center text-[11px] font-bold text-slate-900">
                                      {formatRounded(preview.summary.totalScore)}
                                    </td>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                  </>
                                )}
                              </tr>
                              <tr className="bg-slate-50">
                                <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                <td className="border px-2 py-2 text-[11px] font-semibold uppercase text-slate-800">
                                  Rata-rata Nilai
                                </td>
                                {reportVariant === "SAS" ? (
                                  <>
                                    <td className="border px-2 py-2 text-center text-[11px] font-bold text-slate-900">
                                      {preview.summary.averageScore === null ? "-" : preview.summary.averageScore.toFixed(2)}
                                    </td>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                  </>
                                ) : (
                                  <>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                    <td className="border px-2 py-2 text-center text-[11px] font-bold text-slate-900">
                                      {preview.summary.averageScore === null ? "-" : preview.summary.averageScore.toFixed(2)}
                                    </td>
                                    <td className="border px-2 py-2 text-[11px] text-slate-700"></td>
                                  </>
                                )}
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="report-lower-grid mt-4 grid gap-4 lg:grid-cols-2">
              <div className="report-panel overflow-hidden rounded-2xl border border-slate-300">
                <div className="report-panel-header bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-800">
                  Pengembangan Diri dan Kepribadian
                </div>
                <div className="report-panel-body p-3 text-xs text-slate-700">
                  <div className="mb-3">
                    <p className="report-section-title mb-2 font-semibold text-slate-800">Pengembangan Diri</p>
                    <div className="report-stack space-y-2">
                      {preview.notes.development.map((item) => (
                        <div key={item.activity} className="report-row-box flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                          <span className="report-row-box-label">{item.activity}</span>
                          <span className="report-row-box-value font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="report-section-title mb-2 font-semibold text-slate-800">Kepribadian</p>
                    <div className="report-stack space-y-2">
                      {preview.notes.personality.map((item) => (
                        <div key={item.aspect} className="report-row-box flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                          <span className="report-row-box-label">{item.aspect}</span>
                          <span className="report-row-box-value font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="report-panel overflow-hidden rounded-2xl border border-slate-300">
                <div className="report-panel-header bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-800">
                  Absensi dan Catatan
                </div>
                <div className="report-panel-body space-y-3 p-3 text-xs text-slate-700">
                  <div className="report-attendance-grid grid grid-cols-3 gap-3">
                    <div className="report-attendance-card rounded-xl border bg-slate-50 p-2.5 text-center">
                      <p className="report-attendance-card-label text-xs font-semibold uppercase tracking-wide text-slate-500">Sakit</p>
                      <p className="report-attendance-card-value mt-1 text-lg font-bold text-slate-900">{preview.notes.attendance.sakit}</p>
                    </div>
                    <div className="report-attendance-card rounded-xl border bg-slate-50 p-2.5 text-center">
                      <p className="report-attendance-card-label text-xs font-semibold uppercase tracking-wide text-slate-500">Izin</p>
                      <p className="report-attendance-card-value mt-1 text-lg font-bold text-slate-900">{preview.notes.attendance.izin}</p>
                    </div>
                    <div className="report-attendance-card rounded-xl border bg-slate-50 p-2.5 text-center">
                      <p className="report-attendance-card-label text-xs font-semibold uppercase tracking-wide text-slate-500">Alpha</p>
                      <p className="report-attendance-card-value mt-1 text-lg font-bold text-slate-900">{preview.notes.attendance.alpha}</p>
                    </div>
                  </div>

                  <div className="report-note-box rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                    {preview.notes.homeroomNote}
                  </div>
                </div>
              </div>
            </div>

            <div className="report-signatures mt-6">
              <div
                className="report-signatures-top"
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr 320px",
                  alignItems: "start",
                  columnGap: "24px",
                  width: "100%",
                }}
              >
                <div className="report-signature-block report-signature-block-left w-[220px] text-left">
                  <p className="report-signature-role-left text-sm leading-6 text-slate-900">
                    Mengetahui,
                    <br />
                    Orang Tua / Wali
                  </p>
                  <div className="report-signature-space h-16" />
                  <div className="report-signature-name-left text-sm text-slate-900">nama dan ttd</div>
                </div>
                <div
                  className="report-signature-block report-signature-block-right col-start-3 flex w-[320px] flex-col items-center text-center"
                >
                  <p className="report-signature-city text-sm text-slate-900">
                    {preview.notes.location.city},{preview.notes.location.date ? ` ${preview.notes.location.date}` : ""}
                  </p>
                  <p className="report-signature-role text-sm text-slate-900">
                    {preview.notes.signatures.homeroom.title}
                  </p>
                  <div className="report-signature-space h-16" />
                  <div className="report-signature-name text-sm text-slate-900">
                    {preview.notes.signatures.homeroom.name || "-"}
                  </div>
                </div>
              </div>

              <div className="report-signature-principal mt-8 text-center">
                <p className="report-signature-role text-sm leading-6 text-slate-900">
                  Mengetahui,
                  <br />
                  Kepala SMKS Pacet
                </p>
                <div className="report-signature-space h-16" />
                <div className="report-signature-name text-sm text-slate-900">
                  {preview.notes.signatures.principal.name || "-"}
                </div>
                {preview.notes.signatures.principal.nip ? (
                  <p className="report-signature-nip text-xs text-slate-600">
                    NIP. {preview.notes.signatures.principal.nip}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
