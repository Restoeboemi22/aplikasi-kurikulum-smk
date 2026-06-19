"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, X } from "lucide-react";

const DEFAULT_CLASSES = [
  {
    id: 1,
    className: "X TKJ 1",
    major: "Teknik Komputer dan Jaringan",
    majorCode: "TKJ",
    grade: "X",
    homeroomTeacher: "Pak Budi Santoso",
    studentCount: 32,
    room: "Lab Komputer 1",
  },
  {
    id: 2,
    className: "X TKJ 2",
    major: "Teknik Komputer dan Jaringan",
    majorCode: "TKJ",
    grade: "X",
    homeroomTeacher: "Bu Siti Aminah",
    studentCount: 30,
    room: "Lab Komputer 2",
  },
  {
    id: 3,
    className: "X TKR 1",
    major: "Teknik Kendaraan Ringan",
    majorCode: "TKR",
    grade: "X",
    homeroomTeacher: "Pak Anton Wijaya",
    studentCount: 28,
    room: "Bengkel TKR",
  },
];

const DEFAULT_TEACHERS = [
  {
    id: 1,
    tanggalLahir: "1985-01-01",
    name: "Pak Budi Santoso",
    mataPelajaran: "Informatika",
    tingkatKelas: ["X"],
    jurusan: ["TKJ"],
    jenisKelamin: "Laki-laki",
  },
  {
    id: 2,
    tanggalLahir: "1988-05-15",
    name: "Bu Siti Aminah",
    mataPelajaran: "Matematika",
    tingkatKelas: ["X", "XI"],
    jurusan: ["TKJ", "TKR"],
    jenisKelamin: "Perempuan",
  },
  {
    id: 3,
    tanggalLahir: "1982-03-20",
    name: "Pak Anton Wijaya",
    mataPelajaran: "Dasar-Dasar Program Keahlian",
    tingkatKelas: ["X"],
    jurusan: ["TKR"],
    jenisKelamin: "Laki-laki",
  },
];

export default function ClassMajorPage() {
  const [isClient, setIsClient] = useState(false);

  // Load from localStorage on mount
  const [classes, setClasses] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-classes');
      return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
    }
    return DEFAULT_CLASSES;
  });

  const [teachers, setTeachers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-teachers');
      return saved ? JSON.parse(saved) : DEFAULT_TEACHERS;
    }
    return DEFAULT_TEACHERS;
  });

  useEffect(() => {
    setIsClient(true);
    const syncData = () => {
      const savedClasses = localStorage.getItem('kurikulum-smk-classes');
      if (savedClasses) setClasses(JSON.parse(savedClasses));
      const savedTeachers = localStorage.getItem('kurikulum-smk-teachers');
      if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
    };
    window.addEventListener('storage', syncData);
    syncData();
    return () => window.removeEventListener('storage', syncData);
  }, []);

  // Save to localStorage whenever classes change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-classes', JSON.stringify(classes));
    }
  }, [classes, isClient]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    grade: "X",
    majorCode: "TKJ",
    classNumber: "1",
    homeroomTeacher: "",
    room: "",
  });

  const majors = [
    { code: "TKJ", name: "Teknik Komputer dan Jaringan" },
    { code: "TKR", name: "Teknik Kendaraan Ringan" },
  ];

  const handleAddClass = (e: any) => {
    e?.preventDefault();
    const majorName = majors.find((m) => m.code === formData.majorCode)?.name || "";
    const newClass = {
      id: classes.length + 1,
      className: `${formData.grade} ${formData.majorCode} ${formData.classNumber}`,
      major: majorName,
      majorCode: formData.majorCode,
      grade: formData.grade,
      homeroomTeacher: formData.homeroomTeacher,
      studentCount: 0,
      room: formData.room,
    };
    console.log("Adding class:", newClass);
    setClasses((prevClasses: any) => {
      const updated = [...prevClasses, newClass];
      console.log("Updated classes:", updated);
      return updated;
    });
    setIsDialogOpen(false);
    setFormData({
      grade: "X",
      majorCode: "TKJ",
      classNumber: "1",
      homeroomTeacher: "",
      room: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Kelas & Jurusan</h3>
          <p className="text-sm text-gray-500">Kelola data kelas dan jurusan SMK</p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} />
          Tambah Kelas
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jurusan</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tingkat</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Wali Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jumlah Siswa</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Ruang</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {classes.map((cls: any) => (
              <tr key={cls.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">{cls.className}</span>
                </td>
                <td className="px-6 py-4 text-gray-700">{cls.major}</td>
                <td className="px-6 py-4 text-gray-700">{cls.grade}</td>
                <td className="px-6 py-4 text-gray-700">{cls.homeroomTeacher}</td>
                <td className="px-6 py-4 text-gray-700">{cls.studentCount} siswa</td>
                <td className="px-6 py-4 text-gray-700">{cls.room}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="Lihat Detail">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-blue-100 rounded-lg" title="Edit">
                      <Edit size={16} className="text-blue-600" />
                    </button>
                    <button className="p-2 hover:bg-red-100 rounded-lg" title="Hapus">
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog Tambah Kelas */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Tambah Kelas Baru</h3>
              <button
                onClick={() => setIsDialogOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tingkat Kelas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tingkat Kelas
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {["X", "XI", "XII"].map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setFormData({ ...formData, grade })}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.grade === grade
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jurusan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jurusan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {majors.map((major) => (
                    <button
                      key={major.code}
                      onClick={() => setFormData({ ...formData, majorCode: major.code })}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.majorCode === major.code
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {major.code}
                      <div className="text-xs font-normal text-gray-500">{major.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nomor Kelas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Kelas
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.classNumber}
                  onChange={(e) => setFormData({ ...formData, classNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Wali Kelas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wali Kelas (Opsional)
                </label>
                <select
                  value={formData.homeroomTeacher}
                  onChange={(e) => setFormData({ ...formData, homeroomTeacher: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Pilih Wali Kelas</option>
                  {teachers.map((teacher: any) => (
                    <option key={teacher.id} value={teacher.name}>{teacher.name}</option>
                  ))}
                </select>
              </div>

              {/* Ruang */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ruang Kelas (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nama ruang kelas"
                />
              </div>

              {/* Preview Nama Kelas */}
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Nama Kelas akan menjadi:</span>
                <p className="text-lg font-bold text-gray-800">
                  {formData.grade} {formData.majorCode} {formData.classNumber}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddClass}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
