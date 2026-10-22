import { NextRequest } from "next/server";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { apiError, assertSameOrigin, handleApiError, json } from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;

    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind") === "logo" ? "logo" : "product";
    if (!(file instanceof File)) return apiError("Aucun fichier reçu.", 422);
    if (file.size > MAX_SIZE) {
      return apiError("Photo trop volumineuse (8 Mo maximum).", 413);
    }
    if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/i.test(file.type)) {
      return apiError("Format non supporté. Utilisez JPG, PNG, WebP ou HEIC.", 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let pipeline = sharp(buffer).rotate();
    pipeline = kind === "logo"
      ? pipeline.resize(600, 600, { fit: "cover" })
      : pipeline.resize(1200, 900, { fit: "cover" });

    const webp = await pipeline.webp({ quality: 84 }).toBuffer();
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.webp`;

    const configured = process.env.UPLOAD_DIR || path.join("public", "uploads");
    const uploadDir = path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), webp);

    const url = `/uploads/${filename}`;
    await audit({
      actorId: auth.user.id,
      action: "image.uploaded",
      entityType: "image",
      entityId: filename,
      details: { url, kind, size: webp.length },
    });
    return json({ url, size: webp.length }, 201);
  } catch (error) {
    if ((error as Error).message?.includes("Input buffer")) {
      return apiError("Image illisible ou corrompue.", 422);
    }
    return handleApiError(error);
  }
}
