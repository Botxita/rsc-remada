import { NextRequest, NextResponse } from "next/server";
import { addSession } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const session = await addSession(name.trim());
  return NextResponse.json(session);
}
