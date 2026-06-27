export type ReportMajorCode = "TKJ" | "TKR";

export type ReportProfile = {
  majorCode: ReportMajorCode;
  menuLabel: string;
  headingLabel: string;
  bidangKeahlian: string;
  programKeahlian: string;
  konsentrasiKeahlian: string;
};

export const REPORT_PROFILES: Record<ReportMajorCode, ReportProfile> = {
  TKJ: {
    majorCode: "TKJ",
    menuLabel: "Cetak Raport TKJ",
    headingLabel: "Raport TKJ",
    bidangKeahlian: "Teknologi Informasi",
    programKeahlian: "Teknik Jaringan Komputer & Telekomunikasi",
    konsentrasiKeahlian: "Teknik Komputer & Jaringan",
  },
  TKR: {
    majorCode: "TKR",
    menuLabel: "Cetak Raport TKR",
    headingLabel: "Raport TKR",
    bidangKeahlian: "Teknologi Manufaktur & Rekayasa",
    programKeahlian: "Teknik Otomotif",
    konsentrasiKeahlian: "Teknik Kendaraan Ringan",
  },
};

export function getReportProfile(majorCode?: string | null) {
  if (!majorCode) return null;
  return REPORT_PROFILES[majorCode as ReportMajorCode] ?? null;
}
