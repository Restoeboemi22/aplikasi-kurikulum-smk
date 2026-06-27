import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ["pdf", "doc", "docx"];

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex + 1) : "";
}

export function validateCurriculumUpload(file: File) {
  const extension = getFileExtension(file.name);
  if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
    throw new Error("File harus berformat PDF, DOC, atau DOCX.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Ukuran file maksimal 10MB.");
  }
}

export function ensureCurriculumStorageConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Storage file belum dikonfigurasi. Tambahkan BLOB_READ_WRITE_TOKEN.");
  }
}

export async function uploadCurriculumFile(params: {
  file: File;
  category: string;
  tool: string;
  teacherName: string;
  className: string;
  submissionId: string;
}) {
  const { file, category, tool, teacherName, className, submissionId } = params;
  validateCurriculumUpload(file);
  ensureCurriculumStorageConfigured();

  const extension = getFileExtension(file.name);
  const filePath = [
    "curriculum-submissions",
    sanitizeSegment(category) || "general",
    sanitizeSegment(tool) || "dokumen",
    sanitizeSegment(teacherName) || "guru",
    sanitizeSegment(className) || "kelas",
    `${submissionId}.${extension || "bin"}`,
  ].join("/");

  const blob = await put(filePath, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type || undefined,
  });

  return {
    fileUrl: blob.url,
    filePath,
    fileMimeType: file.type || null,
    fileSize: file.size,
    storageProvider: "vercel-blob",
  };
}
