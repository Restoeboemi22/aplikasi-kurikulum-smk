"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Download, CheckCircle2, AlertCircle, Calendar, Users, Trash2, Clock, Upload, Plus } from "lucide-react";
import * as XLSX from "xlsx";

const timeSlots = [
  { no: 1, time: "07.30-08.00" },
  { no: 2, time: "08.00-08.30" },
  { no: 3, time: "08.30-09.00" },
  { no: 4, time: "09.00-09.30" },
  { no: 5, time: "10.00-10.30" },
  { no: 6, time: "10.30-11.00" },
  { no: 7, time: "11.00-11.30" },
  { no: 8, time: "11.30-12.00" },
];

const dayTimeSlots = {
  "Senin": [1, 2, 3, 4, 5, 6, 7, 8],
  "Selasa": [1, 2, 3, 4, 5, 6, 7, 8],
  "Rabu": [1, 2, 3, 4, 5, 6, 7, 8],
  "Kamis": [1, 2, 3, 4, 5, 6, 7, 8],
  "Jumat": [1, 2, 3, 4, 5, 6],
  "Sabtu": [1, 2, 3, 4, 5]
};

const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const DEFAULT_CLASSES = [
  { id: 1, className: "X TKJ 1", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ" },
  { id: 2, className: "X TKJ 2", major: "Teknik Komputer dan Jaringan", majorCode: "TKJ" },
  { id: 3, className: "X TKR 1", major: "Teknik Kendaraan Ringan", majorCode: "TKR" },
];

const DEFAULT_MASTER_TEACHERS = [
  {
    id: 1,
    kodeGuru: "GRU001",
    tanggalLahir: "1985-01-01",
    name: "Pak Budi Santoso",
    mataPelajaran: "Informatika",
    tingkatKelas: ["X"],
    jurusan: ["TKJ"],
    jenisKelamin: "Laki-laki"
  },
  {
    id: 2,
    kodeGuru: "GRU002",
    tanggalLahir: "1988-05-15",
    name: "Bu Siti Aminah",
    mataPelajaran: "Matematika",
    tingkatKelas: ["X", "XI"],
    jurusan: ["TKJ", "TKR"],
    jenisKelamin: "Perempuan"
  },
];

const DEFAULT_SCHEDULE_TEACHERS = [
  {
    id: 1,
    teacherId: 1,
    name: "Pak Budi Santoso",
    mataPelajaran: "Informatika",
    tingkatKelas: ["X"],
    jurusan: ["TKJ"],
    requestDay: "Senin",
    jamKe: [1, 2]
  },
  {
    id: 2,
    teacherId: 2,
    name: "Bu Siti Aminah",
    mataPelajaran: "Matematika",
    tingkatKelas: ["X", "XI"],
    jurusan: ["TKJ", "TKR"],
    requestDay: "Rabu",
    jamKe: [3, 4]
  },
];



const DEFAULT_SUBJECTS_ARRAY = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Pendidikan Jasmani, Olah Raga dan Kesehatan",
  "Sejarah",
  "Seni Budaya",
  "Bahasa dan Sastra Jawa",
  "Matematika",
  "Bahasa Inggris",
  "Informatika",
  "Projek Ilmu Pengetahuan Alam dan Sosial",
  "Dasar-Dasar Program Keahlian",
  "Konsentrasi Keahlian",
  "Projek Kreatif dan Kewirausahaan",
  "Praktik Kerja Lapangan",
];

