import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, clips } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectClips = await db.select().from(clips).where(eq(clips.projectId, id));

    return NextResponse.json({
      id: project.id,
      name: project.name,
      originalFilename: project.originalFilename,
      fileSize: project.fileSize.toString(),
      duration: project.duration,
      width: project.width,
      height: project.height,
      targetClipCount: project.targetClipCount,
      status: project.status,
      errorMessage: project.errorMessage,
      createdAt: project.createdAt,
      clips: projectClips.map((clip) => ({
        id: clip.id,
        clipNumber: clip.clipNumber,
        startTime: clip.startTime,
        endTime: clip.endTime,
        subtitleText: clip.subtitleText,
        fileSize: clip.fileSize?.toString(),
        status: clip.status,
        duration: (clip.endTime - clip.startTime) / 1000,
      })),
    });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Failed to get project" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.delete(projects).where(eq(projects.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
