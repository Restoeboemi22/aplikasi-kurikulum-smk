import { forwardRef } from "react";
import { REPORT_HEADER_IMAGE_BASE64 } from "@/lib/kop-image";
import { type SemesterTerm } from "@/lib/grade-period";

export type PreviewRow = {
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

export type PreviewResponse = {
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

export const formatNumber = (value: number | null) => (value === null ? "-" : value.toFixed(2));
export const formatRounded = (value: number | null) => (value === null ? "-" : String(value));

export const getPromotionStatus = (preview: PreviewResponse | null, reportVariant: "STS" | "SAS") => {
  if (reportVariant === "STS") {
    return "-";
  }
  if (!preview || preview.summary.averageScore === null) {
    return "-";
  }
  const avg = preview.summary.averageScore;
  const rawLevel = (preview.classInfo.classLevel || "").trim().toUpperCase();
  const level = rawLevel === "10" ? "X" : rawLevel === "11" ? "XI" : rawLevel === "12" ? "XII" : rawLevel;

  if (avg < 78) {
    return level === "XII" ? "Tidak Lulus" : level ? `Tinggal di Kelas ${level}` : "Tidak Naik Kelas";
  }
  if (level === "X") return "Naik ke Kelas XI";
  if (level === "XI") return "Naik ke Kelas XII";
  if (level === "XII") return "Lulus";
  return "Naik Kelas";
};

interface PrintableReportSheetProps {
  preview: PreviewResponse;
  reportVariant?: "STS" | "SAS";
  reportDocumentTitle?: string;
  competenceLabel?: string;
  forPdfExport?: boolean;
}

export const PrintableReportSheet = forwardRef<HTMLDivElement, PrintableReportSheetProps>(
  function PrintableReportSheet(
    {
      preview,
      reportVariant = "STS",
      reportDocumentTitle,
      competenceLabel = reportVariant === "SAS" ? "Capaian Kompetensi" : "Capaian Pembelajaran",
      forPdfExport = false,
    },
    ref
  ) {
    const title =
      reportDocumentTitle ||
      (reportVariant === "SAS"
        ? `Laporan Hasil Belajar Siswa Sumatif Akhir Semester ${preview.filter.semester.toUpperCase()}`
        : `Laporan Hasil Belajar Siswa Sumatif Tengah Semester ${preview.filter.semester.toUpperCase()}`);

    const kelompokA = preview.groupedRows.find((g) => g.code === "A");
    const kelompokBGroup =
      preview.groupedRows.find((g) => g.code === "B") ||
      preview.groupedRows.find((g) => g.code !== "A");
    const otherBGroups = preview.groupedRows.filter(
      (g) => g.code !== "A" && g !== kelompokBGroup
    );

    const aCount = kelompokA?.items.length || 0;
    const bTotal = kelompokBGroup?.items.length || 0;

    // Tentukan jumlah mata pelajaran Kelompok B yang dialokasikan ke Halaman 1
    // agar tabel terbagi seimbang dan tanda tangan di Halaman 2 muat lapang
    let bPage1Count = 0;
    if (bTotal >= 6 && aCount <= 4) {
      bPage1Count = 3;
    } else if (bTotal >= 4) {
      bPage1Count = 2;
    } else if (bTotal === 3) {
      bPage1Count = 1;
    } else {
      bPage1Count = 0;
    }

    const bPage1Items = kelompokBGroup ? kelompokBGroup.items.slice(0, bPage1Count) : [];
    const bPage2Items = kelompokBGroup ? kelompokBGroup.items.slice(bPage1Count) : [];

    const renderSubjectTable = (
      items: NonNullable<typeof kelompokA>["items"],
      options?: { showSummary?: boolean }
    ) => (
      <table className="w-full min-w-full border-collapse">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-8 border px-1.5 py-1 text-center text-[12px] font-semibold uppercase text-slate-700">
              No
            </th>
            <th className="w-[28%] border px-2 py-1 text-left text-[12px] font-semibold uppercase text-slate-700">
              Mata Pelajaran
            </th>
            {reportVariant === "SAS" ? (
              <>
                <th className="w-16 border px-1.5 py-1 text-center text-[12px] font-semibold uppercase text-slate-700">
                  Nilai Akhir
                </th>
                <th className="border px-2 py-1 text-left text-[12px] font-semibold uppercase text-slate-700">
                  {competenceLabel}
                </th>
              </>
            ) : (
              <>
                <th className="w-11 border px-1 py-1 text-center text-[12px] font-semibold uppercase text-slate-700">
                  AH
                </th>
                <th className="w-11 border px-1 py-1 text-center text-[12px] font-semibold uppercase text-slate-700">
                  Tugas
                </th>
                <th className="w-11 border px-1 py-1 text-center text-[12px] font-semibold uppercase text-slate-700">
                  STS
                </th>
                <th className="w-14 border px-1 py-1 text-center text-[12px] font-semibold uppercase text-slate-700">
                  Nilai Akhir
                </th>
                <th className="border px-2 py-1 text-left text-[12px] font-semibold uppercase text-slate-700">
                  {competenceLabel}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.groupCode}-${item.subjectName}`} className="align-top">
              <td className="border px-1.5 py-1 text-center text-[12px] text-slate-700">
                {item.no}
              </td>
              <td className="border px-2 py-1 text-[12px] font-medium text-slate-900">
                {item.subjectName}
              </td>
              {reportVariant === "SAS" ? (
                <>
                  <td className="border px-1.5 py-1 text-center text-[12px] font-semibold text-slate-900">
                    {formatRounded(item.roundedScore)}
                  </td>
                  <td className="border px-2 py-1 text-[12px] leading-snug text-slate-700">
                    {item.competenceNote}
                  </td>
                </>
              ) : (
                <>
                  <td className="border px-1 py-1 text-center text-[12px] text-slate-700">
                    {formatNumber(item.uhAverage)}
                  </td>
                  <td className="border px-1 py-1 text-center text-[12px] text-slate-700">
                    {formatNumber(item.tugasAverage)}
                  </td>
                  <td className="border px-1 py-1 text-center text-[12px] text-slate-700">
                    {formatNumber(item.stsScore)}
                  </td>
                  <td className="border px-1 py-1 text-center text-[12px] font-semibold text-slate-900">
                    {formatRounded(item.roundedScore)}
                  </td>
                  <td className="border px-2 py-1 text-[12px] leading-snug text-slate-700">
                    {item.competenceNote}
                  </td>
                </>
              )}
            </tr>
          ))}

          {options?.showSummary && (
            <>
              {/* Baris Total & Rata-rata Nilai */}
              <tr className="bg-slate-50 font-semibold">
                <td className="border px-1.5 py-1 text-[12px] text-slate-700"></td>
                <td className="border px-2 py-1 text-[12px] uppercase text-slate-800">
                  Jumlah Nilai
                </td>
                {reportVariant === "SAS" ? (
                  <>
                    <td className="border px-1.5 py-1 text-center text-[12px] font-bold text-slate-900">
                      {formatRounded(preview.summary.totalScore)}
                    </td>
                    <td className="border px-2 py-1 text-[12px] text-slate-500 italic">
                      Total capaian nilai dari {preview.summary.completedSubjects} dari{" "}
                      {preview.summary.totalSubjects} mata pelajaran
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border px-1 py-1 text-[12px]"></td>
                    <td className="border px-1 py-1 text-[12px]"></td>
                    <td className="border px-1 py-1 text-[12px]"></td>
                    <td className="border px-1 py-1 text-center text-[12px] font-bold text-slate-900">
                      {formatRounded(preview.summary.totalScore)}
                    </td>
                    <td className="border px-2 py-1 text-[12px] text-slate-500 italic">
                      Total capaian nilai dari {preview.summary.completedSubjects} dari{" "}
                      {preview.summary.totalSubjects} mata pelajaran
                    </td>
                  </>
                )}
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="border px-1.5 py-1 text-[12px] text-slate-700"></td>
                <td className="border px-2 py-1 text-[12px] uppercase text-slate-800">
                  Rata-rata Nilai
                </td>
                {reportVariant === "SAS" ? (
                  <>
                    <td className="border px-1.5 py-1 text-center text-[12px] font-bold text-slate-900">
                      {preview.summary.averageScore === null
                        ? "-"
                        : preview.summary.averageScore.toFixed(2)}
                    </td>
                    <td className="border px-2 py-1 text-[12px] text-slate-500"></td>
                  </>
                ) : (
                  <>
                    <td className="border px-1 py-1 text-[12px]"></td>
                    <td className="border px-1 py-1 text-[12px]"></td>
                    <td className="border px-1 py-1 text-[12px]"></td>
                    <td className="border px-1 py-1 text-center text-[12px] font-bold text-slate-900">
                      {preview.summary.averageScore === null
                        ? "-"
                        : preview.summary.averageScore.toFixed(2)}
                    </td>
                    <td className="border px-2 py-1 text-[12px] text-slate-500"></td>
                  </>
                )}
              </tr>
            </>
          )}
        </tbody>
      </table>
    );

    return (
      <div
        ref={ref}
        className={`report-sheet mx-auto w-full max-w-[794px] ${
          forPdfExport
            ? "bg-white p-0"
            : "space-y-6"
        }`}
      >
        {/* =========================================================================
            HALAMAN 1: KOP SEKOLAH, BIODATA SISWA, KELOMPOK A & KELOMPOK B (BAGIAN 1)
        ========================================================================= */}
        <div
          className={`report-page report-page-1 bg-white ${
            forPdfExport
              ? "p-4 border-0 shadow-none rounded-none"
              : "p-5 border border-gray-200 rounded-2xl shadow-sm"
          }`}
        >
          {/* Header Kop */}
          <div
            className={`report-header overflow-hidden ${
              forPdfExport ? "border-0 rounded-none" : "rounded-2xl border border-slate-200"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={REPORT_HEADER_IMAGE_BASE64}
              alt="Kop SMKS Pacet"
              className="w-full h-auto block"
              style={{ display: "block", width: "100%", height: "auto" }}
            />
            <div className="report-header-bottom bg-white text-center py-1">
              <p className="text-base font-black uppercase tracking-wide text-slate-900">
                {title || preview.schoolInfo.title}
              </p>
              <p className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
                {preview.schoolInfo.academicYearTitle}
              </p>
            </div>
          </div>

          {/* Biodata Siswa */}
          <div className="report-student-meta mt-2">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="px-2 py-0.5 text-[12px] font-semibold text-gray-600">
                    <div className="flex justify-between">
                      <span>Nama</span>
                      <span>:</span>
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-[12px] font-bold text-gray-900">
                    {preview.student.name}
                  </td>
                  <td className="px-2 py-0.5 text-[12px] font-semibold text-gray-600">
                    <div className="flex justify-between">
                      <span>Bidang Keahlian</span>
                      <span>:</span>
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-[12px] text-gray-900">
                    {preview.classInfo.bidangKeahlian}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 text-[12px] font-semibold text-gray-600">
                    <div className="flex justify-between">
                      <span>Induk / NIS</span>
                      <span>:</span>
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-[12px] text-gray-900">
                    {preview.student.nis || "-"}
                  </td>
                  <td className="px-2 py-0.5 text-[12px] font-semibold text-gray-600">
                    <div className="flex justify-between">
                      <span>Program Keahlian</span>
                      <span>:</span>
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-[12px] text-gray-900">
                    {preview.classInfo.programKeahlian}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 text-[12px] font-semibold text-gray-600">
                    <div className="flex justify-between">
                      <span>NISN</span>
                      <span>:</span>
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-[12px] text-gray-900">
                    {preview.student.nisn}
                  </td>
                  <td className="px-2 py-0.5 text-[12px] font-semibold text-gray-600">
                    <div className="flex justify-between">
                      <span>Konsentrasi Keahlian</span>
                      <span>:</span>
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-[12px] text-gray-900">
                    {preview.classInfo.konsentrasiKeahlian}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 text-[12px] font-semibold text-gray-600">
                    <div className="flex justify-between">
                      <span>Kelas</span>
                      <span>:</span>
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-[12px] text-gray-900">
                    {preview.student.className}
                  </td>
                  <td className="px-2 py-0.5 text-[12px] font-semibold text-gray-600">
                    <div className="flex justify-between">
                      <span>Fase</span>
                      <span>:</span>
                    </div>
                  </td>
                  <td className="px-2 py-0.5 text-[12px] text-gray-900">
                    {preview.student.phase}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabel Nilai: Kelompok A (Mata Pelajaran Umum) */}
          <div className="mt-2 space-y-2">
            {!kelompokA ? (
              <div className="rounded-xl border border-dashed px-4 py-8 text-center text-xs text-gray-500">
                Belum ada data nilai yang bisa ditampilkan untuk periode ini.
              </div>
            ) : (
              <div
                key={kelompokA.code}
                className="report-group overflow-hidden rounded-xl border border-slate-300"
              >
                <div className="report-group-title bg-slate-200 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-slate-800">
                  {kelompokA.code}. {kelompokA.name}
                </div>
                <div className="overflow-x-auto">
                  {renderSubjectTable(kelompokA.items)}
                </div>
              </div>
            )}

            {/* Tabel Nilai: Kelompok B (Mata Pelajaran Kejuruan - Bagian 1 di Halaman 1) */}
            {bPage1Items.length > 0 && kelompokBGroup ? (
              <div
                key={`${kelompokBGroup.code}-p1`}
                className="report-group overflow-hidden rounded-xl border border-slate-300"
              >
                <div className="report-group-title bg-slate-200 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-slate-800">
                  {kelompokBGroup.code}. {kelompokBGroup.name}
                </div>
                <div className="overflow-x-auto">
                  {renderSubjectTable(bPage1Items)}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* =========================================================================
            HALAMAN 2: KELOMPOK B (LANJUTAN), PENGEMBANGAN DIRI, ABSENSI & CATATAN, TTD
        ========================================================================= */}
        <div
          className={`report-page report-page-2 bg-white ${
            forPdfExport
              ? "p-4 border-0 shadow-none rounded-none"
              : "p-5 border border-gray-200 rounded-2xl shadow-sm"
          }`}
          style={{ pageBreakBefore: "always", breakBefore: "page" }}
        >
          {/* Tabel Nilai: Kelompok B (Mata Pelajaran Kejuruan - Lanjutan) */}
          <div className="space-y-2">
            {bPage2Items.length > 0 && kelompokBGroup ? (
              <div
                key={`${kelompokBGroup.code}-p2`}
                className="report-group overflow-hidden rounded-xl border border-slate-300"
              >
                <div className="report-group-title bg-slate-200 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-slate-800">
                  {kelompokBGroup.code}. {kelompokBGroup.name}
                  {bPage1Items.length > 0 ? " (Lanjutan)" : ""}
                </div>
                <div className="overflow-x-auto">
                  {renderSubjectTable(bPage2Items, {
                    showSummary: otherBGroups.length === 0,
                  })}
                </div>
              </div>
            ) : null}

            {otherBGroups.map((group, groupIdx) => (
              <div
                key={group.code}
                className="report-group overflow-hidden rounded-xl border border-slate-300"
              >
                <div className="report-group-title bg-slate-200 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-slate-800">
                  {group.code}. {group.name}
                </div>
                <div className="overflow-x-auto">
                  {renderSubjectTable(group.items, {
                    showSummary: groupIdx === otherBGroups.length - 1,
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pengembangan Diri dan Kepribadian (Kembali di Halaman 2 Tepat di Bawah Tabel Nilai) */}
          <div className="report-panel mt-2.5 overflow-hidden rounded-xl border border-slate-300">
            <div className="report-panel-header bg-slate-100 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-slate-800">
              Pengembangan Diri dan Kepribadian
            </div>
            <div className="report-panel-body p-2 text-[12px] text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <p className="report-section-title mb-1 text-[12px] font-semibold text-slate-800">
                    Pengembangan Diri
                  </p>
                  <div className="report-stack space-y-1">
                    {preview.notes.development.map((item) => (
                      <div
                        key={item.activity}
                        className="report-row-box flex items-center justify-between gap-2 rounded-lg border px-2 py-0.5"
                      >
                        <span className="report-row-box-label text-[12px]">{item.activity}</span>
                        <span className="report-row-box-value text-[12px] font-semibold">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="report-section-title mb-1 text-[12px] font-semibold text-slate-800">
                    Kepribadian
                  </p>
                  <div className="report-stack space-y-1">
                    {preview.notes.personality.map((item) => (
                      <div
                        key={item.aspect}
                        className="report-row-box flex items-center justify-between gap-2 rounded-lg border px-2 py-0.5"
                      >
                        <span className="report-row-box-label text-[12px]">{item.aspect}</span>
                        <span className="report-row-box-value text-[12px] font-semibold">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Absensi, Kenaikan Kelas & Catatan Wali Kelas (Dua Kolom Hemat Ruang) */}
          <div className="report-lower-grid mt-2">
            <div className="grid gap-2.5 lg:grid-cols-2 items-stretch">
              {/* Kolom Kiri: Absensi & Kenaikan Kelas */}
              <div className="space-y-2 flex flex-col justify-between">
                <div className="report-panel overflow-hidden rounded-xl border border-slate-300">
                  <div className="report-panel-header bg-slate-100 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-slate-800">
                    Absensi / Ketidakhadiran
                  </div>
                  <div className="report-panel-body p-2 text-[12px] text-slate-700">
                    <div className="report-attendance-grid grid grid-cols-3 gap-2">
                      <div className="report-attendance-card rounded-lg border bg-slate-50 p-1 text-center">
                        <p className="report-attendance-card-label text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                          Sakit
                        </p>
                        <p className="report-attendance-card-value mt-0.5 text-[12px] font-bold text-slate-900">
                          {preview.notes.attendance.sakit}
                        </p>
                      </div>
                      <div className="report-attendance-card rounded-lg border bg-slate-50 p-1 text-center">
                        <p className="report-attendance-card-label text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                          Izin
                        </p>
                        <p className="report-attendance-card-value mt-0.5 text-[12px] font-bold text-slate-900">
                          {preview.notes.attendance.izin}
                        </p>
                      </div>
                      <div className="report-attendance-card rounded-lg border bg-slate-50 p-1 text-center">
                        <p className="report-attendance-card-label text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                          Alpha
                        </p>
                        <p className="report-attendance-card-value mt-0.5 text-[12px] font-bold text-slate-900">
                          {preview.notes.attendance.alpha}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kartu Kenaikan Kelas / Kelulusan */}
                <div className="report-promotion-card overflow-hidden rounded-xl border border-slate-300">
                  <div className="report-panel-header bg-slate-100 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-slate-800">
                    {preview.classInfo.classLevel === "XII" ? "Keterangan Kelulusan" : "Keterangan Kenaikan Kelas"}
                  </div>
                  <div className="report-panel-body px-3 py-1.5 text-[12px] text-slate-700 min-h-[46px] flex items-center justify-center">
                    {reportVariant === "STS" ? (
                      <p className="text-center text-[12px] text-slate-600 leading-snug">
                        Keputusan kenaikan kelas / kelulusan berlaku pada akhir Semester Genap.
                      </p>
                    ) : (
                      <div className="text-center py-0.5">
                        <p className="mb-0.5 text-[12px] text-slate-600">
                          Peserta didik dinyatakan:
                        </p>
                        <p className="inline-block rounded-lg border border-slate-300 bg-slate-50 px-4 py-0.5 text-[12px] font-black uppercase tracking-wider text-slate-900">
                          {getPromotionStatus(preview, reportVariant)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Catatan Wali Kelas */}
              <div className="report-panel overflow-hidden rounded-xl border border-slate-300 flex flex-col justify-between">
                <div className="report-panel-header bg-slate-100 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-slate-800">
                  Catatan Wali Kelas
                </div>
                <div className="report-panel-body p-2 flex-1 flex flex-col justify-center text-[12px]">
                  <div className="report-note-box rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[12px] leading-relaxed text-amber-900 min-h-[75px] flex items-center">
                    {preview.notes.homeroomNote || "Tingkatkan terus prestasi dan semangat belajarmu."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tanda Tangan */}
          <div className="report-signatures mt-3">
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
                <div className="h-10 flex flex-col justify-start">
                  <p className="report-signature-role-left text-[12px] leading-snug text-slate-900">
                    Mengetahui,
                    <br />
                    Orang Tua / Wali
                  </p>
                </div>
                <div className="report-signature-space h-14" />
                <div className="h-7 flex items-end">
                  <div className="border-b border-slate-900 w-[170px]" />
                </div>
              </div>
              <div className="report-signature-block report-signature-block-right col-start-3 flex w-[320px] flex-col items-center text-center">
                <div className="h-10 flex flex-col justify-start items-center text-center">
                  <p className="report-signature-city text-[12px] leading-snug text-slate-900">
                    {preview.notes.location.city},
                    {preview.notes.location.date ? ` ${preview.notes.location.date}` : ""}
                  </p>
                  <p className="report-signature-role text-[12px] leading-snug text-slate-900">
                    {preview.notes.signatures.homeroom.title}
                  </p>
                </div>
                <div className="report-signature-space h-14" />
                <div className="h-7 flex items-end justify-center">
                  <span className="report-signature-name inline-block border-b border-slate-900 pb-1 text-[12px] font-bold text-slate-900 text-center">
                    {preview.notes.signatures.homeroom.name || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="report-signature-principal mt-3 text-center flex flex-col items-center">
              <p className="report-signature-role text-[12px] leading-snug text-slate-900">
                Mengetahui,
                <br />
                Kepala SMKS Pacet
              </p>
              <div className="report-signature-space h-14" />
              <div className="h-7 flex items-end justify-center">
                <span className="report-signature-name inline-block border-b border-slate-900 pb-1 text-[12px] font-bold text-slate-900 text-center">
                  {preview.notes.signatures.principal.name || "-"}
                </span>
              </div>
              {preview.notes.signatures.principal.nip ? (
                <p className="report-signature-nip mt-1 text-[12px] text-slate-600">
                  NIP. {preview.notes.signatures.principal.nip}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