export default function AISchedulePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  const [isClient, setIsClient] = useState(false);
  
  // Load subjects from Data Mata Pelajaran page
  const [subjectsList, setSubjectsList] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-subjects');
      if (saved) {
        return JSON.parse(saved).map((s: any) => s.name);
      }
      return DEFAULT_SUBJECTS_ARRAY;
    }
    return DEFAULT_SUBJECTS_ARRAY;
  });

  // Sync all data with localStorage changes
  useEffect(() => {
    setIsClient(true);
    const syncData = () => {
      // Sync subjects
      const savedSubjects = localStorage.getItem('kurikulum-smk-subjects');
      if (savedSubjects) {
        setSubjectsList(JSON.parse(savedSubjects).map((s: any) => s.name));
      } else {
        setSubjectsList(DEFAULT_SUBJECTS_ARRAY);
      }
      
      // Sync classes
      const savedClasses = localStorage.getItem('kurikulum-smk-classes');
      if (savedClasses) setClasses(JSON.parse(savedClasses));
      
      // Sync master teachers
      const savedTeachers = localStorage.getItem('kurikulum-smk-teachers');
      if (savedTeachers) setMasterTeachers(JSON.parse(savedTeachers));
    };
    window.addEventListener('storage', syncData);
    syncData();
    return () => window.removeEventListener('storage', syncData);
  }, []);
  
  // Load classes from localStorage
  const [classes, setClasses] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-classes');
      return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
    }
    return DEFAULT_CLASSES;
  });

  // Load master teachers from Data Guru page
  const [masterTeachers, setMasterTeachers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-teachers');
      return saved ? JSON.parse(saved) : DEFAULT_MASTER_TEACHERS;
    }
    return DEFAULT_MASTER_TEACHERS;
  });

  // Load schedule teachers (template for AI) from localStorage
  const [scheduleTeachers, setScheduleTeachers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-schedule-teachers');
      return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE_TEACHERS;
    }
    return DEFAULT_SCHEDULE_TEACHERS;
  });

  const [generated, setGenerated] = useState(false);
  const [editableDayTimeSlots, setEditableDayTimeSlots] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-day-time-slots');
      return saved ? JSON.parse(saved) : dayTimeSlots;
    }
    return dayTimeSlots;
  });

  // Restrictions for religious activities
  const [religiousRestrictions, setReligiousRestrictions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kurikulum-smk-religious-restrictions');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // State for new restriction form
  const [newRestriction, setNewRestriction] = useState({
    day: 'Senin',
    jamKe: [1, 2],
    tingkat: ['X'],
    jurusan: ['TKR'],
    keterangan: 'Kegiatan Keagamaan'
  });

  // Save to localStorage whenever data changes (only when client is ready)
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-schedule-teachers', JSON.stringify(scheduleTeachers));
    }
  }, [scheduleTeachers, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-classes', JSON.stringify(classes));
    }
  }, [classes, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-day-time-slots', JSON.stringify(editableDayTimeSlots));
    }
  }, [editableDayTimeSlots, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('kurikulum-smk-religious-restrictions', JSON.stringify(religiousRestrictions));
    }
  }, [religiousRestrictions, isClient]);

  const addRestriction = () => {
    if (newRestriction.jamKe.length === 0 || newRestriction.tingkat.length === 0 || newRestriction.jurusan.length === 0) {
      alert('Mohon pilih jam, tingkat, dan jurusan terlebih dahulu!');
      return;
    }
    
    // Generate all combinations of kelas
    const kelasList: string[] = [];
    newRestriction.tingkat.forEach(tingkat => {
      newRestriction.jurusan.forEach(jurusan => {
        // Add all kelas ke- for this combination
        ['1', '2', '3'].forEach(ke => {
          kelasList.push(`${tingkat} ${jurusan} ${ke}`);
        });
      });
    });
    
    setReligiousRestrictions([
      ...religiousRestrictions,
      {
        id: Date.now(),
        day: newRestriction.day,
        jamKe: [...newRestriction.jamKe],
        kelas: kelasList,
        keterangan: newRestriction.keterangan
      }
    ]);
  };

  const removeRestriction = (id: number) => {
    setReligiousRestrictions(religiousRestrictions.filter((r: any) => r.id !== id));
  };

  const toggleDayTimeSlot = (day: any, slotNo: any) => {
    setEditableDayTimeSlots((prev: any) => {
      const currentSlots = prev[day] || [];
      let newSlots;
      if (currentSlots.includes(slotNo)) {
        newSlots = currentSlots.filter((s: any) => s !== slotNo);
      } else {
        newSlots = [...currentSlots, slotNo].sort((a, b) => a - b);
      }
      return {
        ...prev,
        [day]: newSlots
      };
    });
  };

  // Fungsi untuk mendapatkan jadwal pelajaran berdasarkan hari, jam, kelas, jurusan
  const getJadwal = (day: string, slotNo: number, tingkat: string, jurusan: string, kelasKe: number) => {
    // Generate kelas name for checking
    const kelasName = `${tingkat} ${jurusan} ${kelasKe}`;
    
    // Check religious restrictions first
    const restriction = religiousRestrictions.find((r: any) =>
      r.day === day && 
      r.jamKe.includes(slotNo) && 
      r.kelas.includes(kelasName)
    );
    if (restriction) {
      return <strong className="text-purple-700">{restriction.keterangan}</strong>;
    }
    
    // Check untuk istirahat atau kegiatan khusus
    if (slotNo === 4) return <strong>ISTIRAHAT</strong>;
    if (slotNo === 5) return <strong>DHUHA PRAYER</strong>;
    if (day === "Senin" && slotNo === 1) return <strong>MORNING PARADE</strong>;

    // Cari guru yang mengajar pada hari dan jam tersebut
    const guruMengajar = scheduleTeachers.find((teacher: any) =>
      teacher.requestDay === day && 
      teacher.jamKe?.includes(slotNo) &&
      teacher.tingkatKelas?.includes(tingkat) &&
      teacher.jurusan?.includes(jurusan)
    );

    if (guruMengajar) {
      const guruData = masterTeachers.find((mt: any) => mt.id === guruMengajar.teacherId);
      return (
        <>
          <div className="font-semibold text-blue-700">{guruData?.kodeGuru || guruMengajar.teacherId}</div>
          <div className="text-gray-600">{guruMengajar.mataPelajaran}</div>
        </>
      );
    }

    // Jika tidak ada guru yang diassign, tampilkan angka acak seperti contoh
    const angkaAcak = ((slotNo * 3 + kelasKe + day.length) % 30) + 1;
    return <span className="text-gray-400">{angkaAcak}</span>;
  };
  
  const steps = [
    { label: "Menganalisis ketersediaan guru", icon: Users },
    { label: "Menyesuaikan jam pelajaran", icon: Clock },
    { label: "Membuat jadwal optimal", icon: Calendar },
    { label: "Memvalidasi konflik", icon: AlertCircle },
    { label: "Jadwal siap!", icon: CheckCircle2 },
  ];

  const addTeacherToSchedule = () => {
    if (masterTeachers.length === 0) return;
    const newId = scheduleTeachers.length > 0 ? Math.max(...scheduleTeachers.map((t: any) => t.id)) + 1 : 1;
    const firstMasterTeacher = masterTeachers[0];
    setScheduleTeachers([...scheduleTeachers, { 
      id: newId,
      teacherId: firstMasterTeacher.id,
      name: firstMasterTeacher.name,
      mataPelajaran: firstMasterTeacher.mataPelajaran,
      tingkatKelas: [...(firstMasterTeacher.tingkatKelas || [])],
      jurusan: [...(firstMasterTeacher.jurusan || [])],
      requestDay: "Senin",
      jamKe: []
    }]);
  };

  const removeTeacherFromSchedule = (id: any) => {
    setScheduleTeachers(scheduleTeachers.filter((t: any) => t.id !== id));
  };

  const updateScheduleTeacher = (id: any, field: any, value: any) => {
    setScheduleTeachers(scheduleTeachers.map((t: any) => {
      if (t.id !== id) return t;
      if (field === 'teacherId') {
        const selectedTeacher = masterTeachers.find((mt: any) => mt.id === value);
        if (selectedTeacher) {
          return {
            ...t,
            teacherId: value,
            name: selectedTeacher.name,
            mataPelajaran: selectedTeacher.mataPelajaran,
            tingkatKelas: [...(selectedTeacher.tingkatKelas || [])],
            jurusan: [...(selectedTeacher.jurusan || [])]
          };
        }
      }
      return { ...t, [field]: value };
    }));
  };

  const toggleJamKe = (id: any, jamNo: any) => {
    setScheduleTeachers(scheduleTeachers.map((t: any) => {
      if (t.id !== id) return t;
      const currentJamKe = t.jamKe || [];
      return {
        ...t,
        jamKe: currentJamKe.includes(jamNo)
          ? currentJamKe.filter((j: any) => j !== jamNo)
          : [...currentJamKe, jamNo]
      };
    }));
  };

  const toggleTingkatKelas = (id: any, tingkat: any) => {
    setScheduleTeachers(scheduleTeachers.map((t: any) => {
      if (t.id !== id) return t;
      const currentTingkat = t.tingkatKelas || [];
      return {
        ...t,
        tingkatKelas: currentTingkat.includes(tingkat)
          ? currentTingkat.filter((tk: any) => tk !== tingkat)
          : [...currentTingkat, tingkat]
      };
    }));
  };

  const toggleJurusan = (id: any, jurusan: any) => {
    setScheduleTeachers(scheduleTeachers.map((t: any) => {
      if (t.id !== id) return t;
      const currentJurusan = t.jurusan || [];
      return {
        ...t,
        jurusan: currentJurusan.includes(jurusan)
          ? currentJurusan.filter((j: any) => j !== jurusan)
          : [...currentJurusan, jurusan]
      };
    }));
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationStep(0);
    setGenerated(false);

    const interval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setIsGenerating(false);
          setGenerated(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
  };

  const exportTemplateGuru = () => {
    const exportData = scheduleTeachers.map((teacher: any) => {
      const guruData = masterTeachers.find((mt: any) => mt.id === teacher.teacherId) || teacher;
      return {
        "Kode Guru": guruData.kodeGuru || "",
        "Nama Guru": guruData.name,
        "Mata Pelajaran": teacher.mataPelajaran,
        "Tingkat Kelas": teacher.tingkatKelas?.join(", ") || "",
        "Jurusan": teacher.jurusan?.join(", ") || "",
        "Request Hari": teacher.requestDay,
        "Jam Ke-": teacher.jamKe?.join(", ") || ""
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Ketersediaan Guru");
    XLSX.writeFile(wb, "Template_Ketersediaan_Guru.xlsx");
  };

  const importTemplateGuru = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const importedTeachers = jsonData.map((row: any, index: any) => {
        const matchingTeacher = masterTeachers.find((mt: any) => mt.name === row["Nama Guru"]);

        return {
          id: Date.now() + index,
          teacherId: matchingTeacher?.id || null,
          name: row["Nama Guru"] || "",
          mataPelajaran: row["Mata Pelajaran"] || "",
          tingkatKelas: row["Tingkat Kelas"]?.split(", ")?.filter((t: any) => t) || [],
          jurusan: row["Jurusan"]?.split(", ")?.filter((j: any) => j) || [],
          requestDay: row["Request Hari"] || "Senin",
          jamKe: row["Jam Ke-"]?.split(", ")?.map((j: any) => parseInt(j.trim()))?.filter((j: any) => !isNaN(j)) || []
        };
      }).filter((t: any) => t.name);

      setScheduleTeachers([...scheduleTeachers, ...importedTeachers]);
    };
    reader.readAsArrayBuffer(file);
  };

  const exportJadwal = async () => {
    try {
      const wb = XLSX.utils.book_new();
      const jadwalData = [];

      // Header baris 1
      jadwalData.push(['JADWAL PELAJARAN SMK PACET Tp. 2025 / 2026']);
      jadwalData.push([]);

      // Header baris 2 - Kolom utama
      jadwalData.push([
        'HARI', 'WAKTU', 'JAM KE-',
        'X', '', '',
        'XI', '', '',
        'XII', '', '',
        'PIKET'
      ]);

      // Header baris 3 - Kolom kelas
      jadwalData.push([
        '', '', '',
        'TKR 1', 'TKR 2', 'TKR 3',
        'TKR 1', 'TKR 2', 'TKR 3',
        'TKR 1', 'TKR 2', 'TKR 3',
        ''
      ]);

      // Isi jadwal
      days.forEach((day, dayIndex) => {
        const availableSlots = editableDayTimeSlots[day] || [];
        const guruPiket = masterTeachers[dayIndex % masterTeachers.length];

        availableSlots.forEach((slotNo: any, slotIndex: any) => {
          const slot = timeSlots.find((s: any) => s.no === slotNo);
          const isFirst = slotIndex === 0;
          const isIstirahat = slotNo === 4;
          const isDhuhaprayer = slotNo === 5;
          const isMorningparade = day === "Senin" && slotNo === 1;

          const getCellContent = (tingkat: string, jurusan: string, kelasKe: number) => {
            const kelasName = `${tingkat} ${jurusan} ${kelasKe}`;
            
            // Check religious restrictions
            const restriction = religiousRestrictions.find((r: any) =>
              r.day === day && 
              r.jamKe.includes(slotNo) && 
              r.kelas.includes(kelasName)
            );
            if (restriction) return restriction.keterangan;
            
            if (isIstirahat) return "ISTIRAHAT";
            if (isDhuhaprayer) return "DHUHA PRAYER";
            if (isMorningparade) return "MORNING PARADE";

            const guruMengajar = scheduleTeachers.find((teacher: any) =>
              teacher.requestDay === day && 
              teacher.jamKe?.includes(slotNo) &&
              teacher.tingkatKelas?.includes(tingkat) &&
              teacher.jurusan?.includes(jurusan)
            );

            if (guruMengajar) {
              const guruData = masterTeachers.find((mt: any) => mt.id === guruMengajar.teacherId);
              return `${guruData?.kodeGuru || guruMengajar.teacherId} - ${guruMengajar.mataPelajaran}`;
            }
            
            return ((slotNo * 3 + kelasKe + day.length) % 30) + 1;
          };

          const row = [
            isFirst ? day.toUpperCase() : "",
            slot?.time || "",
            slotNo,
            getCellContent("X", "TKR", 1),
            getCellContent("X", "TKR", 2),
            getCellContent("X", "TKR", 3),
            getCellContent("XI", "TKR", 1),
            getCellContent("XI", "TKR", 2),
            getCellContent("XI", "TKR", 3),
            getCellContent("XII", "TKR", 1),
            getCellContent("XII", "TKR", 2),
            getCellContent("XII", "TKR", 3),
            isFirst ? `${guruPiket?.name} (${guruPiket?.kodeGuru})` : ""
          ];
          jadwalData.push(row);
        });

        jadwalData.push([]);
      });

      // Footer
      jadwalData.push([]);
      jadwalData.push(['Kepala SMK Pacet', '', '', '', '', '', '', '', '', '', '', '', 'Mojokerto, 02 Februari 2026']);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push(['Ir. Junaedi Hartanto, S.Pd', '', '', '', '', '', '', '', '', '', '', '', 'Wakasek Kurikulum']);
      jadwalData.push(['NIP. -', '', '', '', '', '', '', '', '', '', '', '', '']);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push(['', '', '', '', '', '', '', '', '', '', '', '', 'Anik Yumari, S.Pd']);
      jadwalData.push(['', '', '', '', '', '', '', '', '', '', '', '', 'NIP. -']);

      const ws = XLSX.utils.aoa_to_sheet(jadwalData);
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');

      const templateData = scheduleTeachers.map((teacher: any) => {
        const guruData = masterTeachers.find((mt: any) => mt.id === teacher.teacherId) || teacher;
        return {
          'Kode Guru': guruData.kodeGuru || "",
          'Nama Guru': guruData.name,
          'Mata Pelajaran': teacher.mataPelajaran,
          'Tingkat Kelas': teacher.tingkatKelas?.join(", ") || "",
          'Jurusan': teacher.jurusan?.join(", ") || "",
          'Request Hari': teacher.requestDay,
          'Jam Ke-': teacher.jamKe?.join(", ") || ""
        };
      });
      const wsTemplate = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Guru');

      XLSX.writeFile(wb, 'Jadwal_Pelajaran_SMK_PACET_2025_2026.xlsx');
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Gagal mengekspor jadwal. Silakan coba lagi.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Mengatur Jadwal Guru Otomatis by AI</h3>
          <p className="text-sm text-gray-500">Hasilkan jadwal pelajaran optimal tanpa bentrok dengan template ketersediaan guru</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
              <h4 className="text-md font-medium text-gray-800">Template Ketersediaan Guru</h4>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition cursor-pointer">
                  <Upload size={16} />
                  Import Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={importTemplateGuru}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={exportTemplateGuru}
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  <Download size={16} />
                  Export Excel
                </button>
                {masterTeachers.length > 0 && (
                  <button
                    onClick={addTeacherToSchedule}
                    className="flex items-center gap-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition"
                  >
                    <Users size={16} />
                    Tambah Guru ke Template
                  </button>
                )}
              </div>
            </div>

            {masterTeachers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-2 opacity-50" />
                <p>Belum ada data guru. Silakan tambahkan guru di halaman Database - Data Guru.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kode Guru</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nama Guru</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Mata Pelajaran</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tingkat</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Jurusan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Request Hari</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Jam Ke-</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {scheduleTeachers.map((teacher: any, index: any) => {
                      const availableSlots = editableDayTimeSlots[teacher.requestDay] || [];
                      const selectedMasterTeacher = masterTeachers.find((mt: any) => mt.id === teacher.teacherId);
                      return (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                            {selectedMasterTeacher?.kodeGuru || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={teacher.teacherId}
                              onChange={(e) => updateScheduleTeacher(teacher.id, 'teacherId', parseInt(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                            >
                              {masterTeachers.map((mt: any) => (
                                <option key={mt.id} value={mt.id}>{mt.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={teacher.mataPelajaran}
                              onChange={(e) => updateScheduleTeacher(teacher.id, 'mataPelajaran', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                            >
                              <option value="">Pilih mata pelajaran</option>
                              {subjectsList.map((s: any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {["X", "XI", "XII"].map((tingkat) => (
                                <label key={tingkat} className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={teacher.tingkatKelas?.includes(tingkat)}
                                    onChange={() => toggleTingkatKelas(teacher.id, tingkat)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className="text-xs text-gray-600">{tingkat}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {["TKJ", "TKR"].map((jurusan) => (
                                <label key={jurusan} className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={teacher.jurusan?.includes(jurusan)}
                                    onChange={() => toggleJurusan(teacher.id, jurusan)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className="text-xs text-gray-600">{jurusan}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={teacher.requestDay}
                              onChange={(e) => updateScheduleTeacher(teacher.id, 'requestDay', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                            >
                              {days.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {timeSlots.map((slot) => {
                                const isAvailable = availableSlots.includes(slot.no);
                                return (
                                  <label key={slot.no} className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      disabled={!isAvailable}
                                      checked={isAvailable && teacher.jamKe?.includes(slot.no)}
                                      onChange={() => toggleJamKe(teacher.id, slot.no)}
                                      className={`rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${
                                        !isAvailable ? 'opacity-30 cursor-not-allowed' : ''
                                      }`}
                                    />
                                    <span className={`text-xs ${
                                      isAvailable ? 'text-gray-600' : 'text-gray-300'
                                    }`}>{slot.no}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeTeacherFromSchedule(teacher.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="text-md font-medium text-blue-800 mb-3">Alokasi Waktu Jam Pelajaran</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {timeSlots.map((slot) => (
                <div key={slot.no} className="bg-white rounded-lg border border-blue-200 px-4 py-3">
                  <p className="text-xs text-blue-600">Jam Ke-{slot.no}</p>
                  <p className="text-sm font-semibold text-blue-800">{slot.time}</p>
                </div>
              ))}
            </div>
            <h5 className="text-sm font-medium text-blue-700 mb-2">Pengaturan Alokasi Waktu per Hari (klik untuk mengubah)</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {days.map((day) => (
                <div key={day} className="bg-white rounded-lg border border-blue-200 p-3">
                  <h6 className="text-sm font-semibold text-blue-800 mb-2">{day}</h6>
                  <div className="flex flex-wrap gap-1">
                    {timeSlots.map((slot) => {
                      const isActive = editableDayTimeSlots[day]?.includes(slot.no);
                      return (
                        <div
                          key={slot.no}
                          onClick={() => toggleDayTimeSlot(day, slot.no)}
                          className={`px-2 py-1 text-xs rounded cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {slot.no}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Total: {editableDayTimeSlots[day]?.length || 0} jam
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-md font-medium text-gray-800 mb-4">Parameter Pengaturan</h4>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Tahun Ajaran</label>
                <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option>2024/2025</option>
                  <option>2025/2026</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Semester</label>
                <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option>Ganjil</option>
                  <option>Genap</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Prioritas</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-600">Minimalkan jam mengajar beruntun</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-600">Meratakan beban mengajar</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-600">Hindari bentrok jam mengajar</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || scheduleTeachers.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <Sparkles size={20} />
                )}
                {isGenerating ? "Menghasilkan Jadwal..." : "Hasilkan Jadwal Sekarang"}
              </button>
            </div>
          </div>

          {isGenerating && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-md font-medium text-gray-800 mb-4">Proses Generasi</h4>
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index <= generationStep;
                  const isCompleted = index < generationStep;
                  
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted ? "bg-green-500 text-white" :
                        isActive ? "bg-blue-500 text-white animate-pulse" :
                        "bg-gray-200 text-gray-500"
                      }`}>
                        {isCompleted ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                      </div>
                      <span className={`text-sm ${
                        isActive ? "font-medium text-gray-800" : "text-gray-400"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Religious Restrictions Section */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-purple-600" />
              Pembatasan Kegiatan Keagamaan
            </h4>

            {/* Add New Restriction Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hari</label>
                <select
                  value={newRestriction.day}
                  onChange={(e) => setNewRestriction({ ...newRestriction, day: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jam Ke-</label>
                <div className="flex flex-wrap gap-1">
                  {timeSlots.map((slot) => (
                    <label key={slot.no} className="flex items-center gap-1 px-2 py-1 border rounded cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={newRestriction.jamKe.includes(slot.no)}
                        onChange={(e) => {
                          const newJamKe = e.target.checked
                            ? [...newRestriction.jamKe, slot.no]
                            : newRestriction.jamKe.filter(j => j !== slot.no);
                          setNewRestriction({ ...newRestriction, jamKe: newJamKe });
                        }}
                        className="rounded border-gray-300 text-purple-600"
                      />
                      <span className="text-xs">{slot.no}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat Kelas</label>
                <div className="flex flex-wrap gap-1">
                  {['X', 'XI', 'XII'].map((tingkat) => (
                    <label key={tingkat} className="flex items-center gap-1 px-2 py-1 border rounded cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={newRestriction.tingkat.includes(tingkat)}
                        onChange={(e) => {
                          const newTingkat = e.target.checked
                            ? [...newRestriction.tingkat, tingkat]
                            : newRestriction.tingkat.filter(t => t !== tingkat);
                          setNewRestriction({ ...newRestriction, tingkat: newTingkat });
                        }}
                        className="rounded border-gray-300 text-purple-600"
                      />
                      <span className="text-xs">{tingkat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan</label>
                <div className="flex flex-wrap gap-1">
                  {['TKJ', 'TKR'].map((jurusan) => (
                    <label key={jurusan} className="flex items-center gap-1 px-2 py-1 border rounded cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={newRestriction.jurusan.includes(jurusan)}
                        onChange={(e) => {
                          const newJurusan = e.target.checked
                            ? [...newRestriction.jurusan, jurusan]
                            : newRestriction.jurusan.filter(j => j !== jurusan);
                          setNewRestriction({ ...newRestriction, jurusan: newJurusan });
                        }}
                        className="rounded border-gray-300 text-purple-600"
                      />
                      <span className="text-xs">{jurusan}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={newRestriction.keterangan}
                  onChange={(e) => setNewRestriction({ ...newRestriction, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Kegiatan Keagamaan"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={addRestriction}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                  <Plus size={16} />
                  Tambah
                </button>
              </div>
            </div>

            {/* List of Restrictions */}
            {religiousRestrictions.length > 0 && (
              <div className="border-t pt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Daftar Pembatasan:</h5>
                <div className="space-y-2">
                  {religiousRestrictions.map((restriction: any) => (
                    <div
                      key={restriction.id}
                      className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-purple-800">{restriction.keterangan}</span>
                          <span className="text-sm text-gray-600">
                            ({restriction.day}, Jam {restriction.jamKe.join(', ')})
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Kelas: {restriction.kelas.join(', ')}
                        </div>
                      </div>
                      <button
                        onClick={() => removeRestriction(restriction.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {generated && (
            <>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-green-600" size={32} />
                  <div>
                    <h4 className="text-lg font-semibold text-green-800">Jadwal Berhasil Dihasilkan!</h4>
                    <p className="text-sm text-green-600">Tidak ditemukan konflik pada jadwal yang dihasilkan</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h4 className="text-md font-medium text-gray-800">Preview Jadwal Pelajaran</h4>
                  <button onClick={exportJadwal} className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                    <Download size={16} />
                    <span className="text-sm font-medium">Unduh Excel</span>
                  </button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <div className="min-w-[1200px]">
                    {/* Header Jadwal */}
                    <div className="bg-gray-900 text-white py-3 px-4 text-center font-bold text-lg">
                      JADWAL PELAJARAN SMK PACET Tp. 2025 / 2026
                    </div>

                    <table className="w-full border-collapse border border-gray-400">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold w-[60px]">HARI</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold w-[80px]">WAKTU</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold w-[50px]">JAM KE-</th>
                          {/* Kelas X */}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-blue-100" colSpan={3}>X</th>
                          {/* Kelas XI */}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-green-100" colSpan={3}>XI</th>
                          {/* Kelas XII */}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-yellow-100" colSpan={3}>XII</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold w-[120px]">PIKET</th>
                        </tr>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold"></th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold"></th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold"></th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-blue-100">TKR 1</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-blue-100">TKR 2</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-blue-100">TKR 3</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-green-100">TKR 1</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-green-100">TKR 2</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-green-100">TKR 3</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-yellow-100">TKR 1</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-yellow-100">TKR 2</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold bg-yellow-100">TKR 3</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((day, dayIndex) => {
                          const availableSlots = editableDayTimeSlots[day] || [];
                          
                          // Dapatkan guru yang piket hari ini (contoh data)
                          const guruPiket = masterTeachers[dayIndex % masterTeachers.length];
                          
                          return availableSlots.map((slotNo: any, slotIndex: any) => {
                            const slot = timeSlots.find((s: any) => s.no === slotNo);
                            const isFirst = slotIndex === 0;
                            const isIstirahat = slotNo === 4;
                            const isDhuhaprayer = slotNo === 5;
                            const isMorningparade = day === "Senin" && slotNo === 1;

                            return (
                              <tr key={`${day}-${slotNo}`} className={isIstirahat ? "bg-yellow-100" : isDhuhaprayer ? "bg-green-100" : isMorningparade ? "bg-orange-100" : ""}>
                                {isFirst && (
                                  <td rowSpan={availableSlots.length} className="border border-gray-400 px-2 py-1 text-xs font-medium text-center align-top bg-gray-50">
                                    {day.toUpperCase()}
                                  </td>
                                )}
                                <td className="border border-gray-400 px-2 py-1 text-xs text-center">{slot?.time}</td>
                                <td className="border border-gray-400 px-2 py-1 text-xs text-center">{slotNo}</td>

                                {/* Kolom Kelas X TKR 1-3 */}
                                {[1, 2, 3].map((kelasKe) => {
                                  const jadwal = getJadwal(day, slotNo, "X", "TKR", kelasKe);
                                  return (
                                    <td key={`X-TKR-${kelasKe}`} className="border border-gray-400 px-1 py-1 text-xs text-center bg-blue-50">
                                      {jadwal}
                                    </td>
                                  );
                                })}

                                {/* Kolom Kelas XI TKR 1-3 */}
                                {[1, 2, 3].map((kelasKe) => {
                                  const jadwal = getJadwal(day, slotNo, "XI", "TKR", kelasKe);
                                  return (
                                    <td key={`XI-TKR-${kelasKe}`} className="border border-gray-400 px-1 py-1 text-xs text-center bg-green-50">
                                      {jadwal}
                                    </td>
                                  );
                                })}

                                {/* Kolom Kelas XII TKR 1-3 */}
                                {[1, 2, 3].map((kelasKe) => {
                                  const jadwal = getJadwal(day, slotNo, "XII", "TKR", kelasKe);
                                  return (
                                    <td key={`XII-TKR-${kelasKe}`} className="border border-gray-400 px-1 py-1 text-xs text-center bg-yellow-50">
                                      {jadwal}
                                    </td>
                                  );
                                })}

                                {/* Kolom Piket */}
                                {isFirst && (
                                  <td rowSpan={availableSlots.length} className="border border-gray-400 px-2 py-1 text-xs text-center align-top">
                                    {guruPiket?.name}<br/>
                                    <span className="font-mono text-gray-500">{guruPiket?.kodeGuru}</span>
                                  </td>
                                )}
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>

                    {/* Footer Jadwal */}
                    <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p><strong>Kepala SMK Pacet</strong></p>
                        <br/><br/><br/>
                        <p><u>Ir. Junaedi Hartanto, S.Pd</u></p>
                        <p>NIP. -</p>
                      </div>
                      <div className="text-right">
                        <p>Mojokerto, 02 Februari 2026</p>
                        <p><strong>Wakasek Kurikulum</strong></p>
                        <br/><br/><br/>
                        <p><u>Anik Yumari, S.Pd</u></p>
                        <p>NIP. -</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Guru</p>
                  <p className="text-2xl font-bold text-gray-800">{scheduleTeachers.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Jam Mengajar</p>
                  <p className="text-2xl font-bold text-gray-800">{scheduleTeachers.length * 14}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <p className="text-xs text-gray-500 mb-1">Konflik Ditemukan</p>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
