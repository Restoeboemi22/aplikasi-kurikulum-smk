import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getCurriculumCategoryValue,
  getMajorLabel,
} from "@/lib/curriculum-submissions";
import { uploadCurriculumFile } from "@/lib/curriculum-file-storage";
import { requireRole, requireSession } from "@/lib/server-session";

const getCategoryOrThrow = (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const category = getCurriculumCategoryValue(searchParams.get("category") || "");
  if (!category) {
    throw new Error("INVALID_CATEGORY");
  }
  return category;
};

const mapSubmission = (item: any) => ({
  id: item.id,
  teacherId: item.teacherId,
  teacherName: item.teacherName,
  subject: item.subject,
  grade: item.grade,
  major: item.major,
  majorCode: item.majorCode,
  className: item.className,
  tool: item.tool,
  fileName: item.fileName,
  fileMimeType: item.fileMimeType || null,
  fileSize: item.fileSize || null,
  hasStoredFile: Boolean(item.fileUrl),
  status: item.status,
  submissionDate: item.submissionDate,
  verifiedBy: item.verifiedBy || "-",
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const mapActivity = (item: any) => ({
  id: item.id,
  submissionId: item.submissionId,
  teacherName: item.teacherName,
  actorName: item.actorName,
  action: item.action,
  subject: item.subject,
  timestamp: item.timestampLabel,
  type: item.type,
  createdAt: item.createdAt,
});

const buildTeacherScope = (session: ReturnType<typeof requireSession>) =>
  session.role === "ADMIN"
    ? {}
    : {
        teacher: {
          OR: [{ userId: session.uid }, session.nip ? { user: { nip: session.nip } } : undefined].filter(Boolean) as any[],
        },
      };

const parseSubmissionPayload = async (request: NextRequest) => {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const rawFile = formData.get("file");
    const file = rawFile instanceof File ? rawFile : null;

    return {
      teacherId: String(formData.get("teacherId") || "").trim() || null,
      teacherName: String(formData.get("teacherName") || "").trim(),
      subject: String(formData.get("subject") || "").trim(),
      grade: String(formData.get("grade") || "").trim(),
      major: String(formData.get("major") || "").trim(),
      majorCode: String(formData.get("majorCode") || "").trim(),
      className: String(formData.get("className") || "").trim(),
      tool: String(formData.get("tool") || "").trim(),
      file,
      fileName: file?.name?.trim() || "",
    };
  }

  const body = await request.json();
  return {
    teacherId: String(body.teacherId || "").trim() || null,
    teacherName: String(body.teacherName || "").trim(),
    subject: String(body.subject || "").trim(),
    grade: String(body.grade || "").trim(),
    major: String(body.major || "").trim(),
    majorCode: String(body.majorCode || "").trim(),
    className: String(body.className || "").trim(),
    tool: String(body.tool || "").trim(),
    file: null,
    fileName: String(body.fileName || "").trim(),
  };
};

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const category = getCategoryOrThrow(request);
    const teacherScope = buildTeacherScope(session);

    const [submissions, activities] = await Promise.all([
      prisma.curriculumSubmission.findMany({
        where: {
          category,
          ...teacherScope,
        },
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.curriculumActivity.findMany({
        where: {
          category,
          ...(session.role === "ADMIN"
            ? {}
            : {
                OR: [
                  {
                    submission: {
                      teacher: {
                        OR: [{ userId: session.uid }, session.nip ? { user: { nip: session.nip } } : undefined].filter(
                          Boolean
                        ) as any[],
                      },
                    },
                  },
                  { teacherName: session.name },
                ],
              }),
        },
        orderBy: [{ createdAt: "desc" }],
      }),
    ]);

    return NextResponse.json({
      submissions: submissions.map(mapSubmission),
      activities: activities.map(mapActivity),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "INVALID_CATEGORY") {
      return NextResponse.json({ error: "Kategori perangkat tidak valid." }, { status: 400 });
    }
    console.error("Error fetching curriculum submissions:", error);
    return NextResponse.json({ error: "Gagal mengambil data perangkat kurikulum." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const category = getCategoryOrThrow(request);
    const {
      teacherId,
      teacherName,
      subject,
      grade,
      major,
      majorCode,
      className,
      tool,
      file,
      fileName,
    } = await parseSubmissionPayload(request);

    if (!teacherName || !subject || !grade || !majorCode || !className || !tool || !fileName) {
      return NextResponse.json({ error: "Data perangkat wajib diisi lengkap." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "File perangkat wajib diunggah." }, { status: 400 });
    }

    const submissionDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timestampLabel = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const submissionId = randomUUID();
    const uploadedFile = await uploadCurriculumFile({
      file,
      category,
      tool,
      teacherName,
      className,
      submissionId,
    });

    const created = await prisma.$transaction(async (tx) => {
      const submission = await tx.curriculumSubmission.create({
        data: {
          id: submissionId,
          category,
          teacherId,
          teacherName,
          subject,
          grade,
          major: major || getMajorLabel(majorCode),
          majorCode,
          className,
          tool,
          fileName,
          fileUrl: uploadedFile.fileUrl,
          filePath: uploadedFile.filePath,
          fileMimeType: uploadedFile.fileMimeType,
          fileSize: uploadedFile.fileSize,
          storageProvider: uploadedFile.storageProvider,
          status: "Sudah",
          submissionDate,
          verifiedBy: "-",
        },
      });

      const activity = await tx.curriculumActivity.create({
        data: {
          category,
          submissionId: submission.id,
          actorName: session.name,
          teacherName,
          action: `Mengirim ${tool}`,
          subject,
          timestampLabel,
          type: "submit",
        },
      });

      return { submission, activity };
    });

    return NextResponse.json(
      {
        submission: mapSubmission(created.submission),
        activity: mapActivity(created.activity),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "INVALID_CATEGORY") {
      return NextResponse.json({ error: "Kategori perangkat tidak valid." }, { status: 400 });
    }
    if (error instanceof Error) {
      if (
        error.message === "Storage file belum dikonfigurasi. Tambahkan BLOB_READ_WRITE_TOKEN." ||
        error.message === "File harus berformat PDF, DOC, atau DOCX." ||
        error.message === "Ukuran file maksimal 10MB."
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("Error creating curriculum submission:", error);
    return NextResponse.json({ error: "Gagal menyimpan perangkat kurikulum." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const category = getCategoryOrThrow(request);
    const body = await request.json();
    const id = String(body.id || "").trim();
    const action = String(body.action || "").trim();

    if (!id || action !== "verify") {
      return NextResponse.json({ error: "Aksi verifikasi tidak valid." }, { status: 400 });
    }

    const existing = await prisma.curriculumSubmission.findFirst({
      where: {
        id,
        category,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Data perangkat tidak ditemukan." }, { status: 404 });
    }

    const timestampLabel = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated = await prisma.$transaction(async (tx) => {
      const submission = await tx.curriculumSubmission.update({
        where: { id },
        data: {
          status: "Sudah",
          verifiedBy: "Wakasek Kurikulum",
        },
      });

      const activity = await tx.curriculumActivity.create({
        data: {
          category,
          submissionId: submission.id,
          actorName: "Wakasek Kurikulum",
          teacherName: submission.teacherName,
          action: `Memverifikasi ${submission.tool} ${submission.teacherName}`,
          subject: submission.subject,
          timestampLabel,
          type: "verify",
        },
      });

      return { submission, activity };
    });

    return NextResponse.json({
      submission: mapSubmission(updated.submission),
      activity: mapActivity(updated.activity),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh memverifikasi perangkat." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "INVALID_CATEGORY") {
      return NextResponse.json({ error: "Kategori perangkat tidak valid." }, { status: 400 });
    }
    console.error("Error verifying curriculum submission:", error);
    return NextResponse.json({ error: "Gagal memverifikasi perangkat kurikulum." }, { status: 500 });
  }
}
