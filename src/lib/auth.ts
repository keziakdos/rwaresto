import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import type { NextRequest } from "next/server";
import { prisma } from "./db";
import { SESSION_COOKIE } from "./constants";
import bcrypt from "bcryptjs";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "cashier";
  mustChangePassword: boolean;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("SESSION_SECRET doit contenir au moins 24 caractères.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(user: { id: string; sessionVersion: number }): string {
  const payload = Buffer.from(
    JSON.stringify({
      uid: user.id,
      sv: user.sessionVersion,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function parseSessionToken(token: string): { uid: string; sv: number; exp: number } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.uid || typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

async function loadSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const data = parseSessionToken(token);
  if (!data) return null;
  const user = await prisma.user.findUnique({ where: { id: data.uid } });
  if (!user || !user.active || user.sessionVersion !== data.sv) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role === "admin" ? "admin" : "cashier",
    mustChangePassword: user.mustChangePassword,
  };
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  return loadSessionUser(store.get(SESSION_COOKIE)?.value);
});

export async function getRequestUser(request: NextRequest): Promise<SessionUser | null> {
  return loadSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(user: { id: string; sessionVersion: number }) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireRole(user: SessionUser | null, roles: SessionUser["role"][]): boolean {
  return Boolean(user && roles.includes(user.role));
}
