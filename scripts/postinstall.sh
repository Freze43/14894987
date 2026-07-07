#!/bin/bash
# Ensure FFmpeg is installed before starting
if ! command -v ffmpeg &> /dev/null; then
  echo "Installing FFmpeg..."
  sudo apt-get update -qq 2>/dev/null
  sudo apt-get install -y -qq ffmpeg 2>/dev/null
fi
echo "FFmpeg: $(which ffmpeg)"
echo "FFprobe: $(which ffprobe)"
