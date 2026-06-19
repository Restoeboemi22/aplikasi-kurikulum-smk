"use client";

import { useState, useEffect } from "react";
import { Plus, Download, Edit, Trash2, FileSpreadsheet, Filter, Users, CheckCircle2, Award } from "lucide-react";

const DEFAULT_CLASSES = [
  { id: 1, className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", grade: "X" },
  { id: 2, className: "X TKJ 2", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", grade: "X" },
  { id: 3, className: "X TKR 1", major: "Teknik Kendaraan Ringan", majorCode: "TKR", grade: "X" },
];

const DEFAULT_REPORTS = [
  { id: 1, studentName: "Andi Pratama", className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", semester: "Ganjil", academicYear: "2023/2024", average: 88, predicate: "A", status: "Selesai" },
  { id: 2, studentName: "Budi Santoso", className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", semester: "Ganjil", academicYear: "2023/2024", average: 72, predicate: "C", status: "Selesai" },
  { id: 3, studentName: "Siti Aminah", className: "X TKR 1", major: "Teknik Kendaraan Ringan", majorCode: "TKR", semester: "Ganjil", academicYear: "2023/2024", average: 93, predicate: "A", status: "Selesai" },
];

export default function ReportCardPage() {
  const [isClient, setIsClient] = useState(false);
  
  // Filter states
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedPredicate, setSelectedPredicate] = useState("");
  
  // Data from localStorage
  const [classes, setClasses] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-classes');
      return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
    }
    return DEFAULT_CLASSES;
  });

  const [reports, setReports] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-reports');
      return saved ? JSON.parse(saved) : DEFAULT_REPORTS;
    }
    return DEFAULT_REPORTS;
  });
  
  // Sync data
  useEffect(() => {
    setIsClient(true);
    const syncData = () => {
      const savedClasses = localStorage.getItem('kurikulum-smk-classes');
      if (savedClasses) setClasses(JSON.parse(savedClasses));
    };
    window.addEventListener('storage', syncData);
    syncData();
    return () => window.removeEventListener('storage', syncData);
  }, []);
  
  // Save reports to localStorage
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-reports', JSON.stringify(reports));
    }
  }, [reports, isClient]);
  
  // Filter reports
  const filteredReports = reports.filter((item: any) => {
    const gradeMatch = !selectedGrade || item.className.startsWith(selectedGrade);
    const majorMatch = !selectedMajor || item.majorCode === selectedMajor;
    const classMatch = !selectedClass || item.className === selectedClass;
    const semesterMatch = !selectedSemester || item.semester === selectedSemester;
    const academicYearMatch = !selectedAcademicYear || item.academicYear === selectedAcademicYear;
    const predicateMatch = !selectedPredicate || item.predicate === selectedPredicate;
    return gradeMatch && majorMatch && classMatch && semesterMatch && academicYearMatch && predicateMatch;
  });
  
  // Stats calculation
  const totalReports = filteredReports.length;
  const completedReports = filteredReports.filter((r: any) => r.status === "Selesai").length;
  const studentsWithA = filteredReports.filter((r: any) => r.predicate === "A").length;

  const getPredicateColor = (predicate: string) => {
    switch (predicate) {
      case "A": return "bg-green-100 text-green-700";
      case "B": return "bg-blue-100 text-blue-700";
      case "C": return "bg-yellow-100 text-yellow-700";
      case "D": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Selesai": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Selesai": return <CheckCircle2 size={16} />;
      default: return <Award size={16} />;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Nilai Raport</h3>
          <p className="text-sm text-gray-500">Monitoring raport semua siswa</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            <Download size={18} />
            Export
          </button>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
            <Plus size={18} />
            Tambah Raport
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users size={24} className="text-purple-600" />
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Total Raport</h4>
              <p className="text-3xl font-bold text-gray-800">{totalReports}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <div>
              <h4 className="text-sm text-green-600 mb-1">Selesai</h4>
              <p className="text-3xl font-bold text-green-700">{completedReports}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Award size={24} className="text-yellow-600" />
            </div>
            <div>
              <h4 className="text-sm text-yellow-600 mb-1">Predikat A</h4>
              <p className="text-3xl font-bold text-yellow-700">{studentsWithA}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Tingkat</label>
            <select 
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Tingkat</option>
              <option value="X">X</option>
              <option value="XI">XI</option>
              <option value="XII">XII</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Jurusan</label>
            <select 
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Jurusan</option>
              <option value="TKJ">TKJ</option>
              <option value="TKR">TKR</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Kelas</label>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Kelas</option>
              {isClient && classes.map((cls: any) => (
                <option key={cls.id} value={cls.className}>{cls.className}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Semester</label>
            <select 
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Semester</option>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Predikat</label>
            <select 
              value={selectedPredicate}
              onChange={(e) => setSelectedPredicate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Predikat</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Siswa</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jurusan</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Semester</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tahun Ajaran</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Rata-rata</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Predikat</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredReports.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{item.studentName}</td>
                <td className="px-6 py-4 text-gray-600">{item.className}</td>
                <td className="px-6 py-4 text-gray-600">{item.major}</td>
                <td className="px-6 py-4 text-gray-600">{item.semester}</td>
                <td className="px-6 py-4 text-gray-800 font-medium">{item.academicYear}</td>
                <td className="px-6 py-4 text-center text-gray-600 font-bold">{item.average}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPredicateColor(item.predicate)}`}>{item.predicate}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
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
