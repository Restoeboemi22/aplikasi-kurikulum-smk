"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, UserPlus, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";

const DEFAULT_STUDENTS = [
  {
    id: 1,
    nis: "1234567890",
    name: "Andi Pratama",
    class: "X TKJ 1",
    gender: "Laki-laki",
    birthPlace: "Jakarta",
    birthDate: "2008-01-15",
    address: "Jl. Merdeka No. 123, Jakarta",
    phone: "081234567890",
    email: "andi.pratama@email.com",
  },
  {
    id: 2,
    nis: "1234567891",
    name: "Siti Aminah",
    class: "X TKJ 1",
    gender: "Perempuan",
    birthPlace: "Bandung",
    birthDate: "2008-03-20",
    address: "Jl. Sudirman No. 45, Bandung",
    phone: "081234567891",
    email: "siti.aminah@email.com",
  },
  {
    id: 3,
    nis: "1234567892",
    name: "Budi Santoso",
    class: "X TKJ 2",
    gender: "Laki-laki",
    birthPlace: "Surabaya",
    birthDate: "2008-05-10",
    address: "Jl. Diponegoro No. 78, Surabaya",
    phone: "081234567892",
    email: "budi.santoso@email.com",
  },
];

export default function StudentsPage() {
  const [students, setStudents] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-students');
      return saved ? JSON.parse(saved) : DEFAULT_STUDENTS;
    }
    return DEFAULT_STUDENTS;
  });

  useEffect(() => {
    localStorage.setItem('kurikulum-smk-students', JSON.stringify(students));
  }, [students]);

  const handleExportTemplate = () => {
    const template = [
      {
        No: 1,
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

  const handleExportData = () => {
    const exportData = students.map((student: any, index: any) => ({
      No: index + 1,
      NISN: student.nis,
      "Nama Siswa": student.name,
      "Jenis Kelamin": student.gender,
      Kelas: student.class,
      Jurusan: student.class?.split(' ')[1] || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "data_siswa.xlsx");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      const importedStudents = jsonData.map((row: any, index: number) => ({
        id: Date.now() + index,
        nis: row["NISN"] || row["Nis"] || row["nisn"] || "",
        name: row["Nama Siswa"] || row["Nama"] || row["nama"] || "",
        class: row["Kelas"] || row["kelas"] || "",
        gender: row["Jenis Kelamin"] || row["JenisKelamin"] || row["gender"] || "Laki-laki",
        birthPlace: "",
        birthDate: "",
        address: "",
        phone: "",
        email: "",
      })).filter((student: any) => student.name && student.nis);

      if (importedStudents.length > 0) {
        setStudents((prev: any) => [...prev, ...importedStudents]);
        alert(`Berhasil mengimport ${importedStudents.length} data siswa!`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

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
              onChange={handleImportData}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <Download size={18} />
            Export XLSX
          </button>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
            <UserPlus size={18} />
            Tambah Siswa
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">NIS</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jenis Kelamin</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((student: any) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-700">{student.nis}</td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">{student.name}</span>
                </td>
                <td className="px-6 py-4 text-gray-700">{student.class}</td>
                <td className="px-6 py-4 text-gray-700">{student.gender}</td>
                <td className="px-6 py-4 text-gray-700">{student.email}</td>
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
    </div>
  );
}
