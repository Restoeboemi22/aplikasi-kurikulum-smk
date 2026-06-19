"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, CheckCircle2, Clock, Filter } from "lucide-react";

const DEFAULT_TEACHERS = [
  {
    id: 1,
    kodeGuru: "GRU001",
    tanggalLahir: "1985-01-01",
    name: "Pak Budi Santoso",
    mataPelajaran: "Informatika",
    tingkatKelas: ["X"],
    jurusan: ["TKJ"],
    jenisKelamin: "Laki-laki",
  },
  {
    id: 2,
    kodeGuru: "GRU002",
    tanggalLahir: "1988-05-15",
    name: "Bu Siti Aminah",
    mataPelajaran: "Matematika",
    tingkatKelas: ["X", "XI"],
    jurusan: ["TKJ", "TKR"],
    jenisKelamin: "Perempuan",
  },
  {
    id: 3,
    kodeGuru: "GRU003",
    tanggalLahir: "1982-03-20",
    name: "Pak Anton Wijaya",
    mataPelajaran: "Dasar-Dasar Program Keahlian",
    tingkatKelas: ["X"],
    jurusan: ["TKR"],
    jenisKelamin: "Laki-laki",
  },
];

const DEFAULT_CLASSES = [
  {
    id: 1,
    className: "X TKJ 1",
    major: "Teknik Komputer dan Jaringan",
    majorCode: "TKJ",
    grade: "X",
    homeroomTeacher: "Pak Budi Santoso",
    studentCount: 32,
    room: "Lab Komputer 1",
  },
  {
    id: 2,
    className: "X TKJ 2",
    major: "Teknik Komputer dan Jaringan",
    majorCode: "TKJ",
    grade: "X",
    homeroomTeacher: "Bu Siti Aminah",
    studentCount: 30,
    room: "Lab Komputer 2",
  },
  {
    id: 3,
    className: "X TKR 1",
    major: "Teknik Kendaraan Ringan",
    majorCode: "TKR",
    grade: "X",
    homeroomTeacher: "Pak Anton Wijaya",
    studentCount: 28,
    room: "Bengkel TKR",
  },
];

