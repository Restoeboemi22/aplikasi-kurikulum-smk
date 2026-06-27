"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, X, Loader2 } from "lucide-react";

interface ClassMajor {
  id?: string;
  className: string;
  grade: string;
  majorCode: string;
  majorName?: string;
  homeroomTeacher?: string;
  homeroomTeacherId?: string | null;
  room?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Teacher {
  id: string;
  kodeGuru: string;
  name: string;
}

export default function ClassMajorPage() {
  const [classMajors, setClassMajors] = useState<ClassMajor[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    grade: "X",
    majorCode: "",
    majorName: "",
    classNumber: "1",
    homeroomTeacherId: "",
    room: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [classRes, teacherRes] = await Promise.all([
        fetch("/api/class-majors"),
        fetch("/api/teachers"),
      ]);
      if (classRes.ok) {
        const classData = await classRes.json();
        setClassMajors(classData);
        // Auto-fill first major from existing data if available
        if (classData.length > 0) {
          const firstMajor = classData[0];
          setFormData(prev => ({
            ...prev,
            majorCode: firstMajor.majorCode,
            majorName: firstMajor.majorName || firstMajor.majorCode
          }));
        }
      } else {
        const error = await classRes.json().catch(() => null);
        setErrorMessage(error?.error || "Gagal mengambil data kelas & jurusan.");
      }
      if (teacherRes.ok) {
        const teacherData = await teacherRes.json();
        setTeachers(teacherData);
      } else {
        const error = await teacherRes.json().catch(() => null);
        setErrorMessage((prev) => prev || error?.error || "Gagal mengambil data guru.");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage("Terjadi kesalahan saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClass = async () => {
    setIsSaving(true);
    try {
      const className = `${formData.grade} ${formData.majorCode} ${formData.classNumber}`;
      
      const data = {
        className,
        grade: formData.grade,
        majorCode: formData.majorCode,
        majorName: formData.majorName || formData.majorCode,
        homeroomTeacherId: formData.homeroomTeacherId || null,
        room: formData.room,
      };

      const method = isEditing ? "PUT" : "POST";
      const body = isEditing ? { ...data, id: editingId } : data;

      const res = await fetch("/api/class-majors", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchData();
        resetForm();
      } else {
        const error = await res.json().catch(() => null);
        alert(error?.error || "Gagal menyimpan data kelas dan jurusan.");
      }
    } catch (error) {
      console.error("Error saving class:", error);
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClass = (classMajor: ClassMajor) => {
    setEditingId(classMajor.id || null);
    const classParts = classMajor.className.split(" ");
    setFormData({
      grade: classMajor.grade,
      majorCode: classMajor.majorCode,
      majorName: classMajor.majorName || classMajor.majorCode,
      classNumber: classParts[2] || "1",
      homeroomTeacherId: classMajor.homeroomTeacherId || "",
      room: classMajor.room || "",
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini?")) return;

    try {
      const res = await fetch(`/api/class-majors?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
      } else {
        const error = await res.json().catch(() => null);
        alert(error?.error || "Gagal menghapus data kelas dan jurusan.");
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Terjadi kesalahan saat menghapus data");
    }
  };

  const resetForm = () => {
    setFormData({
      grade: "X",
      majorCode: classMajors.length > 0 ? classMajors[0].majorCode : "",
      majorName: classMajors.length > 0 ? classMajors[0].majorName || classMajors[0].majorCode : "",
      classNumber: "1",
      homeroomTeacherId: "",
      room: "",
    });
    setIsEditing(false);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  // Dapatkan daftar jurusan unik dari classMajors
  const uniqueMajors = Array.from(
    new Map(
      classMajors.map(item => [item.majorCode, { code: item.majorCode, name: item.majorName || item.majorCode }])
    ).values()
  );

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

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jurusan</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tingkat</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Wali Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Ruang</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  <Loader2 size={20} className="animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            ) : classMajors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  Belum ada data kelas. Klik "Tambah Kelas" untuk menambahkan.
                </td>
              </tr>
            ) : (
              classMajors.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">{cls.className}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{cls.majorName}</td>
                  <td className="px-6 py-4 text-gray-700">{cls.grade}</td>
                  <td className="px-6 py-4 text-gray-700">{cls.homeroomTeacher || "-"}</td>
                  <td className="px-6 py-4 text-gray-700">{cls.room || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg" title="Lihat Detail">
                        <Eye size={16} className="text-gray-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-blue-100 rounded-lg" 
                        title="Edit"
                        onClick={() => handleEditClass(cls)}
                      >
                        <Edit size={16} className="text-blue-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-red-100 rounded-lg" 
                        title="Hapus"
                        onClick={() => cls.id && handleDeleteClass(cls.id)}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog Tambah Kelas */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Kelas" : "Tambah Kelas Baru"}
              </h3>
              <button
                onClick={resetForm}
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
                {/* Pilih jurusan dari daftar yang sudah ada
                 * Atau masukkan jurusan baru! */}
                <div className="space-y-3">
                  {uniqueMajors.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Pilih jurusan yang sudah ada:</label>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {Array.from(uniqueMajors).map((major) => (
                          <button
                            key={major.code}
                            onClick={() => setFormData({
                              ...formData,
                              majorCode: major.code,
                              majorName: major.name
                            })}
                            className={`py-2 px-3 rounded-lg border-2 font-medium transition-all text-sm ${
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
                      <div className="border-t border-gray-200 pt-3">
                        <label className="text-xs text-gray-500 mb-1 block">Atau masukkan jurusan baru:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">Kode Jurusan</label>
                            <input
                              type="text"
                              value={formData.majorCode}
                              onChange={(e) => setFormData({ ...formData, majorCode: e.target.value.toUpperCase() })}
                              placeholder="misal: TBSM"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">Nama Jurusan</label>
                            <input
                              type="text"
                              value={formData.majorName}
                              onChange={(e) => setFormData({ ...formData, majorName: e.target.value })}
                              placeholder="misal: Teknik Bisnis Sepeda Motor"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {uniqueMajors.length === 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Kode Jurusan</label>
                        <input
                          type="text"
                          value={formData.majorCode}
                          onChange={(e) => setFormData({ ...formData, majorCode: e.target.value.toUpperCase() })}
                          placeholder="misal: TKJ"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Nama Jurusan</label>
                        <input
                          type="text"
                          value={formData.majorName}
                          onChange={(e) => setFormData({ ...formData, majorName: e.target.value })}
                          placeholder="misal: Teknik Komputer dan Jaringan"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  )}
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
                  value={formData.homeroomTeacherId}
                  onChange={(e) => setFormData({ ...formData, homeroomTeacherId: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Pilih Wali Kelas</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
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
                onClick={resetForm}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveClass}
                disabled={isSaving || !formData.majorCode || !formData.classNumber}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
              >
                {isSaving && <Loader2 size={16} className="animate-spin inline mr-2" />}
                {isEditing ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
