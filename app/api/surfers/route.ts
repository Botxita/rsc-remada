import { NextRequest, NextResponse } from "next/server";
import { addSurfer, deleteSurfer, renameSurfer } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const surfer = await addSurfer(name.trim());
  return NextResponse.json(surfer);
}

export async function DELETE(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  await deleteSurfer(name.trim());
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { oldName, newName } = await req.json();
  if (!oldName?.trim() || !newName?.trim()) return NextResponse.json({ error: "Names required" }, { status: 400 });
  await renameSurfer(oldName.trim(), newName.trim());
  return NextResponse.json({ ok: true });
}