export default function ClassPickupPage() {
  const [activeTab, setActiveTab] = useState("monitoring"); // "monitoring" or "create"
  const [selectedDay, setSelectedDay] = useState("Senin");
  const [selectedWeek, setSelectedWeek] = useState("Minggu ke-I");
  const [selectedMonth, setSelectedMonth] = useState("Juni");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const weeks = ["Minggu ke-I", "Minggu ke-II", "Minggu ke-III", "Minggu ke-IV"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const years = Array.from({ length: 18 }, (_, i) => (2023 + i).toString());
  
  const [teachers, setTeachers] = useState(DEFAULT_TEACHERS);
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [isClient, setIsClient] = useState(false);

  // Load from localStorage and sync
  useEffect(() => {
    setIsClient(true);
    // Initial load
    const savedTeachers = localStorage.getItem('kurikulum-smk-teachers');
    const savedClasses = localStorage.getItem('kurikulum-smk-classes');
    if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
    if (savedClasses) setClasses(JSON.parse(savedClasses));

    // Listen for storage changes
    const handleStorageChange = () => {
      const updatedTeachers = localStorage.getItem('kurikulum-smk-teachers');
      const updatedClasses = localStorage.getItem('kurikulum-smk-classes');
      if (updatedTeachers) setTeachers(JSON.parse(updatedTeachers));
      if (updatedClasses) setClasses(JSON.parse(updatedClasses));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [createdSchedules, setCreatedSchedules] = useState([
    { id: 1, day: "Senin", teacherName: "Pak Budi Santoso", classes: ["X TKJ 1", "X TKJ 2"], week: "Minggu ke-I", month: "Juni", year: "2024" },
    { id: 2, day: "Selasa", teacherName: "Bu Siti Aminah", classes: ["X TKJ 1"], week: "Minggu ke-I", month: "Juni", year: "2024" },
    { id: 3, day: "Rabu", teacherName: "Pak Anton Wijaya", classes: ["X TKR 1"], week: "Minggu ke-I", month: "Juni", year: "2024" },
  ]);

  const [picketSchedules] = useState([
    { id: 1, day: "Senin", teacherName: "Pak Budi Santoso", classes: "X TKJ 1, X TKJ 2", status: "Sudah", checkInTime: "07:00 WIB", notes: "-" },
    { id: 2, day: "Selasa", teacherName: "Bu Siti Aminah", classes: "X TKJ 1", status: "Sudah", checkInTime: "07:10 WIB", notes: "-" },
    { id: 3, day: "Rabu", teacherName: "Pak Anton Wijaya", classes: "X TKR 1", status: "Belum", checkInTime: "-", notes: "-" },
    { id: 4, day: "Kamis", teacherName: "Bu Rina Putri", classes: "X TKJ 1", status: "Sudah", checkInTime: "06:55 WIB", notes: "-" },
    { id: 5, day: "Jumat", teacherName: "Pak Dedi Supriatna", classes: "X TKR 1, X TKR 2", status: "Belum", checkInTime: "-", notes: "-" },
  ]);

  const handleAddSchedule = () => {
    if (!selectedTeacher || selectedClasses.length === 0) return;
    
    const newSchedule = {
      id: Date.now(),
      day: selectedDay,
      teacherName: selectedTeacher,
      classes: selectedClasses,
      week: selectedWeek,
      month: selectedMonth,
      year: selectedYear
    };
    
    setCreatedSchedules([...createdSchedules, newSchedule]);
    setSelectedTeacher("");
    setSelectedClasses([]);
  };

  const handleDeleteSchedule = (id: number) => {
    setCreatedSchedules(createdSchedules.filter(item => item.id !== id));
  };

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
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("monitoring")}
            className={`${
              activeTab === "monitoring"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Monitoring Piket Kelas
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`${
              activeTab === "create"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Buat Jadwal Piket Kelas
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "monitoring" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Monitoring Piket Kelas</h3>
              <p className="text-sm text-gray-500">Monitor kehadiran dan pelaksanaan piket kelas oleh guru</p>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Tahun</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Bulan</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Minggu</label>
                <select 
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {weeks.map((week) => (
                    <option key={week} value={week}>{week}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Hari</label>
                <select 
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm text-gray-500 mb-1">Total Guru Piket</h4>
              <p className="text-3xl font-bold text-gray-800">{picketSchedules.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm text-green-600 mb-1">Sudah Piket</h4>
              <p className="text-3xl font-bold text-green-700">{picketSchedules.filter(t => t.status === "Sudah").length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm text-red-600 mb-1">Belum Piket</h4>
              <p className="text-3xl font-bold text-red-700">{picketSchedules.filter(t => t.status === "Belum").length}</p>
            </div>
          </div>

          {/* Picket Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hari</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru Piket</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas Yang Ditanggung</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Waktu Check In</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Catatan</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {picketSchedules.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{item.day}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{item.teacherName}</td>
                    <td className="px-6 py-4 text-gray-600">{item.classes}</td>
                    <td className="px-6 py-4 text-gray-600">{item.checkInTime}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.notes}</td>
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
      )}

      {activeTab === "create" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Buat Jadwal Piket Kelas</h3>
              <p className="text-sm text-gray-500">Atur jadwal piket kelas untuk setiap guru</p>
            </div>
          </div>

          {/* Form to Add Schedule */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Tambah Jadwal Piket</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Tahun</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Bulan</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Minggu</label>
                <select 
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {weeks.map((week) => (
                    <option key={week} value={week}>{week}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Hari</label>
                <select 
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Guru Piket</label>
                <select 
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Pilih Guru</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.name}>{teacher.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Kelas Yang Ditanggung</label>
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => (
                    <label key={cls.id} className="flex items-center gap-1 px-3 py-1 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input 
                        type="checkbox" 
                        checked={selectedClasses.includes(cls.className)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClasses([...selectedClasses, cls.className]);
                          } else {
                            setSelectedClasses(selectedClasses.filter(c => c !== cls.className));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{cls.className}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleAddSchedule}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
            >
              <Plus size={18} />
              Tambah Jadwal
            </button>
          </div>

          {/* Schedule List */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tahun</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Bulan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Minggu</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hari</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru Piket</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas Yang Ditanggung</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {createdSchedules.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{item.year}</td>
                    <td className="px-6 py-4 text-gray-600">{item.month}</td>
                    <td className="px-6 py-4 text-gray-600">{item.week}</td>
                    <td className="px-6 py-4 text-gray-600">{item.day}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{item.teacherName}</td>
                    <td className="px-6 py-4 text-gray-600">{item.classes.join(", ")}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-blue-100 rounded-lg" title="Edit">
                          <Edit size={16} className="text-blue-600" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="p-2 hover:bg-red-100 rounded-lg" 
                          title="Hapus"
                        >
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
      )}
    </div>
  );
}
