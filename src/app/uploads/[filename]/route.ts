import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.webp$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!SAFE_FILENAME.test(filename) || filename.includes("..")) {
    return new NextResponse("Introuvable", { status: 404 });
  }

  const configured = process.env.UPLOAD_DIR || path.join("public", "uploads");
  const uploadDir = path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
  const filepath = path.join(uploadDir, filename);

  try {
    const file = await readFile(filepath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(file.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Introuvable", { status: 404 });
  }
}
