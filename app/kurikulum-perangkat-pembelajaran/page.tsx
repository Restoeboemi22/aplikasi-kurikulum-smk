"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, Calendar, FileText, BookOpen, Book, FileCheck, CheckCircle2, Clock, Filter, Upload, Check, X, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canAccessTab, defaultTabFor } from "@/lib/permissions";

const PAGE_ID = "kurikulum-perangkat-pembelajaran";

const DEFAULT_CLASSES = [
  { id: 1, className: "X TKJ 1", majorCode: "TKJ", grade: "X" },
  { id: 2, className: "X TKJ 2", majorCode: "TKJ", grade: "X" },
  { id: 3, className: "X TKR 1", majorCode: "TKR", grade: "X" },
];

const DEFAULT_TEACHERS = [
  { id: 1, name: "Pak Budi Santoso" },
  { id: 2, name: "Bu Siti Aminah" },
  { id: 3, name: "Pak Anton Wijaya" },
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

const TOOLS = [
  "Kalender Pendidikan",
  "RPE",
  "Prota",
  "Promes",
  "CP",
  "ATP",
  "KKTP",
  "Modul Ajar"
];

const DEFAULT_SUBMISSIONS = [
  { id: 1, teacherName: "Pak Budi Santoso", subject: "Informatika", grade: "X", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", className: "X TKJ 1", tool: "RPE", status: "Sudah", submissionDate: "10 Juni 2024", verifiedBy: "Wakasek Kurikulum" },
  { id: 2, teacherName: "Bu Siti Aminah", subject: "Matematika", grade: "X", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ", className: "X TKJ 1", tool: "ATP", status: "Sudah", submissionDate: "11 Juni 2024", verifiedBy: "Wakasek Kurikulum" },
  { id: 3, teacherName: "Pak Anton Wijaya", subject: "Dasar-Dasar Program Keahlian", grade: "X", major: "Teknik Kendaraan Ringan", majorCode: "TKR", className: "X TKR 1", tool: "Modul Ajar", status: "Belum", submissionDate: "-", verifiedBy: "-" },
];

const DEFAULT_ACTIVITIES = [
  { id: 1, teacherName: "Pak Budi Santoso", action: "Mengirim RPE", subject: "Informatika", timestamp: "10 Juni 2024, 08:30", type: "submit" },
  { id: 2, teacherName: "Bu Siti Aminah", action: "Mengirim ATP", subject: "Matematika", timestamp: "11 Juni 2024, 09:15", type: "submit" },
  { id: 3, teacherName: "Wakasek Kurikulum", action: "Memverifikasi RPE Pak Budi", subject: "Informatika", timestamp: "11 Juni 2024, 10:00", type: "verify" },
];

export default function LearningToolsPage() {
  const { user } = useAuth();
  const role = user?.role ?? "TEACHER";
  const [activeTab, setActiveTab] = useState(() =>
    defaultTabFor(role, PAGE_ID, "monitoring")
  );
  const [selectedTool, setSelectedTool] = useState("RPE");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Form submission state
  const [formData, setFormData] = useState({
    teacherName: "",
    subject: "",
    grade: "",
    major: "",
    majorCode: "",
    className: "",
    tool: "RPE",
  });

  // Data from localStorage
  const [subjects, setSubjects] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-subjects');
      return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
    }
    return DEFAULT_SUBJECTS;
  });

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

  const [submissions, setSubmissions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-learning-submissions');
      return saved ? JSON.parse(saved) : DEFAULT_SUBMISSIONS;
    }
    return DEFAULT_SUBMISSIONS;
  });

  const [activities, setActivities] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-learning-activities');
      return saved ? JSON.parse(saved) : DEFAULT_ACTIVITIES;
    }
    return DEFAULT_ACTIVITIES;
  });

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
      
      const savedSubmissions = localStorage.getItem('kurikulum-smk-learning-submissions');
      if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));
      
      const savedActivities = localStorage.getItem('kurikulum-smk-learning-activities');
      if (savedActivities) setActivities(JSON.parse(savedActivities));
    };
    window.addEventListener('storage', syncData);
    syncData();
    return () => window.removeEventListener('storage', syncData);
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-learning-submissions', JSON.stringify(submissions));
    }
  }, [submissions, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-learning-activities', JSON.stringify(activities));
    }
  }, [activities, isClient]);

  // Filter submissions
  const filteredSubmissions = submissions.filter((item: any) => {
    const gradeMatch = !selectedGrade || item.grade === selectedGrade;
    const majorMatch = !selectedMajor || item.majorCode === selectedMajor;
    const teacherMatch = !selectedTeacher || item.teacherName === selectedTeacher;
    const subjectMatch = !selectedSubject || item.subject === selectedSubject;
    const toolMatch = !selectedTool || item.tool === selectedTool;
    return gradeMatch && majorMatch && teacherMatch && subjectMatch && toolMatch;
  });

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "submit": return <Upload size={16} className="text-blue-600" />;
      case "verify": return <Check size={16} className="text-green-600" />;
      case "reject": return <X size={16} className="text-red-600" />;
      default: return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "submit": return "bg-blue-100";
      case "verify": return "bg-green-100";
      case "reject": return "bg-red-100";
      default: return "bg-gray-100";
    }
  };

  const handleSubmitPerangkat = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newSubmission = {
      id: Date.now(),
      ...formData,
      status: "Sudah",
      submissionDate: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      verifiedBy: "-",
    };

    // Update submissions
    setSubmissions((prev: any) => [...prev, newSubmission]);

    // Add to activity log
    const newActivity = {
      id: Date.now(),
      teacherName: formData.teacherName,
      action: `Mengirim ${formData.tool}`,
      subject: formData.subject,
      timestamp: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      type: "submit"
    };

    setActivities((prev: any) => [newActivity, ...prev]);

    // Reset form
    setFormData({
      teacherName: "",
      subject: "",
      grade: "",
      major: "",
      majorCode: "",
      className: "",
      tool: "RPE",
    });

    // Switch to monitoring tab
    setActiveTab("monitoring");
  };

  const handleVerify = (id: number) => {
    setSubmissions((prev: any) => prev.map((item: any) =>
      item.id === id ? { ...item, status: "Sudah", verifiedBy: "Wakasek Kurikulum" } : item
    ));

    const submission = submissions.find((item: any) => item.id === id);
    if (submission) {
      const newActivity = {
        id: Date.now(),
        teacherName: "Wakasek Kurikulum",
        action: `Memverifikasi ${submission.tool} ${submission.teacherName}`,
        subject: submission.subject,
        timestamp: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        type: "verify"
      };
      setActivities((prev: any) => [newActivity, ...prev]);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedClass = classes.find((c: any) => c.className === e.target.value);
    if (selectedClass) {
      setFormData(prev => ({
        ...prev,
        className: selectedClass.className,
        grade: selectedClass.grade,
        major: selectedClass.majorCode === "TKJ" ? "Teknik Komputer dan Jaringan" : "Teknik Kendaraan Ringan",
        majorCode: selectedClass.majorCode
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {canAccessTab(role, PAGE_ID, "monitoring") && (
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`${
                activeTab === "monitoring"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Monitoring
            </button>
          )}
          {canAccessTab(role, PAGE_ID, "submit") && (
            <button
              onClick={() => setActiveTab("submit")}
              className={`${
                activeTab === "submit"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Submit Perangkat
            </button>
          )}
          {canAccessTab(role, PAGE_ID, "timeline") && (
            <button
              onClick={() => setActiveTab("timeline")}
              className={`${
                activeTab === "timeline"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Timeline Aktivitas
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content: Monitoring */}
      {activeTab === "monitoring" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Monitoring Perangkat Pembelajaran</h3>
              <p className="text-sm text-gray-500">Monitor pengumpulan perangkat pembelajaran oleh guru</p>
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
                  {TOOLS.map((tool) => (
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
                  {isClient && subjects.map((subject: any) => (
                    <option key={subject.id} value={subject.name}>{subject.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm text-gray-500 mb-1">Total Guru</h4>
              <p className="text-3xl font-bold text-gray-800">{filteredSubmissions.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm text-green-600 mb-1">Sudah Mengumpulkan</h4>
              <p className="text-3xl font-bold text-green-700">{filteredSubmissions.filter((t: any) => t.status === "Sudah").length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm text-red-600 mb-1">Belum Mengumpulkan</h4>
              <p className="text-3xl font-bold text-red-700">{filteredSubmissions.filter((t: any) => t.status === "Belum").length}</p>
            </div>
          </div>

          {/* Submission Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Guru</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Perangkat</th>
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
                {filteredSubmissions.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800">{item.teacherName}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.tool}</td>
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
                        {item.status !== "Sudah" && (
                          <button 
                            onClick={() => handleVerify(item.id)}
                            className="p-2 hover:bg-green-100 rounded-lg" 
                            title="Verifikasi"
                          >
                            <Check size={16} className="text-green-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Submit Perangkat */}
      {activeTab === "submit" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Submit Perangkat Pembelajaran</h3>
              <p className="text-sm text-gray-500">Kirim perangkat pembelajaran Anda</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-8 max-w-2xl">
            <form onSubmit={handleSubmitPerangkat} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nama Guru</label>
                  <select 
                    required
                    value={formData.teacherName}
                    onChange={(e) => setFormData(prev => ({ ...prev, teacherName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Guru</option>
                    {isClient && teachers.map((teacher: any) => (
                      <option key={teacher.id} value={teacher.name}>{teacher.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
                  <select 
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Mata Pelajaran</option>
                    {isClient && subjects.map((subject: any) => (
                      <option key={subject.id} value={subject.name}>{subject.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Perangkat</label>
                  <select 
                    required
                    value={formData.tool}
                    onChange={(e) => setFormData(prev => ({ ...prev, tool: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TOOLS.map((tool) => (
                      <option key={tool} value={tool}>{tool}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Kelas</label>
                  <select 
                    required
                    value={formData.className}
                    onChange={handleClassChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Kelas</option>
                    {isClient && classes.map((cls: any) => (
                      <option key={cls.id} value={cls.className}>{cls.className}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">File Perangkat</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition cursor-pointer">
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Klik untuk mengunggah atau seret file ke sini</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC (max 10MB)</p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setActiveTab("monitoring")}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  <Upload size={18} />
                  Kirim Perangkat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Content: Timeline Aktivitas */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Timeline Aktivitas</h3>
              <p className="text-sm text-gray-500">Catat semua aksi secara real-time</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="space-y-6">
              {activities.map((activity: any, index: any) => (
                <div key={activity.id} className="relative pl-8">
                  {index !== activities.length - 1 && (
                    <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  <div className={`absolute left-0 top-0 w-6 h-6 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">{activity.teacherName}</span>
                      <span className="text-xs text-gray-500">{activity.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.subject}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
