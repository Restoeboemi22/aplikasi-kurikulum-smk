"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, FileQuestion, FileText, BarChart3, FileCheck, CheckCircle2, Clock, Filter } from "lucide-react";

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

export default function AssessmentToolsPage() {
  const [selectedTool, setSelectedTool] = useState("Bank Soal");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");

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

  const [isClient, setIsClient] = useState(false);

  // Sync all data with localStorage changes
  useEffect(() => {
    setIsClient(true);
    const syncData = () => {
      const savedSubjects = localStorage.getItem('kurikulum-smk-subjects');
      if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
      
      const savedClasses = localStorage.getItem('kurikulum-smk-classes');
      if (savedClasses) setClasses(JSON.parse(savedClasses));
      
      const savedTeachers = localStorage.getItem('kurikulum-smk-teachers');
      if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
    };
    window.addEventListener('storage', syncData);
    syncData();
    return () => window.removeEventListener('storage', syncData);
  }, []);
  
  const tools = [
    "Bank Soal",
    "Kisi-kisi",
    "Analisis Butir Soal",
    "Pedoman Penskoran"
  ];

  const [teacherSubmissions] = useState([
    { id: 1, teacherName: "Pak Budi Santoso", subject: "Informatika", grade: "X", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", className: "X TKJ 1", status: "Sudah", submissionDate: "10 Juni 2024", verifiedBy: "Wakasek Kurikulum" },
    { id: 2, teacherName: "Bu Siti Aminah", subject: "Matematika", grade: "X", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", className: "X TKJ 1", status: "Sudah", submissionDate: "11 Juni 2024", verifiedBy: "Wakasek Kurikulum" },
    { id: 3, teacherName: "Pak Anton Wijaya", subject: "Dasar-Dasar Program Keahlian", grade: "X", major: "Teknik Kendaraan Ringan", majorCode: "TKR", className: "X TKR 1", status: "Belum", submissionDate: "-", verifiedBy: "-" },
    { id: 4, teacherName: "Bu Rina Putri", subject: "Bahasa Inggris", grade: "X", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", className: "X TKJ 1", status: "Sudah", submissionDate: "12 Juni 2024", verifiedBy: "Wakasek Kurikulum" },
  ]);

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
          <h3 className="text-lg font-semibold text-gray-800">Monitoring Perangkat Penilaian</h3>
          <p className="text-sm text-gray-500">Monitor pengumpulan perangkat penilaian oleh guru</p>
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
            <label className="text-xs text-gray-500">Perangkat</label>
            <select 
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {tools.map((tool) => (
                <option key={tool} value={tool}>{tool}</option>
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(() => {
          const filteredSubmissions = teacherSubmissions.filter((item) => {
            const teacherMatch = !selectedTeacher || item.teacherName === selectedTeacher;
            const gradeMatch = !selectedGrade || item.grade === selectedGrade;
            const majorMatch = !selectedMajor || item.majorCode === selectedMajor;
            const subjectMatch = !selectedSubject || item.subject === selectedSubject;
            return teacherMatch && gradeMatch && majorMatch && subjectMatch;
          });
          return (
            <>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm text-gray-500 mb-1">Total Guru</h4>
                <p className="text-3xl font-bold text-gray-800">{filteredSubmissions.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm text-green-600 mb-1">Sudah Mengumpulkan</h4>
                <p className="text-3xl font-bold text-green-700">{filteredSubmissions.filter(t => t.status === "Sudah").length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm text-red-600 mb-1">Belum Mengumpulkan</h4>
                <p className="text-3xl font-bold text-red-700">{filteredSubmissions.filter(t => t.status === "Belum").length}</p>
              </div>
            </>
          );
        })()}
      </div>

      {/* Submission Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Guru</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jurusan</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal Pengumpulan</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Diverifikasi Oleh</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {teacherSubmissions.filter((item) => {
              const teacherMatch = !selectedTeacher || item.teacherName === selectedTeacher;
              const gradeMatch = !selectedGrade || item.grade === selectedGrade;
              const majorMatch = !selectedMajor || item.majorCode === selectedMajor;
              const subjectMatch = !selectedSubject || item.subject === selectedSubject;
              return teacherMatch && gradeMatch && majorMatch && subjectMatch;
            }).map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">{item.teacherName}</span>
                </td>
                <td className="px-6 py-4 text-gray-600">{item.subject}</td>
                <td className="px-6 py-4 text-gray-600">{item.className}</td>
                <td className="px-6 py-4 text-gray-600">{item.major}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{item.submissionDate}</td>
                <td className="px-6 py-4 text-gray-600">{item.verifiedBy}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="Lihat">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-blue-100 rounded-lg" title="Edit">
                      <Edit size={16} className="text-blue-600" />
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
