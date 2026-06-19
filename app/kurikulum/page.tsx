"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Eye, FileText } from "lucide-react";

export default function CurriculumPage() {
  const [curriculums] = useState([
    {
      id: 1,
      competency: "Teknik Komputer dan Informatika",
      subject: "Pemrograman Dasar",
      gradeLevel: "X",
      semester: "Ganjil",
      cp: "Memahami konsep dasar pemrograman",
      status: "AKTIF",
    },
    {
      id: 2,
      competency: "Teknik Komputer dan Informatika",
      subject: "Basis Data",
      gradeLevel: "X",
      semester: "Ganjil",
      cp: "Menerapkan konsep basis data relasional",
      status: "AKTIF",
    },
    {
      id: 3,
      competency: "Teknik Mesin",
      subject: "Gambar Teknik",
      gradeLevel: "X",
      semester: "Ganjil",
      cp: "Menggambar teknik dasar sesuai standar",
      status: "ARSIP",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Dokumen Kurikulum</h3>
          <p className="text-sm text-gray-500">Kelola CP, TP, ATP, dan silabus</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
          <Plus size={18} />
          Tambah Kurikulum
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kompetensi</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {curriculums.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">{item.competency}</span>
                </td>
                <td className="px-6 py-4 text-gray-600">{item.subject}</td>
                <td className="px-6 py-4 text-gray-600">{item.gradeLevel} - {item.semester}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === "AKTIF"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-blue-100 rounded-lg">
                      <Edit size={16} className="text-blue-600" />
                    </button>
                    <button className="p-2 hover:bg-red-100 rounded-lg">
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
