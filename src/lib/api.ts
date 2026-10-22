import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: apiError("Corps de requête invalide.", 400) };
  }
  try {
    return { ok: true, data: schema.parse(body) };
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message || "Données invalides."
        : "Données invalides.";
    return { ok: false, response: apiError(message, 422, error instanceof ZodError ? error.issues : undefined) };
  }
}

export function handleApiError(error: unknown) {
  console.error(error);
  return apiError("Une erreur interne est survenue.", 500);
}
