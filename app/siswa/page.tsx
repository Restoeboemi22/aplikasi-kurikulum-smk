"use client";

import { useState, useEffect, useRef } from "react";
import { Edit, Trash2, Eye, UserPlus, Download, Upload, X, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface Student {
  id?: string;
  nis: string;
  nisn?: string;
  name: string;
  gender: string;
  className?: string;
  birthPlace?: string;
  birthDate?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface ClassMajor {
  id?: string;
  className: string;
  grade: string;
  majorCode: string;
  majorName?: string;
  homeroomTeacher?: string;
  room?: string;
}

interface ImportProgressState {
  active: boolean;
  total: number;
  processed: number;
  success: number;
  failed: number;
  currentName: string;
  message: string;
  failedReasons: string[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [classMajors, setClassMajors] = useState<ClassMajor[]>([]);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    active: false,
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    currentName: "",
    message: "",
    failedReasons: [],
  });
  const [formData, setFormData] = useState<Student>({
    nis: "",
    nisn: "",
    name: "",
    gender: "Laki-laki",
    className: "",
    birthPlace: "",
    birthDate: "",
    address: "",
    phone: "",
    email: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeDigits = (value: string) => value.replace(/\D/g, "");
  const normalizeCellText = (value: unknown) => String(value ?? "").trim();

  // Fetch students on mount
  useEffect(() => {
    fetchData();
  }, []);

  const classOptions = Array.from(
    new Map(
      classMajors
        .filter((item) => item.className)
        .map((item) => [item.className, item])
    ).values()
  );

  // Filter students when selected class changes
  useEffect(() => {
    if (selectedClassName) {
      setFilteredStudents(
        students.filter((student) => (student.className || "") === selectedClassName)
      );
    } else {
      setFilteredStudents(students);
    }
  }, [students, selectedClassName]);

  useEffect(() => {
    const visibleIds = new Set(filteredStudents.map((student) => student.id).filter(Boolean) as string[]);
    setSelectedStudentIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredStudents]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studentRes, classRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/class-majors"),
      ]);
      if (studentRes.ok) {
        const data = await studentRes.json();
        setStudents(data);
        setFilteredStudents(data);
      }
      if (classRes.ok) {
        const classData = await classRes.json();
        setClassMajors(classData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStudent = async () => {
    const normalizedNisn = normalizeDigits(formData.nisn || "");

    if (!formData.nis || !formData.name) {
      alert("NIS dan nama wajib diisi!");
      return;
    }

    setIsSaving(true);
    try {
      const method = isEditing ? "PUT" : "POST";
      const payload = { ...formData, nisn: normalizedNisn };
      const body = isEditing ? { id: editingId, ...payload } : payload;
      
      const res = await fetch("/api/students", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchData();
        resetForm();
      } else {
        const error = await res.json();
        alert(error.error || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error saving student:", error);
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingId(student.id || null);
    setFormData({ ...student, nisn: student.nisn || "" });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailOpen(true);
  };

  const deleteStudents = async (ids: string[]) => {
    if (ids.length === 0) return false;

    setIsDeleting(true);
    try {
      const params = new URLSearchParams();
      ids.forEach((id) => params.append("id", id));

      const res = await fetch(`/api/students?${params.toString()}`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
        setSelectedStudentIds([]);
        return true;
      } else {
        const error = await res.json();
        alert(error.error || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Terjadi kesalahan saat menghapus data");
    } finally {
      setIsDeleting(false);
    }

    return false;
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus siswa ini?")) return;
    await deleteStudents([id]);
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) {
      alert("Pilih minimal satu siswa yang ingin dihapus.");
      return;
    }

    const confirmed = confirm(
      `Apakah Anda yakin ingin menghapus ${selectedStudentIds.length} siswa terpilih?`
    );
    if (!confirmed) return;

    await deleteStudents(selectedStudentIds);
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredStudents.map((student) => student.id).filter(Boolean) as string[];
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.includes(id));

    setSelectedStudentIds(allSelected ? [] : visibleIds);
  };

  const resetForm = () => {
    setFormData({
      nis: "",
      nisn: "",
      name: "",
      gender: "Laki-laki",
      className: "",
      birthPlace: "",
      birthDate: "",
      address: "",
      phone: "",
      email: "",
    });
    setIsEditing(false);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const closeDetail = () => {
    setSelectedStudent(null);
    setIsDetailOpen(false);
  };

  const handleExportTemplate = () => {
    const template = [
      {
        No: 1,
        NIS: "",
        NISN: "",
        "Nama Siswa": "",
        "Jenis Kelamin": "Laki-laki/Perempuan",
        Kelas: "",
        Jurusan: "",
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
    XLSX.writeFile(wb, "template_siswa.xlsx");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportProgress({
      active: true,
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      currentName: "",
      message: `Membaca file ${file.name}...`,
      failedReasons: [],
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const importedStudents = jsonData.map((row: any) => ({
          nis: normalizeCellText(row["NIS"] || row["Nis"] || row["nis"]),
          nisn: normalizeDigits(
            normalizeCellText(row["NISN"] || row["Nisn"] || row["nisn"])
          ),
          name: normalizeCellText(row["Nama Siswa"] || row["Nama"] || row["nama"]),
          className: (() => {
            const directClassName = normalizeCellText(
              row["Kelas"] || row["kelas"] || row["Class"] || row["className"]
            );
            const jurusan = normalizeCellText(
              row["Jurusan"] || row["jurusan"] || row["Major"] || row["major"]
            );

            if (!directClassName) return "";
            if (jurusan && !directClassName.includes(jurusan)) {
              return `${directClassName} ${jurusan}`.trim();
            }
            return directClassName;
          })(),
          gender:
            normalizeCellText(
              row["Jenis Kelamin"] || row["JenisKelamin"] || row["gender"]
            ) || "Laki-laki",
          birthPlace: normalizeCellText(
            row["Tempat Lahir"] || row["tempatLahir"] || row["Birth Place"]
          ),
          birthDate: normalizeCellText(
            row["Tanggal Lahir"] || row["tanggalLahir"] || row["Birth Date"]
          ),
          address: normalizeCellText(
            row["Alamat"] || row["alamat"] || row["Address"]
          ),
          phone: normalizeCellText(
            row["No HP"] || row["No. HP"] || row["Telepon"] || row["phone"]
          ),
          email: normalizeCellText(row["Email"] || row["email"]),
        })).filter((student: any) => student.name && student.nis);

        if (importedStudents.length > 0) {
          let successCount = 0;
          let failedCount = 0;
          const failedReasons: string[] = [];

          setImportProgress((current) => ({
            ...current,
            total: importedStudents.length,
            message: `Mulai import ${importedStudents.length} siswa...`,
          }));

          for (const [index, student] of importedStudents.entries()) {
            setImportProgress((current) => ({
              ...current,
              processed: index,
              success: successCount,
              failed: failedCount,
              currentName: student.name || student.nis,
              message: `Mengimport data siswa ${index + 1} dari ${importedStudents.length}...`,
            }));

            try {
              const res = await fetch("/api/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(student),
              });
              if (res.ok) {
                successCount++;
              } else {
                failedCount++;
                const error = await res.json().catch(() => null);
                failedReasons.push(
                  `${student.name || student.nis}: ${error?.error || "Gagal menyimpan data siswa."}`
                );
              }
            } catch (error) {
              console.error("Error importing student:", error);
              failedCount++;
              failedReasons.push(
                `${student.name || student.nis}: Terjadi kesalahan jaringan saat import.`
              );
            }

            setImportProgress((current) => ({
              ...current,
              processed: index + 1,
              success: successCount,
              failed: failedCount,
              failedReasons: [...failedReasons],
            }));
          }

          await fetchData();
          setImportProgress({
            active: false,
            total: importedStudents.length,
            processed: importedStudents.length,
            success: successCount,
            failed: failedCount,
            currentName: "",
            message:
              failedCount > 0
                ? `Import selesai. Berhasil ${successCount} siswa, gagal ${failedCount} siswa.`
                : `Import selesai. Berhasil ${successCount} siswa.`,
            failedReasons,
          });
        } else {
          setImportProgress({
            active: false,
            total: 0,
            processed: 0,
            success: 0,
            failed: 0,
            currentName: "",
            message: "Tidak ada data valid yang bisa diimport. Pastikan NIS dan nama terisi.",
            failedReasons: [],
          });
        }
      } catch (error) {
        console.error("Error reading import file:", error);
        setImportProgress({
          active: false,
          total: 0,
          processed: 0,
          success: 0,
          failed: 0,
          currentName: "",
          message: "Terjadi kesalahan saat membaca file XLSX.",
          failedReasons: [],
        });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const visibleStudentIds = filteredStudents.map((student) => student.id).filter(Boolean) as string[];
  const allVisibleSelected =
    visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedStudentIds.includes(id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Data Siswa</h3>
          <p className="text-sm text-gray-500">Kelola data siswa SMK</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportTemplate}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            <Download size={18} />
            Download Template
          </button>
          <label className="flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-200 transition cursor-pointer">
            <Upload size={18} />
            Import XLSX
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleImportData}
              className="hidden"
            />
          </label>
          <button
            onClick={handleBulkDelete}
            disabled={selectedStudentIds.length === 0 || isDeleting}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Hapus Terpilih
          </button>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <UserPlus size={18} />
            Tambah Siswa
          </button>
        </div>
      </div>

      {(importProgress.active || importProgress.message) && (
        <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-800">Status Import Siswa</h4>
              <p className="text-sm text-gray-600">{importProgress.message}</p>
              {importProgress.currentName && (
                <p className="text-xs text-gray-500 mt-1">
                  Sedang diproses: {importProgress.currentName}
                </p>
              )}
            </div>
            {importProgress.active && <Loader2 size={18} className="mt-0.5 animate-spin text-primary-600" />}
          </div>

          {importProgress.total > 0 && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((importProgress.processed / importProgress.total) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <span>Diproses: {importProgress.processed}/{importProgress.total}</span>
                <span>Berhasil: {importProgress.success}</span>
                <span>Gagal: {importProgress.failed}</span>
              </div>
            </>
          )}

          {!importProgress.active && importProgress.failedReasons.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700 mb-2">Contoh data yang gagal:</p>
              <div className="space-y-1 text-xs text-red-600">
                {importProgress.failedReasons.slice(0, 5).map((reason, index) => (
                  <div key={`${reason}-${index}`}>{reason}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
            Jumlah Siswa Aktif
          </p>
          <p className="mt-2 text-3xl font-bold text-primary-900">{students.length}</p>
          <p className="mt-1 text-sm text-primary-700">
            Total siswa yang sudah tersimpan di database.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Data Tampil
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{filteredStudents.length}</p>
          <p className="mt-1 text-sm text-gray-500">
            Jumlah siswa yang sedang tampil sesuai filter.
          </p>
        </div>

        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Import Terakhir
          </p>
          <p className="mt-2 text-3xl font-bold text-green-900">{importProgress.success}</p>
          <p className="mt-1 text-sm text-green-700">
            Jumlah siswa yang berhasil diproses pada import terakhir.
          </p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">Nama Kelas</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400 outline-none"
            value={selectedClassName}
            onChange={(e) => setSelectedClassName(e.target.value)}
          >
            <option value="">Semua Kelas</option>
            {classOptions.map((cls) => (
              <option key={cls.id || cls.className} value={cls.className}>
                {cls.className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedStudentIds.length > 0 && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
          {selectedStudentIds.length} siswa dipilih untuk dihapus.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Pilih semua siswa yang tampil"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">NIS</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">NISN</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jenis Kelamin</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                  <Loader2 size={20} className="animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                  Belum ada data siswa. Klik "Tambah Siswa" untuk menambahkan.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={student.id ? selectedStudentIds.includes(student.id) : false}
                      onChange={() => student.id && toggleStudentSelection(student.id)}
                      aria-label={`Pilih siswa ${student.name}`}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-gray-700">{student.nis}</td>
                  <td className="px-6 py-4 text-gray-700">{student.nisn || "-"}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">{student.name}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{student.className}</td>
                  <td className="px-6 py-4 text-gray-700">{student.gender}</td>
                  <td className="px-6 py-4 text-gray-700">{student.email}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Lihat Detail"
                        onClick={() => handleViewStudent(student)}
                      >
                        <Eye size={16} className="text-gray-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-blue-100 rounded-lg" 
                        title="Edit"
                        onClick={() => handleEditStudent(student)}
                      >
                        <Edit size={16} className="text-blue-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-red-100 rounded-lg" 
                        title="Hapus"
                        onClick={() => student.id && handleDeleteStudent(student.id)}
                        disabled={isDeleting}
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

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Siswa" : "Tambah Siswa Baru"}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NIS</label>
                <input
                  type="text"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nomor Induk Siswa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NISN</label>
                <input
                  type="text"
                  value={formData.nisn || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, nisn: normalizeDigits(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="NISN"
                  inputMode="numeric"
                />
                <p className="mt-1 text-xs text-gray-500">Opsional, bisa dikosongkan bila belum ada.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Siswa</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nama lengkap siswa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kelas</label>
                <select
                  value={formData.className || ""}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classMajors.map((cls) => (
                    <option key={cls.id} value={cls.className}>
                      {cls.className}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tempat Lahir</label>
                <input
                  type="text"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Tempat lahir"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                  placeholder="Alamat lengkap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Telepon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nomor telepon"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveStudent}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDetailOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Detail Siswa</h3>
                <p className="text-sm text-gray-500">Informasi identitas siswa untuk raport dan DKN</p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">NIS</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{selectedStudent.nis}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">NISN</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{selectedStudent.nisn || "-"}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">Nama</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{selectedStudent.name}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">Kelas</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{selectedStudent.className || "-"}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">Jenis Kelamin</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{selectedStudent.gender || "-"}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">Tempat, Tanggal Lahir</td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {selectedStudent.birthPlace || "-"}{selectedStudent.birthDate ? `, ${selectedStudent.birthDate}` : ""}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">Alamat</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{selectedStudent.address || "-"}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600">Kontak</td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {selectedStudent.phone || "-"}{selectedStudent.email ? ` / ${selectedStudent.email}` : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={closeDetail}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
