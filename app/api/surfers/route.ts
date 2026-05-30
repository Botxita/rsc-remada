import { NextRequest, NextResponse } from "next/server";
import { addSurfer } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const surfer = await addSurfer(name.trim());
  return NextResponse.json(surfer);
}
