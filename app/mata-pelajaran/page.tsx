"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, X } from "lucide-react";

const DEFAULT_SUBJECTS = [
  { id: 1, name: "Pendidikan Agama dan Budi Pekerti", code: "PABP" },
  { id: 2, name: "Pendidikan Pancasila", code: "PPKn" },
  { id: 3, name: "Bahasa Indonesia", code: "BIN" },
  { id: 4, name: "Pendidikan Jasmani, Olah Raga dan Kesehatan", code: "PJOK" },
  { id: 5, name: "Sejarah", code: "SEJ" },
  { id: 6, name: "Seni Budaya", code: "SB" },
  { id: 7, name: "Bahasa dan Sastra Jawa", code: "BSJ" },
  { id: 8, name: "Matematika", code: "MTK" },
  { id: 9, name: "Bahasa Inggris", code: "BING" },
  { id: 10, name: "Informatika", code: "IF" },
  { id: 11, name: "Projek Ilmu Pengetahuan Alam dan Sosial", code: "PIPS" },
  { id: 12, name: "Dasar-Dasar Program Keahlian", code: "DDPK" },
  { id: 13, name: "Konsentrasi Keahlian", code: "KK" },
  { id: 14, name: "Projek Kreatif dan Kewirausahaan", code: "PKK" },
  { id: 15, name: "Praktik Kerja Lapangan", code: "PKL" },
];

export default function SubjectsPage() {
  const [isClient, setIsClient] = useState(false);

  const [subjects, setSubjects] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-subjects');
      return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
    }
    return DEFAULT_SUBJECTS;
  });

  useEffect(() => {
    setIsClient(true);
    const syncData = () => {
      const savedSubjects = localStorage.getItem('kurikulum-smk-subjects');
      if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
    };
    window.addEventListener('storage', syncData);
    syncData();
    return () => window.removeEventListener('storage', syncData);
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-subjects', JSON.stringify(subjects));
    }
  }, [subjects, isClient]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
  });

  const handleAddSubject = () => {
    if (isEditing) {
      setSubjects(subjects.map((subject: any) =>
        subject.id === editingId 
          ? { ...subject, ...formData } 
          : subject
      ));
    } else {
      const newSubject = {
        id: subjects.length + 1,
        ...formData,
      };
      setSubjects([...subjects, newSubject]);
    }
    resetForm();
  };

  const handleEditSubject = (subject: any) => {
    setEditingId(subject.id);
    setFormData(subject);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteSubject = (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?")) {
      setSubjects(subjects.filter((subject: any) => subject.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
    });
    setIsEditing(false);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Data Mata Pelajaran</h3>
          <p className="text-sm text-gray-500">Kelola daftar mata pelajaran SMK</p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} />
          Tambah Mata Pelajaran
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kode</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Mata Pelajaran</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {subjects.map((subject: any) => (
              <tr key={subject.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600 font-mono">{subject.code}</td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">{subject.name}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      className="p-2 hover:bg-gray-100 rounded-lg" 
                      title="Lihat Detail"
                    >
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button 
                      className="p-2 hover:bg-blue-100 rounded-lg" 
                      title="Edit"
                      onClick={() => handleEditSubject(subject)}
                    >
                      <Edit size={16} className="text-blue-600" />
                    </button>
                    <button 
                      className="p-2 hover:bg-red-100 rounded-lg" 
                      title="Hapus"
                      onClick={() => handleDeleteSubject(subject.id)}
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

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kode Mata Pelajaran</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                  placeholder="Contoh: MTK"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Contoh: Matematika"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddSubject}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                {isEditing ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
