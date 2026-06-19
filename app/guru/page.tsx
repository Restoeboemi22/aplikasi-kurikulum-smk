"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, X, Loader2, AlertCircle } from "lucide-react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { getDbSafe, isFirebaseConfigured } from "@/lib/firebase";

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

// Koleksi Firestore untuk data guru (terpisah dari koleksi "users" yang
// menyimpan akun login). Doc id digenerate otomatis oleh Firestore (string).
const TEACHERS_COLLECTION = "teachers_data";

interface Teacher {
  id: string;
  kodeGuru: string;
  tanggalLahir: string;
  name: string;
  mataPelajaran: string;
  tingkatKelas: string[];
  jurusan: string[];
  jenisKelamin: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Subjects masih dari localStorage (modul Mata Pelajaran belum dimigrasikan).
  const [subjects, setSubjects] = useState<any[]>(DEFAULT_SUBJECTS);

  // Realtime sync data guru dari Firestore.
  useEffect(() => {
    setIsClient(true);

    // Muat subjects dari localStorage (untuk dropdown).
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kurikulum-smk-subjects");
      if (saved) {
        try {
          setSubjects(JSON.parse(saved));
        } catch {
          /* abaikan */
        }
      }
    }

    if (!isFirebaseConfigured) {
      setError("Firebase belum dikonfigurasi.");
      setLoading(false);
      return;
    }

    const q = query(collection(getDbSafe(), TEACHERS_COLLECTION), orderBy("kodeGuru"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Teacher[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Teacher, "id">),
        }));
        setTeachers(rows);
        setLoading(false);
      },
      () => {
        setError("Gagal memuat data guru. Periksa koneksi atau izin akses.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const handleAddTeacher = async () => {
    if (!formData.name.trim() || !formData.kodeGuru.trim()) {
      setError("Kode Guru dan Nama wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const db = getDbSafe();
      if (isEditing && editingId) {
        await updateDoc(doc(db, TEACHERS_COLLECTION, editingId), { ...formData });
      } else {
        await addDoc(collection(db, TEACHERS_COLLECTION), { ...formData });
      }
      resetForm();
      // Tidak perlu setTeachers manual — onSnapshot otomatis memperbarui.
    } catch {
      setError("Gagal menyimpan data. Pastikan Anda admin & koneksi stabil.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setFormData({
      kodeGuru: teacher.kodeGuru ?? "",
      tanggalLahir: teacher.tanggalLahir ?? "",
      name: teacher.name ?? "",
      mataPelajaran: teacher.mataPelajaran ?? "",
      tingkatKelas: teacher.tingkatKelas ?? [],
      jurusan: teacher.jurusan ?? [],
      jenisKelamin: teacher.jenisKelamin ?? "Laki-laki",
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus guru ini?")) return;
    try {
      await deleteDoc(doc(getDbSafe(), TEACHERS_COLLECTION, id));
    } catch {
      setError("Gagal menghapus data.");
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
    if (!tingkat?.length || !jurusan?.length) return "-";
    return `${tingkat.join(", ")} - ${jurusan.join(", ")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Data Guru</h3>
          <p className="text-sm text-gray-500">Kelola data guru SMK — tersimpan online (realtime)</p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} />
          Tambah Guru
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

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
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  <Loader2 size={20} className="animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  Belum ada data guru. Klik "Tambah Guru" untuk menambahkan.
                </td>
              </tr>
            ) : (
              teachers.map((teacher: Teacher) => (
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
              ))
            )}
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
                              ? formData.tingkatKelas.filter((t) => t !== tingkat)
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
                              ? formData.jurusan.filter((j) => j !== jrs)
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
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
