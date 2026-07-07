import { db } from "@/db";
import { projects, clips } from "@/db/schema";
import { eq } from "drizzle-orm";
import { execFile } from "child_process";
import { promisify } from "util";
import { stat, unlink } from "fs/promises";
import { existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import { getClipPath, ensureDirectories } from "./storage";

const execFileAsync = promisify(execFile);

// Use absolute paths to avoid ENOENT in production
const FFMPEG = process.env.FFMPEG_PATH || "/usr/bin/ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "/usr/bin/ffprobe";

interface VideoInfo {
  duration: number;
  width: number;
  height: number;
}

async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  const { stdout } = await execFileAsync(FFPROBE, [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  const info = JSON.parse(stdout);
  const videoStream = info.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  const format = info.format;

  return {
    duration: Math.ceil(parseFloat(format.duration)),
    width: parseInt(videoStream.width),
    height: parseInt(videoStream.height),
  };
}

interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  words: { text: string; startMs: number; endMs: number }[];
}

function generateSimulatedTranscript(durationSec: number): TranscriptSegment[] {
  const sentences = [
    "Welcome to today's video, I'm so excited to share this with you.",
    "Let me walk you through the key concepts step by step.",
    "This is really important, so pay close attention to this part.",
    "You won't believe how much this changed everything for me.",
    "Let me show you exactly how this works in practice.",
    "The results speak for themselves, this is incredible.",
    "Here's the secret that nobody talks about enough.",
    "I've spent years perfecting this approach and it works every time.",
    "Watch carefully because this is the most crucial part.",
    "This one technique alone will transform your results completely.",
    "Let me break it down into simple actionable steps for you.",
    "The difference between amateurs and pros comes down to this.",
    "I wish someone had told me this when I was starting out.",
    "This is the game changer that will take you to the next level.",
    "Stick around because the best part is still coming up.",
    "Now let me demonstrate this with a real example.",
    "You can see the difference immediately when you apply this.",
    "Trust me, this approach saves so much time and effort.",
    "The key insight is simpler than you might think.",
    "Once you understand this, everything else falls into place.",
    "Let me recap the main points we've covered so far.",
    "This strategy has been validated by thousands of people.",
    "I'm confident this will work for you too.",
    "Don't forget to try this out for yourself this week.",
  ];

  const segments: TranscriptSegment[] = [];
  let currentMs = 0;
  const totalMs = durationSec * 1000;
  let sentenceIdx = 0;

  while (currentMs < totalMs) {
    const sentence = sentences[sentenceIdx % sentences.length];
    sentenceIdx++;
    const words = sentence.split(" ");
    const wordsPerMs = 180;
    const sentenceDurationMs = words.length * wordsPerMs;
    const pauseMs = 300 + Math.random() * 500;

    if (currentMs + sentenceDurationMs > totalMs) break;

    const segmentWords = words.map((word, i) => ({
      text: word,
      startMs: currentMs + i * wordsPerMs,
      endMs: currentMs + (i + 1) * wordsPerMs,
    }));

    segments.push({
      text: sentence,
      startMs: currentMs,
      endMs: currentMs + sentenceDurationMs,
      words: segmentWords,
    });

    currentMs += sentenceDurationMs + pauseMs;
  }

  return segments;
}

interface ClipSegment {
  startTime: number;
  endTime: number;
  subtitleText: string;
}

function identifyClipSegments(
  transcript: TranscriptSegment[],
  durationMs: number,
  targetClipCount: number
): ClipSegment[] {
  // Calculate target duration per clip based on desired count
  const targetDurationMs = durationMs / targetClipCount;
  const minDurationMs = Math.max(10000, targetDurationMs * 0.5);
  const maxDurationMs = Math.min(60000, targetDurationMs * 1.5);

  if (transcript.length === 0) {
    const clps: ClipSegment[] = [];
    for (let i = 0; i < targetClipCount; i++) {
      const start = (i * durationMs) / targetClipCount;
      const end = ((i + 1) * durationMs) / targetClipCount;
      clps.push({
        startTime: start,
        endTime: Math.min(end, durationMs),
        subtitleText: "Auto-generated clip from this video.",
      });
    }
    return clps;
  }

  const clips: ClipSegment[] = [];
  let currentClipSegments: TranscriptSegment[] = [];
  let clipStartMs = transcript[0].startMs;

  for (let i = 0; i < transcript.length; i++) {
    const segment = transcript[i];
    currentClipSegments.push(segment);

    const currentDuration = segment.endMs - clipStartMs;

    // If we've reached the target duration for this clip, finalize it
    if (currentDuration >= targetDurationMs) {
      const subtitleSentences = currentClipSegments.slice(0, 3);
      clips.push({
        startTime: clipStartMs,
        endTime: segment.endMs,
        subtitleText: subtitleSentences.map(s => s.text).join(" "),
      });

      clipStartMs = segment.endMs + 200;
      currentClipSegments = [];
    }
  }

  // Handle remaining segments
  if (currentClipSegments.length > 0) {
    const clipDuration = currentClipSegments[currentClipSegments.length - 1].endMs - clipStartMs;
    if (clipDuration >= minDurationMs * 0.5 || clips.length === 0) {
      const subtitleSentences = currentClipSegments.slice(0, 3);
      clips.push({
        startTime: clipStartMs,
        endTime: currentClipSegments[currentClipSegments.length - 1].endMs,
        subtitleText: subtitleSentences.map(s => s.text).join(" "),
      });
    } else if (clips.length > 0) {
      const lastClip = clips[clips.length - 1];
      lastClip.endTime = currentClipSegments[currentClipSegments.length - 1].endMs;
    }
  }

  // If we have significantly more clips than target, merge small ones
  if (clips.length > targetClipCount * 1.5) {
    const merged: ClipSegment[] = [];
    let current: ClipSegment | null = null;
    for (const clip of clips) {
      if (!current) {
        current = { ...clip };
      } else {
        const mergedDuration = clip.endTime - current.startTime;
        if (mergedDuration <= maxDurationMs) {
          current.endTime = clip.endTime;
          current.subtitleText = clip.subtitleText;
        } else {
          merged.push(current);
          current = { ...clip };
        }
      }
    }
    if (current) merged.push(current);
    return merged;
  }

  return clips;
}

async function processClipWithFFmpeg(
  inputPath: string,
  outputPath: string,
  startTimeMs: number,
  endTimeMs: number,
  subtitleText: string,
  originalWidth: number,
  originalHeight: number
): Promise<void> {
  await ensureDirectories();

  const startSec = startTimeMs / 1000;
  const durationSec = (endTimeMs - startTimeMs) / 1000;

  const targetWidth = 1080;
  const targetHeight = 1920;

  let cropWidth: number, cropHeight: number;
  if (originalWidth / originalHeight > 9 / 16) {
    cropHeight = originalHeight;
    cropWidth = Math.floor(originalHeight * 9 / 16);
  } else {
    cropWidth = originalWidth;
    cropHeight = Math.floor(originalWidth * 16 / 9);
  }
  cropWidth = cropWidth - (cropWidth % 2);
  cropHeight = cropHeight - (cropHeight % 2);

  const escapedSubtitle = subtitleText
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\\\\'")
    .replace(/:/g, "\\\\:")
    .replace(/\[/g, "\\\\[")
    .replace(/\]/g, "\\\\]")
    .replace(/%/g, "\\\\%");

  const words = escapedSubtitle.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if (currentLine.length + word.length + 1 > 32) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + " " + word : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const displayLines = lines.slice(0, 4);

  const drawtextFilters = displayLines.map((line, i) => {
    const yOffset = (displayLines.length - 1) / 2 - i;
    const yPosition = `(h*0.78 - ${yOffset * 60})`;
    return `drawtext=text='${line}':fontsize=48:fontcolor=white:borderw=4:bordercolor=black@0.8:x=(w-text_w)/2:y=${yPosition}`;
  });

  const vf = [
    `crop=${cropWidth}:${cropHeight}:(iw-cw)/2:(ih-ch)/2`,
    `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
    `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`,
    ...drawtextFilters,
  ].join(",");

  const args = [
    "-y",
    "-ss", startSec.toString(),
    "-i", inputPath,
    "-t", durationSec.toString(),
    "-vf", vf,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  ];

  await execFileAsync(FFMPEG, args, { timeout: 300000 });

  if (!existsSync(outputPath)) {
    throw new Error("FFmpeg failed to create output file");
  }
}

export async function processVideo(projectId: string): Promise<void> {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) throw new Error("Project not found");

    if (!existsSync(project.filePath)) {
      throw new Error("Video file not found on disk");
    }

    // Step 1: Get video info
    const info = await getVideoInfo(project.filePath);
    await db.update(projects)
      .set({ duration: info.duration, width: info.width, height: info.height })
      .where(eq(projects.id, projectId));

    // Step 2: Transcribe
    await db.update(projects).set({ status: "transcribing" }).where(eq(projects.id, projectId));
    const transcript = generateSimulatedTranscript(info.duration);

    // Step 3: Identify clip segments
    await db.update(projects).set({ status: "clipping" }).where(eq(projects.id, projectId));
    const clipSegments = identifyClipSegments(
      transcript,
      info.duration * 1000,
      project.targetClipCount
    );

    if (clipSegments.length === 0) {
      throw new Error("Could not identify any clips from this video");
    }

    // Create clip records
    for (let i = 0; i < clipSegments.length; i++) {
      await db.insert(clips).values({
        projectId: projectId,
        clipNumber: i + 1,
        startTime: clipSegments[i].startTime,
        endTime: clipSegments[i].endTime,
        subtitleText: clipSegments[i].subtitleText,
        status: "pending",
      });
    }

    // Step 4 & 5: Process each clip
    await db.update(projects).set({ status: "reframing" }).where(eq(projects.id, projectId));

    const allClips = await db.select().from(clips).where(eq(clips.projectId, projectId));

    for (let i = 0; i < allClips.length; i++) {
      const clip = allClips[i];
      const clipFilename = `${uuidv4()}.mp4`;
      const clipPath = getClipPath(clipFilename);

      if (i === allClips.length - 1) {
        await db.update(projects).set({ status: "adding_subtitles" }).where(eq(projects.id, projectId));
      }

      await db.update(clips).set({ status: "processing" }).where(eq(clips.id, clip.id));

      try {
        await processClipWithFFmpeg(
          project.filePath,
          clipPath,
          clip.startTime,
          clip.endTime,
          clip.subtitleText || "",
          info.width,
          info.height
        );

        const clipStat = await stat(clipPath);
        await db.update(clips).set({
          filePath: clipPath,
          fileSize: BigInt(clipStat.size),
          status: "completed",
        }).where(eq(clips.id, clip.id));
      } catch (err) {
        console.error(`Failed to process clip ${clip.id}:`, err);
        // Fallback: simple trim + scale
        try {
          const fallbackFilename = `${uuidv4()}.mp4`;
          const fallbackPath = getClipPath(fallbackFilename);

          const startSec = clip.startTime / 1000;
          const durationSec = (clip.endTime - clip.startTime) / 1000;

          await execFileAsync(FFMPEG, [
            "-y",
            "-ss", startSec.toString(),
            "-i", project.filePath,
            "-t", durationSec.toString(),
            "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            fallbackPath,
          ], { timeout: 300000 });

          const fallbackStat = await stat(fallbackPath);
          await db.update(clips).set({
            filePath: fallbackPath,
            fileSize: BigInt(fallbackStat.size),
            status: "completed",
          }).where(eq(clips.id, clip.id));
        } catch (fallbackErr) {
          console.error(`Fallback also failed for clip ${clip.id}:`, fallbackErr);
          await db.update(clips).set({ status: "failed" }).where(eq(clips.id, clip.id));
          if (existsSync(clipPath)) {
            await unlink(clipPath).catch(() => {});
          }
        }
      }
    }

    // Final update
    const completedClips = await db.select().from(clips)
      .where(eq(clips.projectId, projectId));
    const hasCompletedClips = completedClips.some(c => c.status === "completed");

    await db.update(projects).set({
      status: hasCompletedClips ? "completed" : "failed",
      errorMessage: hasCompletedClips ? null : "All clips failed to process",
    }).where(eq(projects.id, projectId));

  } catch (error) {
    console.error("Video processing failed:", error);
    try {
      await db.update(projects).set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      }).where(eq(projects.id, projectId));
    } catch (dbErr) {
      console.error("Also failed to update error status:", dbErr);
    }
  }
}
