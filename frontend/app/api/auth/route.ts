import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path?.join("/") || "";
  const body = await req.text();
  const res = await fetch(`${BACKEND}/api/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
