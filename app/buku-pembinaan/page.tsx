"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Eye, X, Printer } from "lucide-react";

export default function GuidanceBookPage() {
  const [guidances, setGuidances] = useState([
    { id: 1, no: 1, day: "Senin", date: "10 Juni 2024", keterangan: "Telat", teacherName: "Pak Budi Santoso" },
    { id: 2, no: 2, day: "Selasa", date: "11 Juni 2024", keterangan: "Ijin", teacherName: "Bu Siti Aminah" },
    { id: 3, no: 3, day: "Rabu", date: "12 Juni 2024", keterangan: "Alpa", teacherName: "Pak Anton Wijaya" },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    day: "Senin",
    date: "",
    keterangan: "Telat",
    teacherName: "",
  });

  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const keteranganOptions = ["Telat", "Ijin", "Alpa"];

  const getKeteranganColor = (keterangan: string) => {
    switch (keterangan) {
      case "Telat": return "bg-yellow-100 text-yellow-700";
      case "Ijin": return "bg-blue-100 text-blue-700";
      case "Alpa": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const handleAddGuidance = () => {
    if (!formData.teacherName || !formData.date) return;

    const newGuidance = {
      id: Date.now(),
      no: guidances.length + 1,
      day: formData.day,
      date: formData.date,
      keterangan: formData.keterangan,
      teacherName: formData.teacherName,
    };

    setGuidances([...guidances, newGuidance]);
    setIsModalOpen(false);
    setFormData({
      day: "Senin",
      date: "",
      keterangan: "Telat",
      teacherName: "",
    });
  };

  const handleDeleteGuidance = (id: number) => {
    const filtered = guidances.filter(item => item.id !== id);
    const renumbered = filtered.map((item, index) => ({ ...item, no: index + 1 }));
    setGuidances(renumbered);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Buku Pembinaan Guru</h3>
          <p className="text-sm text-gray-500">Catatan pembinaan dan keterlambatan, izin, dan alpa guru</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
            <Printer size={18} />
            Cetak Laporan
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus size={18} />
            Tambah Catatan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">No</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hari</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Guru</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Keterangan</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {guidances.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600">{item.no}</td>
                <td className="px-6 py-4 text-gray-600">{item.day}</td>
                <td className="px-6 py-4 text-gray-600">{item.date}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{item.teacherName}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getKeteranganColor(item.keterangan)}`}>
                    {item.keterangan}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="Lihat Detail">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-blue-100 rounded-lg" title="Edit">
                      <Edit size={16} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteGuidance(item.id)}
                      className="p-2 hover:bg-red-100 rounded-lg"
                      title="Hapus"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Tambah Catatan</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Hari</label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Tanggal</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Nama Guru</label>
                <input
                  type="text"
                  value={formData.teacherName}
                  onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                  placeholder="Masukkan nama guru"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Keterangan</label>
                <select
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {keteranganOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddGuidance}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
