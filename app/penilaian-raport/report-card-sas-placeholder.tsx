"use client";

import { FileSpreadsheet, Info } from "lucide-react";

type ReportCardSASPlaceholderProps = {
  title: string;
};

export default function ReportCardSASPlaceholder({ title }: ReportCardSASPlaceholderProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border border-pink-200 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
            <FileSpreadsheet size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-pink-700">{title}</h3>
            <p className="text-sm text-gray-600">
              Halaman ini disiapkan untuk tampilan Raport SAS. UI finalnya menunggu instruksi lanjutan dari Anda.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
        <div className="flex items-start gap-3">
          <Info size={20} className="mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold">Status sementara</p>
            <p className="text-sm">
              Menu SAS sudah tersedia di submenu admin agar struktur navigasi siap lebih dulu. Setelah Anda memberikan
              arahan UI Raport SAS, halaman ini akan saya sesuaikan mengikuti desain yang Anda inginkan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
