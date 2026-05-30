import { NextRequest, NextResponse } from "next/server";
import { setTime } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { surferName, sessionName, time } = await req.json();
  if (!surferName || !sessionName) {
    return NextResponse.json({ error: "surferName and sessionName required" }, { status: 400 });
  }
  await setTime(surferName, sessionName, time ?? null);
  return NextResponse.json({ ok: true });
}
