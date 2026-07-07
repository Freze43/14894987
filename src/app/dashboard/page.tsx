"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  FolderOpen,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Trash2,
  Film,
  LayoutGrid,
  ArrowLeft,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  originalFilename: string;
  fileSize: string;
  duration: number | null;
  targetClipCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

function formatFileSize(bytes: string | number): string {
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Done
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full">
      <Loader2 className="w-3 h-3 animate-spin" />
      Processing
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Auto-refresh while any project is processing
  useEffect(() => {
    const hasProcessing = projects.some(
      (p) => !["completed", "failed"].includes(p.status)
    );
    if (!hasProcessing) return;
    const interval = setInterval(fetchProjects, 3000);
    return () => clearInterval(interval);
  }, [projects, fetchProjects]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its clips?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {}
    setDeletingId(null);
  };

  const completedCount = projects.filter((p) => p.status === "completed").length;
  const processingCount = projects.filter((p) => !["completed", "failed"].includes(p.status)).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent-purple/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-blue/10 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-dark-600/30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </button>
            <div className="w-px h-5 bg-dark-600/50" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">
                ClipAI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-5 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4" />
                {projects.length} projects
              </span>
              <span className="flex items-center gap-1.5 text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {completedCount} done
              </span>
              {processingCount > 0 && (
                <span className="flex items-center gap-1.5 text-accent-purple">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {processingCount} processing
                </span>
              )}
            </div>
            <button
              onClick={() => router.push("/projects/new")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-accent-purple" />
            My Projects
          </h1>

          {projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-dark-700/50 border border-dark-600/50 flex items-center justify-center mx-auto mb-6">
                <Film className="w-10 h-10 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
              <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
                Upload your first video to automatically generate viral short clips with AI
              </p>
              <button
                onClick={() => router.push("/projects/new")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group relative rounded-2xl bg-dark-800/50 border border-dark-600/50 overflow-hidden hover:border-accent-purple/30 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Thumbnail */}
                  <div
                    className="aspect-video bg-gradient-to-br from-dark-700 to-dark-800 flex items-center justify-center cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    {project.status === "completed" ? (
                      <div className="text-center">
                        <CheckCircle2 className="w-10 h-10 text-green-400/60 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">{project.targetClipCount} clips ready</p>
                      </div>
                    ) : project.status === "failed" ? (
                      <div className="text-center">
                        <AlertCircle className="w-10 h-10 text-red-400/60 mx-auto mb-2" />
                        <p className="text-xs text-red-400/60">Processing failed</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Loader2 className="w-10 h-10 text-accent-purple/60 mx-auto mb-2 animate-spin" />
                        <p className="text-xs text-accent-purple/80 capitalize">
                          {project.status.replace(/_/g, " ")}...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3
                        className="font-semibold text-white text-sm truncate cursor-pointer hover:text-accent-purple transition-colors"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        {project.name}
                      </h3>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        {formatFileSize(project.fileSize)}
                      </span>
                      {project.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(project.duration)}
                        </span>
                      )}
                      <span>{timeAgo(project.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-600/30">
                      <span className="text-xs text-slate-500">
                        {project.targetClipCount} clip{project.targetClipCount > 1 ? "s" : ""} target
                      </span>
                      <button
                        onClick={() => handleDelete(project.id)}
                        disabled={deletingId === project.id}
                        className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                        title="Delete project"
                      >
                        {deletingId === project.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
