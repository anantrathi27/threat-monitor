import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

async function proxy(req: NextRequest, path: string) {
  const url = `${BACKEND}/api${path}`;
  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  headers.set("content-type", "application/json");

  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.text()
    : undefined;

  const res = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(req: NextRequest) {
  return proxy(req, "/threats");
}

export async function POST(req: NextRequest) {
  return proxy(req, "/threats");
}
