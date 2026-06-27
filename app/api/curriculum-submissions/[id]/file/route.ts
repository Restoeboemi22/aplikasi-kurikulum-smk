import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/server-session";

const teacherScopeFilter = (session: ReturnType<typeof requireSession>) =>
  session.role === "ADMIN"
    ? {}
    : {
        teacher: {
          OR: [{ userId: session.uid }, session.nip ? { user: { nip: session.nip } } : undefined].filter(Boolean) as any[],
        },
      };

function buildContentDisposition(fileName: string, mode: string) {
  const disposition = mode === "inline" ? "inline" : "attachment";
  const safeFileName = fileName.replace(/"/g, "");
  return `${disposition}; filename="${safeFileName}"`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request);
    const id = (await context.params).id.trim();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("disposition") || "attachment";

    if (!id) {
      return NextResponse.json({ error: "ID submission tidak valid." }, { status: 400 });
    }

    const submission = await prisma.curriculumSubmission.findFirst({
      where: {
        id,
        ...teacherScopeFilter(session),
      },
      select: {
        fileName: true,
        fileUrl: true,
        filePath: true,
        fileMimeType: true,
        fileSize: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "File perangkat tidak ditemukan." }, { status: 404 });
    }

    if (!submission.fileUrl) {
      return NextResponse.json({ error: "Submission ini belum memiliki file tersimpan." }, { status: 404 });
    }

    const privateBlob = submission.filePath
      ? await get(submission.filePath, {
          access: "private",
        })
      : null;

    if (privateBlob?.stream) {
      const headers = new Headers({
        "Content-Type": submission.fileMimeType || privateBlob.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": buildContentDisposition(submission.fileName, mode),
        "Cache-Control": "private, no-store, max-age=0",
      });

      const contentLength = String(submission.fileSize || privateBlob.headers.get("content-length") || "").trim();
      if (contentLength) {
        headers.set("Content-Length", contentLength);
      }

      return new NextResponse(privateBlob.stream, {
        status: 200,
        headers,
      });
    }

    const blobResponse = await fetch(submission.fileUrl, {
      cache: "no-store",
    });

    if (!blobResponse.ok || !blobResponse.body) {
      return NextResponse.json({ error: "File perangkat gagal diambil dari storage." }, { status: 502 });
    }

    const headers = new Headers({
      "Content-Type": submission.fileMimeType || blobResponse.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": buildContentDisposition(submission.fileName, mode),
      "Cache-Control": "private, no-store, max-age=0",
    });

    const contentLength = String(submission.fileSize || blobResponse.headers.get("content-length") || "").trim();
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(blobResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error fetching curriculum submission file:", error);
    return NextResponse.json({ error: "Gagal mengambil file perangkat." }, { status: 500 });
  }
}
