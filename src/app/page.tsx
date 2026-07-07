"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Zap,
  Subtitles,
  ScanFace,
  Film,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Minus,
  Plus,
  Scissors,
  ArrowRight,
  Play,
} from "lucide-react";

const CLIP_OPTIONS = [1, 3, 5, 8, 10, 15];

const FEATURES = [
  {
    icon: Subtitles,
    title: "AI Transcription",
    desc: "Accurate speech-to-text with word-level timestamps powered by AI.",
  },
  {
    icon: ScanFace,
    title: "Auto-Reframe",
    desc: "Smart 9:16 cropping that keeps the speaker centered in every frame.",
  },
  {
    icon: Zap,
    title: "Smart Clipping",
    desc: "Automatically identifies the most engaging 15-60s segments.",
  },
  {
    icon: Film,
    title: "Dynamic Subtitles",
    desc: "Bold karaoke-style subtitles that sync perfectly with speech.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [clipCount, setClipCount] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  }, []);

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
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-accent-pink/5 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">
            ClipAI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            My Projects
          </button>
          <button
            onClick={() => document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" })}
            className="px-4 py-2 rounded-full bg-accent-purple/20 text-accent-purple text-sm font-medium hover:bg-accent-purple/30 transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
        {/* Hero */}
        <div className="text-center pt-10 md:pt-16 pb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Video Clipping
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Turn Long Videos into{" "}
            <span className="bg-gradient-to-r from-accent-purple via-accent-pink to-accent-blue bg-clip-text text-transparent">
              Viral Clips
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-4">
            Upload your podcast or stream. Choose how many clips you want. Get vertical short videos
            with dynamic subtitles and auto-reframing — in minutes, not hours.
          </p>
        </div>

        {/* Upload + Config Section */}
        <div id="upload-section" className="max-w-3xl mx-auto mb-20 scroll-mt-24">
          <div className="rounded-2xl bg-dark-800/50 border border-dark-600/50 p-6 md:p-8 space-y-8">
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
                    className={`relative flex items-center justify-center w-13 h-13 rounded-xl border-2 text-lg font-bold transition-all duration-200 ${
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
              <div className="flex items-center gap-3">
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
                <span className="text-xs text-slate-500 ml-2">
                  ~{clipCount <= 3 ? "30-60" : clipCount <= 8 ? "15-30" : "8-20"}s per clip • 9:16 vertical
                </span>
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
                className="w-full max-w-md px-4 py-3 rounded-xl bg-dark-700/50 border border-dark-500/50 text-white placeholder-slate-500 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-colors text-sm"
              />
            </div>

            {/* Upload Zone */}
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
                    ? "border-accent-purple/30 bg-dark-700/50"
                    : file
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-dark-500 bg-dark-700/30 hover:border-accent-purple/50 hover:bg-dark-700/50"
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
                      <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-300 progress-pulse"
                          style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {Math.round(Math.min(uploadProgress, 100))}%
                      </p>
                    </div>
                  </div>
                ) : file ? (
                  <div className="space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
                    <div>
                      <p className="font-semibold text-white">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB — Click to change
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-full bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mx-auto float-animation">
                      <Upload className="w-7 h-7 text-accent-purple" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Drag & drop your video here</p>
                      <p className="text-xs text-slate-400 mt-1">
                        or click to browse — .mp4 up to 500MB, max 30 min
                      </p>
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
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate {clipCount} Clip{clipCount > 1 ? "s" : ""}
                  </>
                )}
              </button>
              {!file && !uploading && (
                <span className="text-xs text-slate-500">
                  Upload a video first to start
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="pb-20">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-center text-slate-400 mb-12 max-w-lg mx-auto">
            Four powerful AI steps transform your long video into shareable clips
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group relative rounded-2xl bg-dark-800/50 border border-dark-600/50 p-6 hover:border-accent-purple/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-accent-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-accent-purple" />
                  </div>
                  <div className="text-xs text-accent-purple font-semibold mb-2">
                    Step {i + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center pb-20">
          <div className="max-w-xl mx-auto rounded-2xl bg-gradient-to-b from-dark-700/50 to-dark-800/50 border border-dark-600/50 p-10">
            <h3 className="text-2xl font-bold mb-3">Ready to clip?</h3>
            <p className="text-slate-400 mb-6">
              Upload your video, pick your clip count, and let AI do the rest.
            </p>
            <button
              onClick={() => document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-accent-purple to-accent-blue text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <Play className="w-4 h-4" />
              Start Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-700/50 py-8 px-6 md:px-12 text-center text-sm text-slate-500">
        <p>© 2026 ClipAI — AI Auto Video Clipper. Built for creators.</p>
      </footer>
    </div>
  );
}
