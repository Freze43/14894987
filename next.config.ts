import type { NextConfig } from "next";
import { execSync } from "child_process";

// Ensure FFmpeg is available
try {
  if (!execSync("which ffmpeg 2>/dev/null").toString().trim()) {
    throw new Error("not found");
  }
} catch {
  console.log("Installing FFmpeg for video processing...");
  try {
    execSync("sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg", {
      stdio: "inherit",
      timeout: 120000,
    });
  } catch {
    console.warn("Could not install FFmpeg automatically. Video processing may not work.");
  }
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
