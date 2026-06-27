"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCw, Download, CheckCircle2, AlertCircle, Calendar, Users, Trash2, Clock, Upload, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import {
  AI_SCHEDULE_DAYS as days,
  AI_SCHEDULE_TIME_SLOTS as timeSlots,
  DEFAULT_AI_PRIORITIES,
  DEFAULT_DAY_TIME_SLOTS,
  getDefaultAcademicYear,
} from "@/lib/ai-schedule";

const splitCsv = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueValues = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

export default function AISchedulePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [masterTeachers, setMasterTeachers] = useState<any[]>([]);
  const majorOptions = useMemo(
    () =>
      Array.from(
        new Map(
          classes
            .filter((item: any) => item?.majorCode)
            .map((item: any) => [
              String(item.majorCode).trim(),
              {
                code: String(item.majorCode).trim(),
                label: String(item.majorName || item.majorCode).trim(),
              },
            ])
        ).values()
      ),
    [classes]
  );
  const majorLabelByCode = useMemo(
    () =>
      new Map(
        majorOptions.map((option: { code: string; label: string }) => [option.code.toLowerCase(), option.label])
      ),
    [majorOptions]
  );
  const majorCodeByLabel = useMemo(
    () =>
      new Map(
        majorOptions.flatMap((option: { code: string; label: string }) => [
          [option.code.toLowerCase(), option.code],
          [option.label.toLowerCase(), option.code],
        ])
      ),
    [majorOptions]
  );
  const scheduleClassColumns = useMemo(
    () =>
      [...classes]
        .filter((item: any) => item?.className && item?.grade && item?.majorCode)
        .sort((a: any, b: any) => {
          const gradeOrder = ["X", "XI", "XII"];
          const gradeDiff = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
          if (gradeDiff !== 0) return gradeDiff;
          return String(a.className).localeCompare(String(b.className), "id");
        }),
    [classes]
  );
  const classColumnsByGrade = useMemo(
    () =>
      ["X", "XI", "XII"].map((grade) => ({
        grade,
        items: scheduleClassColumns.filter((item: any) => item.grade === grade),
      })),
    [scheduleClassColumns]
  );

  const normalizeJurusanValues = (values: unknown) =>
    uniqueValues(
      (Array.isArray(values) ? values : splitCsv(values))
        .map((item) => String(item).trim())
        .map((item) => majorCodeByLabel.get(item.toLowerCase()) || item)
    );

  const getMajorLabel = (code: string) => majorLabelByCode.get(String(code).toLowerCase()) || code;
  const getClassColumnLabel = (classItem: any) =>
    String(classItem.className || "")
      .replace(new RegExp(`^${String(classItem.grade || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`), "")
      .trim() || String(classItem.className || "");
  const getGradeHeaderClass = (grade: string) =>
    grade === "X" ? "bg-blue-100" : grade === "XI" ? "bg-green-100" : "bg-yellow-100";
  const getGradeCellClass = (grade: string) =>
    grade === "X" ? "bg-blue-50" : grade === "XI" ? "bg-green-50" : "bg-yellow-50";

  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [semester, setSemester] = useState("Ganjil");
  const [scheduleTeachers, setScheduleTeachers] = useState<any[]>([]);

  const [generated, setGenerated] = useState(false);
  const [editableDayTimeSlots, setEditableDayTimeSlots] = useState(DEFAULT_DAY_TIME_SLOTS);
  const [religiousRestrictions, setReligiousRestrictions] = useState<any[]>([]);
  const [priorities, setPriorities] = useState(DEFAULT_AI_PRIORITIES);

  const findMasterTeacher = (teacherRef: any) => {
    const teacherId = String(teacherRef?.teacherId || "").trim();
    const teacherName = String(teacherRef?.name || "").trim().toLowerCase();
    const teacherCode = String(teacherRef?.kodeGuru || "").trim().toLowerCase();

    return (
      masterTeachers.find((teacher: any) => String(teacher.id) === teacherId) ||
      masterTeachers.find((teacher: any) => String(teacher.name || "").trim().toLowerCase() === teacherName) ||
      masterTeachers.find((teacher: any) => String(teacher.kodeGuru || "").trim().toLowerCase() === teacherCode) ||
      null
    );
  };

  const normalizeScheduleTeacher = (teacher: any, index = 0) => {
    const matchedTeacher = findMasterTeacher(teacher);

    const rawAssignments = Array.isArray(matchedTeacher?.teachingAssignments)
      ? matchedTeacher.teachingAssignments
      : [];
    const assignmentSubjects = uniqueValues(
      rawAssignments.map((assignment: any) => String(assignment.subject || "").trim()).filter(Boolean)
    );
    const assignmentLevels = uniqueValues(
      rawAssignments.map((assignment: any) => String(assignment.classLevel || "").trim()).filter(Boolean)
    );
    const assignmentMajors = uniqueValues(
      rawAssignments.map((assignment: any) => String(assignment.majorCode || "").trim()).filter(Boolean)
    );

    const fallbackSubjects = Array.isArray(matchedTeacher?.mataPelajaran)
      ? matchedTeacher.mataPelajaran.map((item: string) => item.trim()).filter(Boolean)
      : splitCsv(matchedTeacher?.mataPelajaran || teacher?.mataPelajaran);
    const fallbackLevels = Array.isArray(matchedTeacher?.tingkatKelas)
      ? matchedTeacher.tingkatKelas.map((item: string) => item.trim()).filter(Boolean)
      : splitCsv(matchedTeacher?.tingkatKelas || teacher?.tingkatKelas);
    const fallbackMajors = Array.isArray(matchedTeacher?.jurusan)
      ? matchedTeacher.jurusan.map((item: string) => item.trim()).filter(Boolean)
      : splitCsv(matchedTeacher?.jurusan || teacher?.jurusan);

    return {
      id: teacher?.id ?? Date.now() + index,
      teacherId: matchedTeacher ? String(matchedTeacher.id) : String(teacher?.teacherId || ""),
      name: matchedTeacher?.name || teacher?.name || "",
      kodeGuru: matchedTeacher?.kodeGuru || teacher?.kodeGuru || "",
      mataPelajaran:
        teacher?.mataPelajaran ||
        assignmentSubjects[0] ||
        fallbackSubjects[0] ||
        "",
      tingkatKelas: uniqueValues(
        Array.isArray(teacher?.tingkatKelas) && teacher.tingkatKelas.length > 0
          ? teacher.tingkatKelas.map((item: string) => String(item).trim()).filter(Boolean)
          : assignmentLevels.length > 0
          ? assignmentLevels
          : fallbackLevels
      ),
      jurusan: uniqueValues(
        Array.isArray(teacher?.jurusan) && teacher.jurusan.length > 0
          ? normalizeJurusanValues(teacher.jurusan)
          : assignmentMajors.length > 0
          ? assignmentMajors
          : normalizeJurusanValues(fallbackMajors)
      ),
      requestDay: teacher?.requestDay || "Senin",
      jamKe: Array.isArray(teacher?.jamKe)
        ? teacher.jamKe.map((item: any) => Number(item)).filter((item: number) => !Number.isNaN(item))
        : [],
    };
  };

  // State for new restriction form
  const [newRestriction, setNewRestriction] = useState({
    day: 'Senin',
    jamKe: [1, 2],
    tingkat: ['X'],
    jurusan: [] as string[],
    keterangan: 'Kegiatan Keagamaan'
  });

  useEffect(() => {
    let cancelled = false;

    const loadMasterData = async () => {
      try {
        const [subjectsRes, classesRes, teachersRes, configRes] = await Promise.all([
          fetch("/api/subjects", { cache: "no-store" }),
          fetch("/api/class-majors", { cache: "no-store" }),
          fetch("/api/teachers", { cache: "no-store" }),
          fetch("/api/ai-schedule-config", { cache: "no-store" }),
        ]);

        const [subjectsData, classesData, teachersData, configData] = await Promise.all([
          subjectsRes.json().catch(() => []),
          classesRes.json().catch(() => []),
          teachersRes.json().catch(() => []),
          configRes.json().catch(() => null),
        ]);

        if (!cancelled) {
          setSubjectsList(
            Array.isArray(subjectsData) ? subjectsData.map((subject: any) => subject.name).filter(Boolean) : []
          );
          setClasses(Array.isArray(classesData) ? classesData : []);
          setMasterTeachers(Array.isArray(teachersData) ? teachersData : []);
          setAcademicYear(String(configData?.academicYear || getDefaultAcademicYear()));
          setSemester(String(configData?.semester || "Ganjil"));
          setScheduleTeachers(Array.isArray(configData?.scheduleTeachers) ? configData.scheduleTeachers : []);
          setEditableDayTimeSlots(configData?.editableDayTimeSlots || DEFAULT_DAY_TIME_SLOTS);
          setReligiousRestrictions(Array.isArray(configData?.religiousRestrictions) ? configData.religiousRestrictions : []);
          setPriorities(configData?.priorities || DEFAULT_AI_PRIORITIES);
          setConfigLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSubjectsList([]);
          setClasses([]);
          setMasterTeachers([]);
          setAcademicYear(getDefaultAcademicYear());
          setSemester("Ganjil");
          setScheduleTeachers([]);
          setEditableDayTimeSlots(DEFAULT_DAY_TIME_SLOTS);
          setReligiousRestrictions([]);
          setPriorities(DEFAULT_AI_PRIORITIES);
          setConfigLoaded(true);
        }
      }
    };

    loadMasterData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!configLoaded) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        await fetch("/api/ai-schedule-config", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            academicYear,
            semester,
            scheduleTeachers,
            editableDayTimeSlots,
            religiousRestrictions,
            priorities,
          }),
        });
      } catch (error) {
        console.error("Gagal menyimpan konfigurasi Jadwal AI:", error);
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    academicYear,
    semester,
    scheduleTeachers,
    editableDayTimeSlots,
    religiousRestrictions,
    priorities,
    configLoaded,
  ]);

  useEffect(() => {
    if (masterTeachers.length === 0 && classes.length === 0) return;

    setScheduleTeachers((prev: any[]) =>
      prev.map((teacher, index) => normalizeScheduleTeacher(teacher, index))
    );
  }, [masterTeachers, classes]);

  useEffect(() => {
    if (majorOptions.length === 0) return;

    setNewRestriction((prev) => {
      const filteredJurusan = prev.jurusan.filter((jurusan) =>
        majorOptions.some((option: { code: string }) => option.code === jurusan)
      );
      if (filteredJurusan.length > 0) {
        return { ...prev, jurusan: filteredJurusan };
      }
      return { ...prev, jurusan: [majorOptions[0].code] };
    });
  }, [majorOptions]);

  const addRestriction = () => {
    if (newRestriction.jamKe.length === 0 || newRestriction.tingkat.length === 0 || newRestriction.jurusan.length === 0) {
      alert('Mohon pilih jam, tingkat, dan jurusan terlebih dahulu!');
      return;
    }
    
    const kelasList = scheduleClassColumns
      .filter(
        (item: any) =>
          newRestriction.tingkat.includes(String(item.grade)) &&
          newRestriction.jurusan.includes(String(item.majorCode))
      )
      .map((item: any) => String(item.className));

    if (kelasList.length === 0) {
      alert("Belum ada kombinasi kelas yang cocok di menu Kelas-Jurusan.");
      return;
    }
    
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

  const getScheduleCellData = (day: string, slotNo: number, classItem: any) => {
    const kelasName = String(classItem.className);
    const tingkat = String(classItem.grade);
    const jurusan = String(classItem.majorCode);

    const restriction = religiousRestrictions.find((r: any) =>
      r.day === day && 
      r.jamKe.includes(slotNo) && 
      r.kelas.includes(kelasName)
    );
    if (restriction) {
      return {
        type: "restriction",
        label: String(restriction.keterangan),
      };
    }
    
    if (slotNo === 4) return { type: "special", label: "ISTIRAHAT" };
    if (slotNo === 5) return { type: "special", label: "DHUHA PRAYER" };
    if (day === "Senin" && slotNo === 1) return { type: "special", label: "MORNING PARADE" };

    const guruMengajar = scheduleTeachers.find((teacher: any) =>
      teacher.requestDay === day && 
      teacher.jamKe?.includes(slotNo) &&
      teacher.tingkatKelas?.includes(tingkat) &&
      teacher.jurusan?.includes(jurusan)
    );

    if (guruMengajar) {
      const guruData = masterTeachers.find((mt: any) => mt.id === guruMengajar.teacherId);
      return {
        type: "teacher",
        kodeGuru: String(guruData?.kodeGuru || guruMengajar.teacherId || "-"),
        mataPelajaran: String(guruMengajar.mataPelajaran || ""),
        label: `${guruData?.kodeGuru || guruMengajar.teacherId} - ${guruMengajar.mataPelajaran || ""}`,
      };
    }

    return { type: "empty", label: "-" };
  };

  const getJadwal = (day: string, slotNo: number, classItem: any) => {
    const cell = getScheduleCellData(day, slotNo, classItem);
    if (cell.type === "restriction") {
      return <strong className="text-purple-700">{cell.label}</strong>;
    }
    if (cell.type === "special") {
      return <strong>{cell.label}</strong>;
    }
    if (cell.type === "teacher") {
      return (
        <>
          <div className="font-semibold text-blue-700">{cell.kodeGuru}</div>
          <div className="text-gray-600">{cell.mataPelajaran}</div>
        </>
      );
    }

    return <span className="text-gray-400">-</span>;
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
    setScheduleTeachers([
      ...scheduleTeachers,
      normalizeScheduleTeacher(
        {
          id: newId,
          teacherId: String(firstMasterTeacher.id),
          name: firstMasterTeacher.name,
          kodeGuru: firstMasterTeacher.kodeGuru,
          mataPelajaran: firstMasterTeacher.mataPelajaran,
          tingkatKelas: [...(firstMasterTeacher.tingkatKelas || [])],
          jurusan: [...(firstMasterTeacher.jurusan || [])],
          requestDay: "Senin",
          jamKe: [],
        },
        newId
      ),
    ]);
  };

  const removeTeacherFromSchedule = (id: any) => {
    setScheduleTeachers(scheduleTeachers.filter((t: any) => t.id !== id));
  };

  const updateScheduleTeacher = (id: any, field: any, value: any) => {
    setScheduleTeachers(scheduleTeachers.map((t: any) => {
      if (t.id !== id) return t;
      if (field === 'teacherId') {
        const selectedTeacher = masterTeachers.find((mt: any) => String(mt.id) === String(value));
        if (selectedTeacher) {
          return normalizeScheduleTeacher({
            ...t,
            teacherId: String(value),
            name: selectedTeacher.name,
            kodeGuru: selectedTeacher.kodeGuru,
            mataPelajaran: selectedTeacher.mataPelajaran,
            tingkatKelas: [...(selectedTeacher.tingkatKelas || [])],
            jurusan: [...(selectedTeacher.jurusan || [])]
          });
        }
      }
      return normalizeScheduleTeacher({ ...t, [field]: value });
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
        "Jurusan": teacher.jurusan?.map((jurusan: string) => getMajorLabel(jurusan)).join(", ") || "",
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
        const matchingTeacher =
          masterTeachers.find((mt: any) => String(mt.name || "").trim() === String(row["Nama Guru"] || "").trim()) ||
          masterTeachers.find((mt: any) => String(mt.kodeGuru || "").trim() === String(row["Kode Guru"] || "").trim());

        return normalizeScheduleTeacher({
          id: Date.now() + index,
          teacherId: matchingTeacher ? String(matchingTeacher.id) : "",
          name: row["Nama Guru"] || "",
          kodeGuru: row["Kode Guru"] || matchingTeacher?.kodeGuru || "",
          mataPelajaran: row["Mata Pelajaran"] || "",
          tingkatKelas: row["Tingkat Kelas"]?.split(", ")?.filter((t: any) => t) || [],
          jurusan: normalizeJurusanValues(row["Jurusan"]?.split(", ")?.filter((j: any) => j) || []),
          requestDay: row["Request Hari"] || "Senin",
          jamKe: row["Jam Ke-"]?.split(", ")?.map((j: any) => parseInt(j.trim()))?.filter((j: any) => !isNaN(j)) || []
        }, index);
      }).filter((t: any) => t.name);

      setScheduleTeachers([...scheduleTeachers, ...importedTeachers]);
    };
    reader.readAsArrayBuffer(file);
  };

  const exportJadwal = async () => {
    try {
      const wb = XLSX.utils.book_new();
      const jadwalData: any[] = [];
      const headerRow = ["HARI", "WAKTU", "JAM KE-"];
      classColumnsByGrade.forEach(({ grade, items }) => {
        if (items.length === 0) return;
        items.forEach((item, index) => {
          headerRow.push(index === 0 ? grade : "");
        });
      });
      headerRow.push("PIKET");

      const classHeaderRow = ["", "", ""];
      scheduleClassColumns.forEach((item: any) => {
        classHeaderRow.push(getClassColumnLabel(item));
      });
      classHeaderRow.push("");

      jadwalData.push([`JADWAL PELAJARAN SMK PACET Tp. ${academicYear}`]);
      jadwalData.push([]);
      jadwalData.push(headerRow);
      jadwalData.push(classHeaderRow);

      days.forEach((day, dayIndex) => {
        const availableSlots = editableDayTimeSlots[day] || [];
        const guruPiket = masterTeachers[dayIndex % masterTeachers.length];

        availableSlots.forEach((slotNo: any, slotIndex: any) => {
          const slot = timeSlots.find((s: any) => s.no === slotNo);
          const isFirst = slotIndex === 0;
          const isIstirahat = slotNo === 4;
          const isDhuhaprayer = slotNo === 5;
          const isMorningparade = day === "Senin" && slotNo === 1;

          const row = [
            isFirst ? day.toUpperCase() : "",
            slot?.time || "",
            slotNo,
            ...scheduleClassColumns.map((classItem: any) => {
              const content = getScheduleCellData(day, slotNo, classItem);
              return content.label;
            }),
            isFirst ? `${guruPiket?.name} (${guruPiket?.kodeGuru})` : ""
          ];
          jadwalData.push(row);
        });

        jadwalData.push([]);
      });

      jadwalData.push([]);
      jadwalData.push(["Kepala SMK Pacet", "", "", ...Array(scheduleClassColumns.length - 1).fill(""), "Mojokerto, 02 Februari 2026"]);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push(["Ir. Junaedi Hartanto, S.Pd", "", "", ...Array(scheduleClassColumns.length - 1).fill(""), "Wakasek Kurikulum"]);
      jadwalData.push(["NIP. -", "", "", ...Array(scheduleClassColumns.length).fill(""), ""]);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push([]);
      jadwalData.push(["", "", "", ...Array(scheduleClassColumns.length - 1).fill(""), "Anik Yumari, S.Pd"]);
      jadwalData.push(["", "", "", ...Array(scheduleClassColumns.length - 1).fill(""), "NIP. -"]);

      const ws = XLSX.utils.aoa_to_sheet(jadwalData);
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');

      const templateData = scheduleTeachers.map((teacher: any) => {
        const guruData = masterTeachers.find((mt: any) => mt.id === teacher.teacherId) || teacher;
        return {
          'Kode Guru': guruData.kodeGuru || "",
          'Nama Guru': guruData.name,
          'Mata Pelajaran': teacher.mataPelajaran,
          'Tingkat Kelas': teacher.tingkatKelas?.join(", ") || "",
          'Jurusan': teacher.jurusan?.map((jurusan: string) => getMajorLabel(jurusan)).join(", ") || "",
          'Request Hari': teacher.requestDay,
          'Jam Ke-': teacher.jamKe?.join(", ") || ""
        };
      });
      const wsTemplate = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Guru');

      XLSX.writeFile(wb, `Jadwal_Pelajaran_SMK_PACET_${academicYear.replace("/", "_")}.xlsx`);
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
                      const selectedMasterTeacher = findMasterTeacher(teacher);
                      return (
                        <tr key={teacher.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                            {selectedMasterTeacher?.kodeGuru || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={teacher.teacherId}
                              onChange={(e) => updateScheduleTeacher(teacher.id, 'teacherId', e.target.value)}
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
                              {majorOptions.map((jurusan: { code: string; label: string }) => (
                                <label key={jurusan.code} className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={teacher.jurusan?.includes(jurusan.code)}
                                    onChange={() => toggleJurusan(teacher.id, jurusan.code)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className="text-xs text-gray-600">{jurusan.label}</span>
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
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="Contoh: 2024/2025"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500">
                  Isi manual sesuai kebutuhan, misalnya `2024/2025` sampai `2040/2041`.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Prioritas</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={priorities.minimizeConsecutive}
                      onChange={(e) => setPriorities((prev) => ({ ...prev, minimizeConsecutive: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600">Minimalkan jam mengajar beruntun</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={priorities.balanceLoad}
                      onChange={(e) => setPriorities((prev) => ({ ...prev, balanceLoad: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600">Meratakan beban mengajar</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={priorities.avoidConflicts}
                      onChange={(e) => setPriorities((prev) => ({ ...prev, avoidConflicts: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
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
                  {majorOptions.map((jurusan: { code: string; label: string }) => (
                    <label key={jurusan.code} className="flex items-center gap-1 px-2 py-1 border rounded cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={newRestriction.jurusan.includes(jurusan.code)}
                        onChange={(e) => {
                          const newJurusan = e.target.checked
                            ? [...newRestriction.jurusan, jurusan.code]
                            : newRestriction.jurusan.filter(j => j !== jurusan.code);
                          setNewRestriction({ ...newRestriction, jurusan: newJurusan });
                        }}
                        className="rounded border-gray-300 text-purple-600"
                      />
                      <span className="text-xs">{jurusan.label}</span>
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
                    <div className="bg-gray-900 text-white py-3 px-4 text-center font-bold text-lg">
                      {`JADWAL PELAJARAN SMK PACET Tp. ${academicYear}`}
                    </div>

                    <table className="w-full border-collapse border border-gray-400">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold w-[60px]">HARI</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold w-[80px]">WAKTU</th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold w-[50px]">JAM KE-</th>
                          {classColumnsByGrade.map(({ grade, items }) =>
                            items.length > 0 ? (
                              <th
                                key={grade}
                                className={`border border-gray-400 px-2 py-1 text-xs font-semibold ${getGradeHeaderClass(grade)}`}
                                colSpan={items.length}
                              >
                                {grade}
                              </th>
                            ) : null
                          )}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold w-[120px]">PIKET</th>
                        </tr>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold"></th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold"></th>
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold"></th>
                          {scheduleClassColumns.map((classItem: any) => (
                            <th
                              key={classItem.id || classItem.className}
                              className={`border border-gray-400 px-2 py-1 text-xs font-semibold ${getGradeHeaderClass(String(classItem.grade))}`}
                            >
                              {getClassColumnLabel(classItem)}
                            </th>
                          ))}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((day, dayIndex) => {
                          const availableSlots = editableDayTimeSlots[day] || [];
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
                                {scheduleClassColumns.map((classItem: any) => (
                                  <td
                                    key={`${classItem.id || classItem.className}-${slotNo}`}
                                    className={`border border-gray-400 px-1 py-1 text-xs text-center ${getGradeCellClass(String(classItem.grade))}`}
                                  >
                                    {getJadwal(day, slotNo, classItem)}
                                  </td>
                                ))}
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
