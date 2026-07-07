"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Upload,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Minus,
  Plus,
  Film,
  Scissors,
  Zap,
} from "lucide-react";

const CLIP_OPTIONS = [1, 3, 5, 8, 10, 15];

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clipCount, setClipCount] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const validateAndSetFile = (f: File) => {
    setError(null);
    if (!f.name.toLowerCase().endsWith(".mp4") && !f.type.includes("video")) {
      setError("Please upload an .mp4 video file.");
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      setError("File size exceeds the 500MB limit.");
      return;
    }
    setFile(f);
    if (!projectName) {
      setProjectName(f.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a video file");
      return;
    }
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("name", projectName || file.name.replace(/\.[^/.]+$/, ""));
      formData.append("clipCount", clipCount.toString());

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) { clearInterval(progressInterval); return 90; }
          return prev + Math.random() * 12;
        });
      }, 400);

      const res = await fetch("/api/projects", { method: "POST", body: formData });
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setTimeout(() => router.push(`/projects/${data.id}`), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent-purple/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-blue/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 py-6">
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
            <span className="text-sm font-semibold bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">
              ClipAI
            </span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">New Project</h1>
        <p className="text-slate-400 text-sm mb-8">
          Upload a video and choose how many clips to generate
        </p>

        <div className="space-y-8">
          {/* Clip Count Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              <Scissors className="w-4 h-4 inline mr-1.5 text-accent-purple" />
              How many clips to generate?
            </label>
            <div className="flex flex-wrap gap-3 mb-3">
              {CLIP_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => setClipCount(count)}
                  className={`relative flex items-center justify-center rounded-xl border-2 text-lg font-bold transition-all duration-200 ${
                    clipCount === count
                      ? "border-accent-purple bg-accent-purple/20 text-accent-purple shadow-lg shadow-accent-purple/10"
                      : "border-dark-600/50 bg-dark-700/30 text-slate-400 hover:border-dark-500 hover:text-slate-300"
                  }`}
                  style={{ width: 52, height: 52 }}
                >
                  {count}
                  {clipCount === count && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent-purple flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-slate-500">Fine-tune:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setClipCount(Math.max(1, clipCount - 1))}
                  className="w-8 h-8 rounded-lg bg-dark-700/50 border border-dark-600/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-accent-purple/30 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="w-12 h-8 rounded-lg bg-dark-700/50 border border-accent-purple/30 flex items-center justify-center text-white text-sm font-bold">
                  {clipCount}
                </div>
                <button
                  onClick={() => setClipCount(Math.min(15, clipCount + 1))}
                  className="w-8 h-8 rounded-lg bg-dark-700/50 border border-dark-600/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-accent-purple/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 bg-dark-800/30 border border-dark-600/30 rounded-xl px-4 py-3 max-w-lg">
              <div className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-accent-purple" />
                <span>{clipCount} clip{clipCount > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                <span>~{clipCount <= 3 ? "30-60" : clipCount <= 8 ? "15-30" : "8-20"}s each</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-cyan-500" />
                <span>9:16 vertical</span>
              </div>
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Awesome Video"
              className="w-full max-w-md px-4 py-3 rounded-xl bg-dark-800/50 border border-dark-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-colors text-sm"
            />
          </div>

          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Upload Video
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300
                ${dragActive
                  ? "border-accent-purple bg-accent-purple/10 upload-zone-active"
                  : uploading
                  ? "border-accent-purple/30 bg-dark-800/50"
                  : file
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-dark-500 bg-dark-800/30 hover:border-accent-purple/50 hover:bg-dark-800/50"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,.mp4"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploading ? (
                <div className="space-y-4">
                  <Loader2 className="w-10 h-10 text-accent-purple animate-spin mx-auto" />
                  <div>
                    <p className="font-semibold text-white">Uploading & starting processing...</p>
                    <p className="text-xs text-slate-400 mt-1">This may take a moment</p>
                  </div>
                  <div className="w-full max-w-xs mx-auto">
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-300 progress-pulse"
                        style={{ width: `${Math.min(uploadProgress, 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{Math.round(Math.min(uploadProgress, 100))}%</p>
                  </div>
                </div>
              ) : file ? (
                <div className="space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
                  <div>
                    <p className="font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(file.size / (1024 * 1024)).toFixed(1)} MB — Click to change</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 text-slate-500 mx-auto" />
                  <div>
                    <p className="font-semibold text-white">Drag & drop your video here</p>
                    <p className="text-xs text-slate-400 mt-1">or click to browse — .mp4 up to 500MB, max 30 min</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed text-base"
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Creating Project...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate {clipCount} Clip{clipCount > 1 ? "s" : ""}</>
              )}
            </button>
            <span className="text-xs text-slate-500">Processing starts automatically after upload</span>
          </div>
        </div>
      </div>
    </div>
  );
}
