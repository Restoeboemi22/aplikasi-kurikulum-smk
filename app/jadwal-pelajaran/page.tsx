"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Clock } from "lucide-react";

export default function LessonSchedulePage() {
  const [schedules] = useState([
    { day: "Senin", period: 1, time: "07:00 - 07:45", class: "X TKJ 1", subject: "Pemrograman Dasar", teacher: "Pak Budi", room: "Lab Komputer 1" },
    { day: "Senin", period: 2, time: "07:45 - 08:30", class: "X TKJ 1", subject: "Pemrograman Dasar", teacher: "Pak Budi", room: "Lab Komputer 1" },
    { day: "Selasa", period: 1, time: "07:00 - 07:45", class: "X TKJ 1", subject: "Basis Data", teacher: "Bu Siti", room: "Lab Komputer 2" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Jadwal Pelajaran</h3>
          <p className="text-sm text-gray-500">Tahun Ajaran 2024/2025 - Semester Ganjil</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
          <Plus size={18} />
          Tambah Jadwal
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Hari</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Jam Ke</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Waktu</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kelas</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Guru</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ruang</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {schedules.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{item.day}</td>
                  <td className="px-4 py-3 text-gray-600">{item.period}</td>
                  <td className="px-4 py-3 text-gray-600 flex items-center gap-2">
                    <Clock size={14} />
                    {item.time}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.class}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{item.subject}</td>
                  <td className="px-4 py-3 text-gray-600">{item.teacher}</td>
                  <td className="px-4 py-3 text-gray-600">{item.room}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 hover:bg-blue-100 rounded">
                        <Edit size={14} className="text-blue-600" />
                      </button>
                      <button className="p-1.5 hover:bg-red-100 rounded">
                        <Trash2 size={14} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
