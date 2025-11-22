#!/bin/bash

# Script to extract the first frame from a video file
# Usage: ./scripts/extract-video-frame.sh <input-video> <output-image>

set -e

INPUT_VIDEO="${1:-public/video/dog-funny-family.mp4}"
OUTPUT_IMAGE="${2:-public/imgs/dog-funny-family-poster.jpg}"

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed. Please install it first:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

# Check if input video exists
if [ ! -f "$INPUT_VIDEO" ]; then
    echo "Error: Input video not found: $INPUT_VIDEO"
    exit 1
fi

# Create output directory if it doesn't exist
OUTPUT_DIR=$(dirname "$OUTPUT_IMAGE")
mkdir -p "$OUTPUT_DIR"

# Extract the first frame
echo "Extracting first frame from: $INPUT_VIDEO"
echo "Output image: $OUTPUT_IMAGE"

ffmpeg -i "$INPUT_VIDEO" \
    -vf "scale='min(2524,iw)':'min(2524,ih)':force_original_aspect_ratio=decrease" \
    -vframes 1 \
    -q:v 2 \
    "$OUTPUT_IMAGE" \
    -y

echo "✓ Successfully extracted first frame to: $OUTPUT_IMAGE"

# Display image dimensions
if command -v identify &> /dev/null; then
    echo "Image dimensions: $(identify -format '%wx%h' "$OUTPUT_IMAGE")"
fi
