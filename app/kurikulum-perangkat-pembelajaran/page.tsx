"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Edit, Trash2, Eye, Calendar, FileText, BookOpen, Book, FileCheck, CheckCircle2, Clock, Filter, Upload, Check, X, Activity, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canAccessTab, defaultTabFor } from "@/lib/permissions";
import {
  getTeacherClassOptions,
  getTeacherSubjectOptions,
  resolveCurrentTeacher,
  type CurrentTeacher,
} from "@/lib/current-teacher";
import { getMajorLabel } from "@/lib/curriculum-submissions";

const PAGE_ID = "kurikulum-perangkat-pembelajaran";

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
  const [currentTeacher, setCurrentTeacher] = useState<CurrentTeacher | null>(null);
  const [formError, setFormError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    teacherId: "",
    teacherName: "",
    subject: "",
    grade: "",
    major: "",
    majorCode: "",
    className: "",
    tool: "RPE",
  });

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadMasterOptions = async () => {
      try {
        const [subjectsRes, classesRes, teachersRes] = await Promise.all([
          fetch("/api/subjects", { cache: "no-store" }),
          fetch("/api/class-majors", { cache: "no-store" }),
          fetch("/api/teachers", { cache: "no-store" }),
        ]);

        const [subjectsData, classesData, teachersData] = await Promise.all([
          subjectsRes.json().catch(() => []),
          classesRes.json().catch(() => []),
          teachersRes.json().catch(() => []),
        ]);

        if (!cancelled) {
          setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
          setClasses(Array.isArray(classesData) ? classesData : []);
          setTeachers(Array.isArray(teachersData) ? teachersData : []);
        }
      } catch {
        if (!cancelled) {
          setSubjects([]);
          setClasses([]);
          setTeachers([]);
        }
      }
    };

    loadMasterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadSubmissionData = async () => {
    const response = await fetch("/api/curriculum-submissions?category=learning", { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || "Gagal memuat data perangkat pembelajaran.");
    }
    setSubmissions(Array.isArray(result?.submissions) ? result.submissions : []);
    setActivities(Array.isArray(result?.activities) ? result.activities : []);
  };

  useEffect(() => {
    loadSubmissionData().catch(() => {
      setSubmissions([]);
      setActivities([]);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentTeacher = async () => {
      if (role === "ADMIN") {
        setCurrentTeacher(null);
        return;
      }

      try {
        const teacher = await resolveCurrentTeacher(user);
        if (!cancelled) {
          setCurrentTeacher(teacher);
        }
      } catch {
        if (!cancelled) {
          setCurrentTeacher(null);
        }
      }
    };

    loadCurrentTeacher();

    return () => {
      cancelled = true;
    };
  }, [role, user]);

  // Guru: isi otomatis Nama Guru dengan namanya sendiri di form.
  useEffect(() => {
    if (role === "TEACHER" && (currentTeacher?.name || user?.name)) {
      setFormData((prev) =>
        prev.teacherName === (currentTeacher?.name || user?.name) && prev.teacherId === (currentTeacher?.id || "")
          ? prev
          : {
              ...prev,
              teacherId: currentTeacher?.id || "",
              teacherName: currentTeacher?.name || user?.name || "",
            }
      );
    }
  }, [currentTeacher?.id, currentTeacher?.name, role, user?.name]);

  // Pilihan Nama Guru di form:
  // - ADMIN: semua guru terdaftar.
  // - GURU: hanya dirinya sendiri (sesuai data di database admin).
  const formTeacherOptions =
    role === "ADMIN"
      ? teachers
      : currentTeacher
        ? [{ id: currentTeacher.id, name: currentTeacher.name }]
        : teachers.filter((t: any) => t.name === user?.name);

  const subjectOptions =
    role === "ADMIN"
      ? subjects
      : getTeacherSubjectOptions(currentTeacher).map((subject, index) => ({
          id: `teacher-subject-${index}`,
          name: subject,
        }));
  const majorFilterOptions = useMemo(
    () =>
      Array.from(
        new Map(
          classes
            .filter((cls: any) => cls?.majorCode)
            .map((cls: any) => [cls.majorCode, { code: cls.majorCode, label: cls.majorName || getMajorLabel(cls.majorCode) }])
        ).values()
      ),
    [classes]
  );

  const classOptions = useMemo(() => {
    if (role === "ADMIN") {
      return classes.map((cls: any) => ({
        id: cls.id,
        value: cls.className,
        className: cls.className,
        label: cls.className,
        grade: cls.grade,
        majorCode: cls.majorCode,
        major: cls.majorName || getMajorLabel(cls.majorCode),
      }));
    }
    return getTeacherClassOptions(currentTeacher, formData.subject).map((assignment) => ({
      id: assignment.id,
      value: assignment.className,
      className: assignment.className,
      label: assignment.className,
      grade: assignment.classLevel,
      majorCode: assignment.majorCode,
      major: assignment.majorName || getMajorLabel(assignment.majorCode),
    }));
  }, [role, classes, currentTeacher, formData.subject]);

  const availableGrades = useMemo(() => {
    const grades = classOptions.map((cls: any) => cls.grade).filter(Boolean);
    return Array.from(new Set(grades)).sort();
  }, [classOptions]);

  const filteredMajors = useMemo(() => {
    if (!formData.grade) return [];
    const matchingOptions = classOptions.filter((cls: any) => cls.grade === formData.grade);
    const unique = Array.from(
      new Map(
        matchingOptions.map((cls: any) => [
          cls.majorCode,
          { majorCode: cls.majorCode, major: cls.major },
        ])
      ).values()
    );
    return unique;
  }, [classOptions, formData.grade]);

  useEffect(() => {
    if (role !== "TEACHER") return;

    const nextSubject = subjectOptions[0]?.name || "";
    setFormData((prev) =>
      prev.subject === nextSubject
        ? prev
        : { ...prev, subject: nextSubject }
    );
  }, [role, subjectOptions]);

  useEffect(() => {
    if (role !== "TEACHER") return;

    setFormData((prev) => {
      const curGrade = prev.grade;
      const curMajorCode = prev.majorCode;
      if (!curGrade || !curMajorCode) return prev;
      
      const stillAllowed = classOptions.some(
        (cls: any) => cls.grade === curGrade && cls.majorCode === curMajorCode
      );
      if (stillAllowed) return prev;
      return {
        ...prev,
        className: "",
        grade: "",
        major: "",
        majorCode: "",
      };
    });
  }, [classOptions, role]);

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

  const handleSubmitPerangkat = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setFormError("Pilih file perangkat terlebih dahulu.");
      return;
    }

    setFormError("");
    try {
      const payload = new FormData();
      payload.set("teacherId", formData.teacherId);
      payload.set("teacherName", formData.teacherName);
      payload.set("subject", formData.subject);
      payload.set("grade", formData.grade);
      payload.set("major", formData.major);
      payload.set("majorCode", formData.majorCode);
      payload.set("className", formData.className);
      payload.set("tool", formData.tool);
      payload.set("file", selectedFile);

      const response = await fetch("/api/curriculum-submissions?category=learning", {
        method: "POST",
        body: payload,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan perangkat pembelajaran.");
      }

      await loadSubmissionData();
      setFormData({
        teacherId: role === "TEACHER" ? (currentTeacher?.id || "") : "",
        teacherName: role === "TEACHER" ? (currentTeacher?.name || user?.name || "") : "",
        subject: role === "TEACHER" ? (subjectOptions[0]?.name || "") : "",
        grade: "",
        major: "",
        majorCode: "",
        className: "",
        tool: "RPE",
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setActiveTab("monitoring");
    } catch (error: any) {
      setFormError(error?.message || "Gagal menyimpan perangkat pembelajaran.");
    }
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const isAllowed = /\.(pdf|doc|docx)$/i.test(file.name);
    if (!isAllowed) {
      setFormError("File harus berformat PDF, DOC, atau DOCX.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError("Ukuran file maksimal 10MB.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setFormError("");
    setSelectedFile(file);
  };

  const handleVerify = async (id: string) => {
    try {
      const response = await fetch("/api/curriculum-submissions?category=learning", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          action: "verify",
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal memverifikasi perangkat pembelajaran.");
      }
      await loadSubmissionData();
    } catch (error: any) {
      setFormError(error?.message || "Gagal memverifikasi perangkat pembelajaran.");
    }
  };

  const handleOpenSubmissionFile = (id: string) => {
    window.open(`/api/curriculum-submissions/${id}/file?disposition=inline`, "_blank", "noopener,noreferrer");
  };

  const handleDownloadSubmissionFile = (id: string) => {
    window.location.href = `/api/curriculum-submissions/${id}/file?disposition=attachment`;
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextGrade = e.target.value;
    setFormData((prev) => ({
      ...prev,
      grade: nextGrade,
      className: "",
      major: "",
      majorCode: "",
    }));
  };

  const handleMajorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMajorCode = e.target.value;
    const selectedMajorObj = filteredMajors.find((m: any) => m.majorCode === selectedMajorCode);
    setFormData((prev) => ({
      ...prev,
      majorCode: selectedMajorCode,
      major: selectedMajorObj?.major || "",
      className: prev.grade && selectedMajorCode ? `${prev.grade} ${selectedMajorCode}` : "",
    }));
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
                  {majorFilterOptions.map((major) => (
                    <option key={major.code} value={major.code}>{major.label}</option>
                  ))}
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
                  {teachers.map((teacher: any) => (
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
                  {subjects.map((subject: any) => (
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
                        <button
                          type="button"
                          onClick={() => handleOpenSubmissionFile(item.id)}
                          disabled={!item.hasStoredFile}
                          className="p-2 hover:bg-gray-100 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
                          title={item.hasStoredFile ? `Lihat ${item.fileName}` : "File belum tersedia"}
                        >
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSubmissionFile(item.id)}
                          disabled={!item.hasStoredFile}
                          className="p-2 hover:bg-gray-100 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
                          title={item.hasStoredFile ? `Download ${item.fileName}` : "File belum tersedia"}
                        >
                          <Download size={16} className="text-gray-600" />
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
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nama Guru</label>
                  <select 
                    required
                    value={formData.teacherId || ""}
                    onChange={(e) => {
                      const selectedTeacher = formTeacherOptions.find((teacher: any) => String(teacher.id) === e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        teacherId: e.target.value,
                        teacherName: selectedTeacher?.name || "",
                      }));
                    }}
                    disabled={role === "TEACHER"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Guru</option>
                    {formTeacherOptions.map((teacher: any) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
                  <select 
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    disabled={role === "TEACHER" && subjectOptions.length <= 1}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Mata Pelajaran</option>
                    {subjectOptions.map((subject: any) => (
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
                  <label className="text-sm font-medium text-gray-700">Tingkat</label>
                  <select 
                    required
                    value={formData.grade}
                    onChange={handleGradeChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Tingkat</option>
                    {availableGrades.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Jurusan</label>
                  <select 
                    required
                    value={formData.majorCode}
                    onChange={handleMajorChange}
                    disabled={!formData.grade}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:bg-gray-50"
                  >
                    <option value="">Pilih Jurusan</option>
                    {filteredMajors.map((m: any) => (
                      <option key={m.majorCode} value={m.majorCode}>{m.major}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">File Perangkat</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleSelectFile}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition cursor-pointer"
                >
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Klik untuk mengunggah atau seret file ke sini</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC (max 10MB)</p>
                  {selectedFile && (
                    <p className="mt-3 text-sm font-medium text-primary-700">
                      File terpilih: {selectedFile.name}
                    </p>
                  )}
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
