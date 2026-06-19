"use client";

import { useState, useEffect } from "react";
import { Plus, Download, Edit, Trash2, Smile, Filter, Users, CheckCircle2 } from "lucide-react";

const DEFAULT_CLASSES = [
  { id: 1, className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", grade: "X" },
  { id: 2, className: "X TKJ 2", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", grade: "X" },
  { id: 3, className: "X TKR 1", major: "Teknik Kendaraan Ringan", majorCode: "TKR", grade: "X" },
];

const DEFAULT_GRADES = [
  { id: 1, studentName: "Andi Pratama", className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", spiritual: "A", social: "A", responsibility: "B", cleanliness: "A", final: "A" },
  { id: 2, studentName: "Budi Santoso", className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", spiritual: "B", social: "A", responsibility: "A", cleanliness: "B", final: "B" },
  { id: 3, studentName: "Siti Aminah", className: "X TKR 1", major: "Teknik Kendaraan Ringan", majorCode: "TKR", spiritual: "A", social: "A", responsibility: "A", cleanliness: "A", final: "A" },
];

export default function AttitudeGradePage() {
  const [isClient, setIsClient] = useState(false);
  
  // Filter states
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedFinal, setSelectedFinal] = useState("");
  
  // Data from localStorage
  const [classes, setClasses] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-classes');
      return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
    }
    return DEFAULT_CLASSES;
  });

  const [grades, setGrades] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-attitude-grades');
      return saved ? JSON.parse(saved) : DEFAULT_GRADES;
    }
    return DEFAULT_GRADES;
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
  
  // Save grades to localStorage
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-attitude-grades', JSON.stringify(grades));
    }
  }, [grades, isClient]);
  
  // Filter grades
  const filteredGrades = grades.filter((item: any) => {
    const gradeMatch = !selectedGrade || item.className.startsWith(selectedGrade);
    const majorMatch = !selectedMajor || item.majorCode === selectedMajor;
    const classMatch = !selectedClass || item.className === selectedClass;
    const finalMatch = !selectedFinal || item.final === selectedFinal;
    return gradeMatch && majorMatch && classMatch && finalMatch;
  });
  
  // Stats calculation
  const totalStudents = filteredGrades.length;
  const studentsWithA = filteredGrades.filter((g: any) => g.final === "A").length;
  const studentsWithB = filteredGrades.filter((g: any) => g.final === "B").length;

  const getPredicateColor = (predicate: string) => {
    switch (predicate) {
      case "A": return "bg-green-100 text-green-700";
      case "B": return "bg-blue-100 text-blue-700";
      case "C": return "bg-yellow-100 text-yellow-700";
      case "D": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Nilai Sikap</h3>
          <p className="text-sm text-gray-500">Monitoring nilai sikap semua siswa</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            <Download size={18} />
            Export
          </button>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
            <Plus size={18} />
            Tambah Nilai
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
              <h4 className="text-sm text-gray-500 mb-1">Total Siswa</h4>
              <p className="text-3xl font-bold text-gray-800">{totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <div>
              <h4 className="text-sm text-green-600 mb-1">Predikat A</h4>
              <p className="text-3xl font-bold text-green-700">{studentsWithA}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Smile size={24} className="text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm text-blue-600 mb-1">Predikat B</h4>
              <p className="text-3xl font-bold text-blue-700">{studentsWithB}</p>
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
            <label className="text-xs text-gray-500">Predikat Akhir</label>
            <select 
              value={selectedFinal}
              onChange={(e) => setSelectedFinal(e.target.value)}
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
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Spiritual</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Sosial</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Tanggung Jawab</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Kebersihan</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Sikap Akhir</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredGrades.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{item.studentName}</td>
                <td className="px-6 py-4 text-gray-600">{item.className}</td>
                <td className="px-6 py-4 text-gray-600">{item.major}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPredicateColor(item.spiritual)}`}>{item.spiritual}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPredicateColor(item.social)}`}>{item.social}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPredicateColor(item.responsibility)}`}>{item.responsibility}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPredicateColor(item.cleanliness)}`}>{item.cleanliness}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPredicateColor(item.final)}`}>{item.final}</span>
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
