import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clips } from "@/db/schema";
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

    const fileStat = await stat(clip.filePath);
    const fileSize = fileStat.size;

    const range = request.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const buffer = Buffer.alloc(chunkSize);
      const fileHandle = await import("fs/promises").then((fs) => fs.open(clip.filePath!, "r"));
      await fileHandle.read(buffer, 0, chunkSize, start);
      await fileHandle.close();

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": "video/mp4",
        },
      });
    }

    const fileBuffer = await readFile(clip.filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Stream clip error:", error);
    return NextResponse.json({ error: "Failed to stream clip" }, { status: 500 });
  }
}
