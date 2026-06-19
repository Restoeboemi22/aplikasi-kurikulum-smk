"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, X } from "lucide-react";

const DEFAULT_TEACHERS = [
  {
    id: 1,
    kodeGuru: "GRU001",
    tanggalLahir: "1985-01-01",
    name: "Pak Budi Santoso",
    mataPelajaran: "Informatika",
    tingkatKelas: ["X"],
    jurusan: ["TKJ"],
    jenisKelamin: "Laki-laki",
  },
  {
    id: 2,
    kodeGuru: "GRU002",
    tanggalLahir: "1988-05-15",
    name: "Bu Siti Aminah",
    mataPelajaran: "Matematika",
    tingkatKelas: ["X", "XI"],
    jurusan: ["TKJ", "TKR"],
    jenisKelamin: "Perempuan",
  },
  {
    id: 3,
    kodeGuru: "GRU003",
    tanggalLahir: "1982-03-20",
    name: "Pak Anton Wijaya",
    mataPelajaran: "Dasar-Dasar Program Keahlian",
    tingkatKelas: ["X"],
    jurusan: ["TKR"],
    jenisKelamin: "Laki-laki",
  },
];

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

export default function TeachersPage() {
  const [teachers, setTeachers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-teachers');
      return saved ? JSON.parse(saved) : DEFAULT_TEACHERS;
    }
    return DEFAULT_TEACHERS;
  });

  const [subjects, setSubjects] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-subjects');
      return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
    }
    return DEFAULT_SUBJECTS;
  });

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const syncData = () => {
      const savedTeachers = localStorage.getItem('kurikulum-smk-teachers');
      if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
      const savedSubjects = localStorage.getItem('kurikulum-smk-subjects');
      if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
    };
    window.addEventListener('storage', syncData);
    syncData();
    return () => window.removeEventListener('storage', syncData);
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-teachers', JSON.stringify(teachers));
    }
  }, [teachers, isClient]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    kodeGuru: "",
    tanggalLahir: "",
    name: "",
    mataPelajaran: "",
    tingkatKelas: [] as string[],
    jurusan: [] as string[],
    jenisKelamin: "Laki-laki",
  });

  const subjectsList = isClient ? subjects.map((s: any) => s.name) : [];

  const handleAddTeacher = () => {
    const newTeacher = {
      id: isEditing && editingId ? editingId : teachers.length + 1,
      ...formData,
    };
    if (isEditing) {
      setTeachers(teachers.map((t: any) => t.id === editingId ? newTeacher : t));
    } else {
      setTeachers([...teachers, newTeacher]);
    }
    resetForm();
  };

  const handleEditTeacher = (teacher: any) => {
    setEditingId(teacher.id);
    setFormData(teacher);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteTeacher = (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus guru ini?")) {
      setTeachers(teachers.filter((t: any) => t.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      kodeGuru: "",
      tanggalLahir: "",
      name: "",
      mataPelajaran: "",
      tingkatKelas: [],
      jurusan: [],
      jenisKelamin: "Laki-laki",
    });
    setIsEditing(false);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const formatKeterangan = (tingkat: string[], jurusan: string[]) => {
    if (tingkat.length === 0 || jurusan.length === 0) return "-";
    const tingkatStr = tingkat.join(", ");
    const jurusanStr = jurusan.join(", ");
    return `${tingkatStr} - ${jurusanStr}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Data Guru</h3>
          <p className="text-sm text-gray-500">Kelola data guru SMK</p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} />
          Tambah Guru
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kode Guru</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal Lahir</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Guru</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas & Jurusan</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {teachers.map((teacher: any) => (
              <tr key={teacher.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-700 font-mono">{teacher.kodeGuru}</td>
                <td className="px-6 py-4 text-gray-700">{teacher.tanggalLahir}</td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">{teacher.name}</span>
                </td>
                <td className="px-6 py-4 text-gray-700">{teacher.mataPelajaran}</td>
                <td className="px-6 py-4 text-gray-700">{formatKeterangan(teacher.tingkatKelas, teacher.jurusan)}</td>
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
                      onClick={() => handleEditTeacher(teacher)}
                    >
                      <Edit size={16} className="text-blue-600" />
                    </button>
                    <button 
                      className="p-2 hover:bg-red-100 rounded-lg" 
                      title="Hapus"
                      onClick={() => handleDeleteTeacher(teacher.id)}
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

      {/* Dialog Tambah/Edit Guru */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Guru" : "Tambah Guru Baru"}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kode Guru</label>
                  <input
                    type="text"
                    value={formData.kodeGuru}
                    onChange={(e) => setFormData({ ...formData, kodeGuru: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    placeholder="Contoh: GRU001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Guru</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nama lengkap guru"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin</label>
                  <select
                    value={formData.jenisKelamin}
                    onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mata Pelajaran</label>
                  <select
                    value={formData.mataPelajaran}
                    onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjectsList.map((subj: any) => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tingkat Kelas</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["X", "XI", "XII"].map((tingkat) => (
                      <label key={tingkat} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.tingkatKelas.includes(tingkat)}
                          onChange={() => {
                            const newTingkat = formData.tingkatKelas.includes(tingkat)
                              ? formData.tingkatKelas.filter(t => t !== tingkat)
                              : [...formData.tingkatKelas, tingkat];
                            setFormData({ ...formData, tingkatKelas: newTingkat });
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{tingkat}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jurusan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["TKJ", "TKR"].map((jrs) => (
                      <label key={jrs} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.jurusan.includes(jrs)}
                          onChange={() => {
                            const newJurusan = formData.jurusan.includes(jrs)
                              ? formData.jurusan.filter(j => j !== jrs)
                              : [...formData.jurusan, jrs];
                            setFormData({ ...formData, jurusan: newJurusan });
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{jrs}</span>
                      </label>
                    ))}
                  </div>
                </div>
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
                onClick={handleAddTeacher}
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
