"use client";

import { useState, useEffect } from "react";
import { Plus, Download, Edit, Trash2, Eye, CheckCircle2, Clock, Filter, Calendar, Users, BookOpen } from "lucide-react";

// Default data
const DEFAULT_TEACHERS = [
  { id: 1, name: "Pak Budi Santoso", mataPelajaran: "Informatika" },
  { id: 2, name: "Bu Siti Aminah", mataPelajaran: "Matematika" },
  { id: 3, name: "Pak Anton Wijaya", mataPelajaran: "Dasar-Dasar Program Keahlian" },
];

const DEFAULT_CLASSES = [
  { id: 1, className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", grade: "X" },
  { id: 2, className: "X TKJ 2", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", grade: "X" },
  { id: 3, className: "X TKR 1", major: "Teknik Kendaraan Ringan", majorCode: "TKR", grade: "X" },
];

const DEFAULT_SUBJECTS = [
  { id: 1, name: "Pendidikan Agama dan Budi Pekerti", code: "PABP" },
  { id: 2, name: "Pendidikan Pancasila", code: "PPKn" },
  { id: 3, name: "Bahasa Indonesia", code: "BIN" },
  { id: 4, name: "Matematika", code: "MTK" },
  { id: 5, name: "Informatika", code: "IF" },
];

const DEFAULT_EXAMS = [
  { id: 1, date: "12 Juni 2024", className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", subject: "Informatika", teacher: "Pak Budi Santoso", topic: "Variabel dan Tipe Data", status: "Sudah", totalStudents: 32, gradedStudents: 32, submittedDate: "12 Juni 2024" },
  { id: 2, date: "13 Juni 2024", className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", subject: "Matematika", teacher: "Bu Siti Aminah", topic: "SQL Query Dasar", status: "Sudah", totalStudents: 32, gradedStudents: 25, submittedDate: "13 Juni 2024" },
  { id: 3, date: "14 Juni 2024", className: "X TKR 1", major: "Teknik Kendaraan Ringan", majorCode: "TKR", subject: "Dasar-Dasar Program Keahlian", teacher: "Pak Anton Wijaya", topic: "Proyeksi Orto", status: "Belum", totalStudents: 28, gradedStudents: 0, submittedDate: "" },
];

export default function DailyExamPage() {
  const [isClient, setIsClient] = useState(false);
  
  // Filter states
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  
  // Data from localStorage
  const [teachers, setTeachers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-teachers');
      return saved ? JSON.parse(saved) : DEFAULT_TEACHERS;
    }
    return DEFAULT_TEACHERS;
  });

  const [classes, setClasses] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-classes');
      return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
    }
    return DEFAULT_CLASSES;
  });

  const [subjects, setSubjects] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-subjects');
      return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
    }
    return DEFAULT_SUBJECTS;
  });

  const [exams, setExams] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-daily-exams');
      return saved ? JSON.parse(saved) : DEFAULT_EXAMS;
    }
    return DEFAULT_EXAMS;
  });

  // Sync data
  useEffect(() => {
    setIsClient(true);
    
    const updateData = () => {
      const savedTeachers = localStorage.getItem('kurikulum-smk-teachers');
      if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
      
      const savedClasses = localStorage.getItem('kurikulum-smk-classes');
      if (savedClasses) setClasses(JSON.parse(savedClasses));
      
      const savedSubjects = localStorage.getItem('kurikulum-smk-subjects');
      if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
    };
    
    window.addEventListener('storage', updateData);
    updateData();
    return () => window.removeEventListener('storage', updateData);
  }, []);

  // Save exams to localStorage whenever it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-daily-exams', JSON.stringify(exams));
    }
  }, [exams, isClient]);

  // Get filtered exams
  const filteredExams = exams.filter((item: any) => {
    const teacherMatch = !selectedTeacher || item.teacher === selectedTeacher;
    const gradeMatch = !selectedGrade || item.className.startsWith(selectedGrade);
    const majorMatch = !selectedMajor || item.majorCode === selectedMajor;
    const subjectMatch = !selectedSubject || item.subject === selectedSubject;
    const statusMatch = !selectedStatus || item.status === selectedStatus;
    return teacherMatch && gradeMatch && majorMatch && subjectMatch && statusMatch;
  });

  // Stats calculation
  const totalExams = filteredExams.length;
  const completedExams = filteredExams.filter((e: any) => e.status === "Sudah").length;
  const pendingExams = filteredExams.filter((e: any) => e.status === "Belum").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Sudah": return "bg-green-100 text-green-700";
      case "Belum": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Sudah": return <CheckCircle2 size={16} />;
      case "Belum": return <Clock size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Monitoring Nilai UH (Ulangan Harian)</h3>
          <p className="text-sm text-gray-500">Monitor progress pengumpulan nilai UH oleh semua guru</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            <Download size={18} />
            Export
          </button>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
            <Plus size={18} />
            Tambah Ulangan
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <BookOpen size={24} className="text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Total UH</h4>
              <p className="text-3xl font-bold text-gray-800">{totalExams}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <div>
              <h4 className="text-sm text-green-600 mb-1">Sudah Dikumpulkan</h4>
              <p className="text-3xl font-bold text-green-700">{completedExams}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <Clock size={24} className="text-red-600" />
            </div>
            <div>
              <h4 className="text-sm text-red-600 mb-1">Belum Dikumpulkan</h4>
              <p className="text-3xl font-bold text-red-700">{pendingExams}</p>
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
            <label className="text-xs text-gray-500">Guru</label>
            <select 
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Guru</option>
              {isClient && teachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.name}>{teacher.name}</option>
              ))}
            </select>
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
            <label className="text-xs text-gray-500">Mata Pelajaran</label>
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Mata Pelajaran</option>
              {isClient && subjects.map((subj: any) => (
                <option key={subj.id} value={subj.name}>{subj.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Status</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Status</option>
              <option value="Sudah">Sudah Dikumpulkan</option>
              <option value="Belum">Belum Dikumpulkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal UH</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jurusan</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Topik</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Progress Nilai</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tgl. Dikumpulkan</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredExams.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {item.date}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-800 font-medium">{item.teacher}</td>
                <td className="px-6 py-4 text-gray-600">{item.subject}</td>
                <td className="px-6 py-4 text-gray-600">{item.className}</td>
                <td className="px-6 py-4 text-gray-600">{item.major}</td>
                <td className="px-6 py-4 text-gray-600">{item.topic}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.status === "Sudah" ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${(item.gradedStudents / item.totalStudents) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {item.gradedStudents}/{item.totalStudents}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {item.submittedDate || "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="Lihat Nilai">
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
