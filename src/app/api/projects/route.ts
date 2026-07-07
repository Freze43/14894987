import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { writeFile } from "fs/promises";
import { ensureDirectories, getUploadPath } from "@/lib/storage";
import { processVideo } from "@/lib/processor";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));

    return NextResponse.json(
      allProjects.map((p) => ({
        id: p.id,
        name: p.name,
        originalFilename: p.originalFilename,
        fileSize: p.fileSize.toString(),
        duration: p.duration,
        width: p.width,
        height: p.height,
        targetClipCount: p.targetClipCount,
        status: p.status,
        errorMessage: p.errorMessage,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    console.error("List projects error:", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories();

    const formData = await request.formData();
    const file = formData.get("video") as File | null;
    const projectName = formData.get("name") as string | null;
    const clipCountStr = formData.get("clipCount") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".mp4") && !file.type.includes("video")) {
      return NextResponse.json({ error: "Only .mp4 video files are supported" }, { status: 400 });
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 500MB limit" }, { status: 400 });
    }

    const clipCount = Math.min(Math.max(parseInt(clipCountStr || "5") || 5, 1), 15);
    const name = projectName?.trim() || file.name.replace(/\.[^/.]+$/, "");

    const fileId = uuidv4();
    const ext = file.name.split(".").pop() || "mp4";
    const filename = `${fileId}.${ext}`;
    const filePath = getUploadPath(filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const [project] = await db
      .insert(projects)
      .values({
        name,
        originalFilename: file.name,
        filePath,
        fileSize: BigInt(file.size),
        targetClipCount: clipCount,
        status: "uploaded",
      })
      .returning();

    processVideo(project.id).catch((err) => {
      console.error("Background processing error:", err);
    });

    return NextResponse.json(
      {
        id: project.id,
        name: project.name,
        status: project.status,
        targetClipCount: project.targetClipCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
