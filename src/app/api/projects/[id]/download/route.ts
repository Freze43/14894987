import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clips, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { existsSync } from "fs";
import { ZipArchive } from "archiver";

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
    const completedClips = projectClips.filter(
      (c) => c.status === "completed" && c.filePath && existsSync(c.filePath)
    );

    if (completedClips.length === 0) {
      return NextResponse.json({ error: "No clips available for download" }, { status: 404 });
    }

    const baseName = project.name.replace(/[^a-zA-Z0-9]/g, "_") || "clips";

    const archive = new ZipArchive({ zlib: { level: 5 } });
    const chunks: Uint8Array[] = [];

    await new Promise<void>((resolve, reject) => {
      archive.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      archive.on("end", resolve);
      archive.on("error", reject);

      for (const clip of completedClips) {
        if (clip.filePath && existsSync(clip.filePath)) {
          const clipName = `${baseName}_clip${clip.clipNumber}.mp4`;
          archive.file(clip.filePath, { name: clipName });
        }
      }

      archive.finalize();
    });

    const buffer = Buffer.concat(chunks);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${baseName}_clips.zip"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download all clips error:", error);
    return NextResponse.json({ error: "Failed to download clips" }, { status: 500 });
  }
}
