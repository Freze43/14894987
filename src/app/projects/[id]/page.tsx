"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Play,
  Pause,
  ArrowLeft,
  Sparkles,
  Mic,
  Scissors,
  ScanFace,
  Subtitles,
  RotateCcw,
  Clock,
  Film,
  Volume2,
  Trash2,
} from "lucide-react";

interface ClipData {
  id: string;
  clipNumber: number;
  startTime: number;
  endTime: number;
  subtitleText: string | null;
  fileSize: string | null;
  status: string;
  duration: number;
}

interface ProjectData {
  id: string;
  name: string;
  originalFilename: string;
  fileSize: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  targetClipCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  clips: ClipData[];
}

const STATUS_STEPS = [
  { key: "uploaded", label: "Video Uploaded", icon: CheckCircle2 },
  { key: "transcribing", label: "Transcribing Audio", icon: Mic },
  { key: "clipping", label: "Identifying Clips", icon: Scissors },
  { key: "reframing", label: "Auto-Reframing", icon: ScanFace },
  { key: "adding_subtitles", label: "Adding Subtitles", icon: Subtitles },
  { key: "completed", label: "Complete!", icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
  if (status === "failed") return -1;
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: string | number | null): string {
  if (!bytes) return "—";
  const num = typeof bytes === "string" ? parseInt(bytes) : bytes;
  if (num > 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  if (num > 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${num} B`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      setProject(await res.json());
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (!project) return;
    const isProcessing = !["completed", "failed"].includes(project.status);
    if (!isProcessing) return;
    const interval = setInterval(fetchProject, 2500);
    return () => clearInterval(interval);
  }, [project?.status, fetchProject]);

  const handleDelete = async () => {
    if (!confirm("Delete this project and all clips?")) return;
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    router.push("/dashboard");
  };

  const currentStep = project ? getStepIndex(project.status) : 0;
  const isProcessing = project ? !["completed", "failed"].includes(project.status) : false;
  const completedClips = project?.clips.filter((c) => c.status === "completed") || [];
  const processingClips = project?.clips.filter((c) => c.status === "processing" || c.status === "pending") || [];
  const failedClips = project?.clips.filter((c) => c.status === "failed") || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg text-slate-400">Project not found</p>
        <button onClick={() => router.push("/")} className="text-accent-purple hover:underline">
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-purple/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-accent-blue/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Projects</span>
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            <span className="text-sm font-semibold bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">ClipAI</span>
          </div>
        </div>

        {/* Project Info */}
        <div className="rounded-2xl bg-dark-800/50 border border-dark-600/50 p-5 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
                <Film className="w-5 h-5 text-accent-purple" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate max-w-xs sm:max-w-md">{project.name}</p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(project.fileSize)}
                  {project.duration ? ` • ${formatTime(project.duration)}` : ""}
                  {project.width && project.height ? ` • ${project.width}×${project.height}` : ""}
                  {" • "}{project.targetClipCount} clip target
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {completedClips.length > 0 && (
                <a
                  href={`/api/projects/${project.id}/download`}
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/30 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download All ZIP
                </a>
              )}
              {project.status === "completed" && (
                <span className="flex items-center gap-1.5 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              )}
              {project.status === "failed" && (
                <span className="flex items-center gap-1.5 text-sm text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed
                </span>
              )}
              {isProcessing && (
                <span className="flex items-center gap-1.5 text-sm text-accent-purple bg-accent-purple/10 px-3 py-1.5 rounded-full font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                </span>
              )}
              <button onClick={handleDelete} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Delete project">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Processing */}
        {isProcessing && (
          <div className="rounded-2xl bg-dark-800/50 border border-dark-600/50 p-6 md:p-8 mb-8">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-accent-purple animate-spin" />
              Processing — Generating {project.targetClipCount} clip{project.targetClipCount > 1 ? "s" : ""}
            </h2>
            <div className="space-y-4">
              {STATUS_STEPS.map((step, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                const isPending = i > currentStep;
                return (
                  <div key={step.key} className={`flex items-center gap-4 transition-all duration-500 ${isPending ? "opacity-30" : ""}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isCompleted ? "bg-green-500/20 border border-green-500/30"
                        : isCurrent ? "bg-accent-purple/20 border border-accent-purple/30"
                        : "bg-dark-700 border border-dark-600"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : isCurrent ? <Loader2 className="w-5 h-5 text-accent-purple animate-spin" />
                        : <step.icon className="w-5 h-5 text-slate-500" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isCompleted ? "text-green-400" : isCurrent ? "text-white" : "text-slate-500"}`}>{step.label}</p>
                      {isCurrent && <p className="text-xs text-slate-500 mt-0.5">Working on it — this may take a few minutes...</p>}
                    </div>
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-6 border-t border-dark-600/50">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Overall Progress</span>
                <span>{currentStep + 1}/{STATUS_STEPS.length} steps</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-700 progress-pulse"
                  style={{ width: `${((currentStep + 1) / STATUS_STEPS.length) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {project.status === "failed" && completedClips.length === 0 && (
          <div className="rounded-2xl bg-red-400/5 border border-red-400/20 p-6 md:p-8 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-400 mb-1">Processing Failed</h2>
                <p className="text-sm text-slate-400">{project.errorMessage || "An unexpected error occurred."}</p>
                <button onClick={() => router.push("/projects/new")} className="mt-4 inline-flex items-center gap-2 text-sm text-accent-purple hover:underline">
                  <RotateCcw className="w-3.5 h-3.5" /> Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clips */}
        {completedClips.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold">
                Your Clips
                <span className="text-accent-purple ml-2">{completedClips.length}</span>
                <span className="text-sm font-normal text-slate-500 ml-2">/ {project.targetClipCount} target</span>
              </h2>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {project.status === "completed" ? "All clips ready" : "Generating..."}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedClips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} isPlaying={playingClipId === clip.id}
                  onTogglePlay={() => setPlayingClipId((prev) => (prev === clip.id ? null : clip.id))} />
              ))}
            </div>
            {processingClips.length > 0 && (
              <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />
                {processingClips.length} more clip(s) being processed...
              </div>
            )}
            {failedClips.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-400/70">
                <AlertCircle className="w-4 h-4" /> {failedClips.length} clip(s) failed
              </div>
            )}
          </div>
        )}

        {project.status === "completed" && completedClips.length === 0 && (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No clips generated</h3>
            <p className="text-slate-500 text-sm mb-6">The video was processed but no clips could be extracted.</p>
            <button onClick={() => router.push("/projects/new")} className="inline-flex items-center gap-2 text-sm text-accent-purple hover:underline">
              <RotateCcw className="w-3.5 h-3.5" /> Try another video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ClipCard({ clip, isPlaying, onTogglePlay }: { clip: ClipData; isPlaying: boolean; onTogglePlay: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) el.play().catch(() => {});
    else el.pause();
  }, [isPlaying]);

  return (
    <div className="group rounded-2xl bg-dark-800/50 border border-dark-600/50 overflow-hidden hover:border-accent-purple/30 transition-all duration-300">
      <div className="relative aspect-[9/16] bg-black overflow-hidden">
        <video ref={videoRef} src={`/api/clips/${clip.id}/stream`} className="w-full h-full object-contain" loop playsInline muted preload="metadata" />
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={onTogglePlay}>
          <div className={`w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
            {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
          </div>
        </div>
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs font-semibold text-white">Clip #{clip.clipNumber}</div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white">
          <Clock className="w-3 h-3" /> {clip.duration.toFixed(1)}s
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Volume2 className="w-3 h-3" /> {formatDuration(clip.startTime)} – {formatDuration(clip.endTime)}
          </div>
          {clip.fileSize && <span className="text-xs text-slate-500">{formatFileSize(clip.fileSize)}</span>}
        </div>
        {clip.subtitleText && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed italic">&ldquo;{clip.subtitleText}&rdquo;</p>
        )}
        <a href={`/api/clips/${clip.id}/download`} download
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Download className="w-4 h-4" /> Download MP4
        </a>
      </div>
    </div>
  );
}
