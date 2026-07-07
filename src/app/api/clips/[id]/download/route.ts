import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clips, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readFile, stat } from "fs/promises";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [clip] = await db.select().from(clips).where(eq(clips.id, id));
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    if (!clip.filePath || !existsSync(clip.filePath)) {
      return NextResponse.json({ error: "Clip file not found" }, { status: 404 });
    }

    // Get project name for download filename
    const [project] = await db.select().from(projects).where(eq(projects.id, clip.projectId));
    const baseName = project?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "clip";
    const downloadName = `${baseName}_clip${clip.clipNumber}.mp4`;

    const fileBuffer = await readFile(clip.filePath);
    const fileStat = await stat(clip.filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": fileStat.size.toString(),
      },
    });
  } catch (error) {
    console.error("Download clip error:", error);
    return NextResponse.json({ error: "Failed to download clip" }, { status: 500 });
  }
}
