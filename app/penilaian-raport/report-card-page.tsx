"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileArchive,
  FileSearch,
  FileText,
  FolderDown,
  GraduationCap,
  Loader2,
  Printer,
  Users,
  X,
} from "lucide-react";
import {
  buildSemesterLabel,
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
  type SemesterTerm,
} from "@/lib/grade-period";
import { getReportProfile, type ReportMajorCode } from "@/lib/report-profiles";
import {
  PrintableReportSheet,
  type PreviewResponse,
} from "@/components/report-card/printable-report-sheet";

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

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Helper render 2 halaman raport ke dokumen jsPDF.
 * Halaman 1: Kop, Biodata Siswa, & Kelompok A (Umum)
 * Halaman 2: Kelompok B (Kejuruan), Pengembangan Diri, Absensi, Kenaikan Kelas, & Tanda Tangan
 * Menjamin tidak ada celah/gap kosong dan tanda tangan selalu muncul utuh di Halaman 2.
 */
async function exportElementTo2PagePdf(element: HTMLElement) {
  const page1El = element.querySelector(".report-page-1") as HTMLElement | null;
  const page2El = element.querySelector(".report-page-2") as HTMLElement | null;

  if (!page1El || !page2El) {
    throw new Error("Struktur halaman raport tidak lengkap.");
  }

  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const canvas1 = await html2canvas(page1El, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const canvas2 = await html2canvas(page2El, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  // A4 = 210mm x 297mm
  // Lebar cetak: margin kiri 8mm, margin kanan 8mm => lebar 194mm
  const pdfWidth = 194;
  const leftMargin = 8;
  const topMargin = 8;

  const height1 = (canvas1.height * pdfWidth) / canvas1.width;
  const height2 = (canvas2.height * pdfWidth) / canvas2.width;

  // Halaman 1
  pdf.addImage(
    canvas1.toDataURL("image/jpeg", 0.98),
    "JPEG",
    leftMargin,
    topMargin,
    pdfWidth,
    height1
  );

  // Halaman 2 (dimulai tepat di atas halaman kedua)
  pdf.addPage();
  pdf.addImage(
    canvas2.toDataURL("image/jpeg", 0.98),
    "JPEG",
    leftMargin,
    topMargin,
    pdfWidth,
    height2
  );

  return pdf;
}

interface BatchProgress {
  current: number;
  total: number;
  percent: number;
  studentName?: string;
  statusMessage?: string;
  isComplete?: boolean;
}

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Batch download state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    current: 0,
    total: 0,
    percent: 0,
    statusMessage: "",
  });
  const [batchRenderStudent, setBatchRenderStudent] = useState<PreviewResponse | null>(null);
  const batchExportContainerRef = useRef<HTMLDivElement | null>(null);
  const abortBatchRef = useRef<boolean>(false);

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
      developmentPramuka:
        preview.notes.development.find((item) => item.activity === "Pramuka")?.value ?? "-",
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

      setSuccessMessage(
        "Data pelengkap dan pengesahan raport berhasil disimpan serta otomatis diterapkan untuk semua siswa pada kelas ini."
      );
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

  // Single PDF download for current selected student (2 pages deterministic)
  async function handlePrint() {
    if (!preview) return;

    setIsGeneratingPdf(true);
    setErrorMessage("");

    try {
      const studentName = preview.student.name
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      const semLabel = preview.filter.semester.toUpperCase();
      const fileName = `Raport_${reportVariant}_${semLabel}_${studentName}.pdf`;

      setBatchRenderStudent(preview);
      await new Promise((r) => setTimeout(r, 60));

      const container = batchExportContainerRef.current || previewRef.current;
      if (!container) {
        throw new Error("Kontainer render tidak ditemukan.");
      }

      const pdf = await exportElementTo2PagePdf(container);
      pdf.save(fileName);

      setSuccessMessage(`PDF "${fileName}" berhasil didownload.`);
    } catch (error: any) {
      console.error("Single PDF export error:", error);
      setErrorMessage(error.message || "Gagal mengunduh PDF. Coba lagi.");
    } finally {
      setIsGeneratingPdf(false);
      setBatchRenderStudent(null);
    }
  }

  // Batch download for all students in the active class
  async function handleBatchDownload(format: "MERGED_PDF" | "ZIP") {
    if (!selectedClassName || !selectedAcademicYear || !selectedSemester) {
      setErrorMessage("Pilih tahun ajaran, semester, dan kelas terlebih dahulu.");
      return;
    }

    setIsBatchRunning(true);
    abortBatchRef.current = false;
    setBatchProgress({
      current: 0,
      total: 0,
      percent: 5,
      statusMessage: `Mengambil seluruh data nilai & raport siswa kelas ${selectedClassName}...`,
    });

    try {
      const params = new URLSearchParams({
        className: selectedClassName,
        academicYear: selectedAcademicYear,
        semester: selectedSemester,
        reportVariant,
      });
      if (reportMajorCode) {
        params.set("reportMajorCode", reportMajorCode);
      }

      const res = await fetch(`/api/report-cards/batch-preview?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil data kelas.");
      }

      const previews: PreviewResponse[] = data.previews || [];
      if (previews.length === 0) {
        throw new Error(`Tidak ada data siswa ditemukan di kelas ${selectedClassName}.`);
      }

      setBatchProgress({
        current: 0,
        total: previews.length,
        percent: 10,
        statusMessage: "Menyiapkan mesin dokumen...",
      });

      let zip: any = null;
      let mergedPdf: any = null;
      let PDFDocumentModule: any = null;

      if (format === "ZIP") {
        const JSZipModule = (await import("jszip")).default;
        zip = new JSZipModule();
      } else {
        const pdfLib = await import("pdf-lib");
        PDFDocumentModule = pdfLib.PDFDocument;
        mergedPdf = await PDFDocumentModule.create();
      }

      const semLabel = selectedSemester.toUpperCase();
      const cleanClassName = selectedClassName.replace(/\s+/g, "_");

      for (let i = 0; i < previews.length; i++) {
        if (abortBatchRef.current) {
          throw new Error("Proses download dibatalkan oleh pengguna.");
        }

        const st = previews[i];
        const studentCleanName = (st.student.name || "Siswa")
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .trim()
          .replace(/\s+/g, "_");

        const studentFileName = `Raport_${reportVariant}_${semLabel}_${cleanClassName}_${String(
          i + 1
        ).padStart(2, "0")}_${studentCleanName}.pdf`;

        setBatchProgress({
          current: i + 1,
          total: previews.length,
          percent: 10 + Math.round((i / previews.length) * 80),
          studentName: st.student.name,
          statusMessage: `Membuat PDF siswa (${i + 1}/${previews.length}): ${st.student.name}...`,
        });

        setBatchRenderStudent(st);

        // Wait for React to render the DOM
        await new Promise((r) => setTimeout(r, 60));

        const container = batchExportContainerRef.current;
        if (!container) {
          throw new Error("Kontainer render PDF tidak ditemukan.");
        }

        const studentPdf = await exportElementTo2PagePdf(container);
        const arrayBuffer = studentPdf.output("arraybuffer");

        if (format === "ZIP") {
          zip.file(studentFileName, arrayBuffer);
        } else {
          const donorPdf = await PDFDocumentModule.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
          copiedPages.forEach((page: any) => mergedPdf.addPage(page));
        }
      }

      if (abortBatchRef.current) {
        throw new Error("Proses download dibatalkan.");
      }

      setBatchProgress({
        current: previews.length,
        total: previews.length,
        percent: 95,
        statusMessage:
          format === "ZIP"
            ? "Mengompresi file ke dalam format ZIP..."
            : "Mengompilasi seluruh halaman PDF gabungan...",
      });

      if (format === "ZIP") {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipFileName = `Raport_${reportVariant}_${semLabel}_${cleanClassName}_Semua_Siswa.zip`;
        triggerBlobDownload(zipBlob, zipFileName);
        setSuccessMessage(
          `Arsip ZIP (${previews.length} file PDF raport siswa kelas ${selectedClassName}) berhasil diunduh!`
        );
      } else {
        const mergedPdfBytes = await mergedPdf.save();
        const mergedBlob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const mergedFileName = `Raport_${reportVariant}_${semLabel}_${cleanClassName}_Semua_Siswa.pdf`;
        triggerBlobDownload(mergedBlob, mergedFileName);
        setSuccessMessage(
          `PDF Gabungan (${previews.length} siswa, ${previews.length * 2} halaman) untuk kelas ${selectedClassName} berhasil diunduh!`
        );
      }

      setBatchProgress({
        current: previews.length,
        total: previews.length,
        percent: 100,
        statusMessage: "Download selesai!",
        isComplete: true,
      });

      setTimeout(() => {
        setIsBatchModalOpen(false);
        setIsBatchRunning(false);
        setBatchRenderStudent(null);
      }, 1500);
    } catch (error: any) {
      console.error("Batch download error:", error);
      setErrorMessage(error.message || "Gagal melakukan download massal. Silakan coba lagi.");
      setIsBatchRunning(false);
      setBatchRenderStudent(null);
    }
  }

  function handleCancelBatch() {
    abortBatchRef.current = true;
    setIsBatchRunning(false);
    setIsBatchModalOpen(false);
    setBatchRenderStudent(null);
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

      {/* Filter Card */}
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
                  {student.name} ({student.nis || "-"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
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
            {isGeneratingPdf ? "Membuat PDF..." : "Download PDF (2 Lembar)"}
          </button>

          {/* Download Semua Siswa 1 Kelas */}
          <button
            onClick={() => setIsBatchModalOpen(true)}
            disabled={!selectedClassName || isBatchRunning}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-4 py-3 text-sm font-bold shadow-md transition disabled:cursor-not-allowed disabled:opacity-50"
            title="Download seluruh siswa di kelas aktif sekaligus tanpa perlu satu persatu"
          >
            <FolderDown size={17} />
            <span>Download Semua Siswa (1 Kelas)</span>
            {students.length > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur-xs">
                {students.length} Siswa
              </span>
            )}
          </button>

          <button
            onClick={() => window.print()}
            disabled={!preview}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer size={16} />
            Cetak Langsung (Print)
          </button>

          <div className="text-sm text-gray-500">
            Periode aktif:{" "}
            <span className="font-medium text-gray-700">
              {buildSemesterLabel(selectedSemester, selectedAcademicYear)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Preview or Empty Placeholder */}
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
          {selectedClassName && students.length > 0 && (
            <div className="mt-5">
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow transition"
              >
                <FolderDown size={15} />
                <span>Langsung Download Semua Raport Kelas {selectedClassName} ({students.length} Siswa)</span>
              </button>
            </div>
          )}
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

          {/* Data Pelengkap Card */}
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
                  {isTogglingFinalization ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <GraduationCap size={16} />
                  )}
                  {preview.notes.finalization.isFinalized
                    ? "Batalkan Finalisasi"
                    : "Finalisasi Raport"}
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
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Sakit
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.sakit}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({ ...prev, sakit: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Izin
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.izin}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({ ...prev, izin: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Alpha
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.alpha}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({ ...prev, alpha: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Pengembangan Diri</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pramuka
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.developmentPramuka}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            developmentPramuka: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Sholat Dhuha
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.developmentSholatDhuha}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            developmentSholatDhuha: e.target.value,
                          }))
                        }
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
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Akhlak
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.personalityAkhlak}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            personalityAkhlak: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kerajinan
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.personalityKerajinan}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            personalityKerajinan: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kerapian
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.personalityKerapian}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            personalityKerapian: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Baik / Cukup / Kurang"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-700">Pengesahan Raport</p>
                    <button
                      type="button"
                      onClick={saveSupplement}
                      disabled={isSavingSupplement || preview.notes.finalization.isFinalized}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Simpan pengesahan ini agar langsung otomatis dipakai untuk seluruh siswa"
                    >
                      {isSavingSupplement ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <GraduationCap size={13} />
                      )}
                      <span>Terapkan Pengesahan ke Semua Siswa</span>
                    </button>
                  </div>
                  <p className="mb-3 text-xs font-medium text-emerald-700">
                    Cukup sekali submit: Data Pengesahan Raport (Kota, Tanggal, Wali Kelas, Kepala
                    Sekolah) otomatis dipakai oleh tampilan raport semua siswa.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kota
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.reportCity}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({ ...prev, reportCity: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="Pacet"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tanggal Raport
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.reportDate}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({ ...prev, reportDate: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                        placeholder="20 Juni 2026"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nama Wali Kelas
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.homeroomSignatureName}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            homeroomSignatureName: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Jabatan Wali
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.homeroomSignatureTitle}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            homeroomSignatureTitle: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nama Kepala Sekolah
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.principalSignatureName}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            principalSignatureName: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Jabatan Kepala Sekolah
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.principalSignatureTitle}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({
                            ...prev,
                            principalSignatureTitle: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        NIP Kepala Sekolah
                      </label>
                      <input
                        type="text"
                        disabled={preview.notes.finalization.isFinalized}
                        value={supplementForm.principalNip}
                        onChange={(e) =>
                          setSupplementForm((prev) => ({ ...prev, principalNip: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Catatan Wali Kelas
                  </label>
                  <textarea
                    value={supplementForm.homeroomNote}
                    disabled={preview.notes.finalization.isFinalized}
                    onChange={(e) =>
                      setSupplementForm((prev) => ({ ...prev, homeroomNote: e.target.value }))
                    }
                    rows={7}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100"
                    placeholder="Tuliskan catatan wali kelas untuk siswa ini..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Printable Report Card Sheet */}
          <PrintableReportSheet
            ref={previewRef}
            preview={preview}
            reportVariant={reportVariant}
            reportDocumentTitle={reportDocumentTitle}
            competenceLabel={competenceLabel}
          />
        </div>
      )}

      {/* Hidden Off-Screen Container for Batch PDF Generation */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "794px",
          zIndex: 40,
          pointerEvents: "none",
          visibility: isBatchRunning || isGeneratingPdf ? "visible" : "hidden",
        }}
      >
        {batchRenderStudent && (
          <div ref={batchExportContainerRef}>
            <PrintableReportSheet
              preview={batchRenderStudent}
              reportVariant={reportVariant}
              reportDocumentTitle={reportDocumentTitle}
              competenceLabel={competenceLabel}
              forPdfExport={true}
            />
          </div>
        )}
      </div>

      {/* Batch Download Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <FolderDown size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Download Raport 1 Kelas Sekaligus
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Kelas{" "}
                    <span className="font-bold text-gray-700 dark:text-gray-200">
                      {selectedClassName}
                    </span>{" "}
                    • {selectedAcademicYear} • {selectedSemester} ({students.length} Siswa)
                  </p>
                </div>
              </div>
              {!isBatchRunning && (
                <button
                  onClick={() => setIsBatchModalOpen(false)}
                  className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {isBatchRunning ? (
              /* Running State with Progress Bar */
              <div className="space-y-4 py-2">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-emerald-600" />
                      {batchProgress.statusMessage}
                    </span>
                    <span>{batchProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 dark:bg-emerald-900 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${batchProgress.percent}%` }}
                    />
                  </div>
                  {batchProgress.total > 0 && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
                      Progres: <span className="font-bold">{batchProgress.current}</span> dari{" "}
                      <span className="font-bold">{batchProgress.total}</span> siswa
                    </p>
                  )}
                </div>

                <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
                  Mohon jangan menutup tab browser sampai proses download selesai.
                </p>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleCancelBatch}
                    className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                  >
                    Batalkan Proses
                  </button>
                </div>
              </div>
            ) : (
              /* Options Selection State */
              <div className="space-y-4 py-1">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Pilih format unduhan untuk seluruh siswa di kelas{" "}
                  <span className="font-bold text-gray-800 dark:text-white">
                    {selectedClassName}
                  </span>
                  :
                </p>

                {/* Option 1: Merged Single PDF */}
                <div
                  onClick={() => handleBatchDownload("MERGED_PDF")}
                  className="group cursor-pointer rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 p-4 transition shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            1 File PDF Gabungan
                          </h4>
                          <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            Rekomendasi Cetak Massal
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Seluruh raport siswa ({students.length} siswa) disatukan dalam 1 dokumen PDF
                          berurutan (2 halaman per siswa). Cukup klik cetak 1x ke mesin printer atau
                          fotokopi untuk mencetak seluruh kelas.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    Download 1 File PDF Gabungan ({students.length} Siswa)
                  </button>
                </div>

                {/* Option 2: ZIP File */}
                <div
                  onClick={() => handleBatchDownload("ZIP")}
                  className="group cursor-pointer rounded-2xl border border-gray-200 hover:border-indigo-400 bg-gray-50/60 hover:bg-indigo-50/40 dark:bg-gray-900/40 dark:hover:bg-indigo-950/20 p-4 transition shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
                        <FileArchive size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            Paket Arsip File ZIP (PDF Terpisah Tiap Siswa)
                          </h4>
                          <span className="rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-0.5 text-[10px] font-bold">
                            Rekomendasi Arsip / WA
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Berisi file PDF terpisah untuk tiap siswa (contoh:{" "}
                          <code className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                            Raport_01_Nama.pdf
                          </code>
                          ). Praktis untuk dikirimkan secara mandiri ke siswa atau wali murid via
                          WhatsApp.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    Download Paket File ZIP ({students.length} Siswa)
                  </button>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
