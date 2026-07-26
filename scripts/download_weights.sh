#!/usr/bin/env bash
# ==============================================================================
# 🧠 YOLOv8 MODEL WEIGHTS ONBOARDING & VERIFICATION SCRIPT
# ==============================================================================
# This script verifies that all required PyTorch/Ultralytics neural network 
# weights (.pt files) are present inside the ai-service models directory.
# ==============================================================================

set -e

MODELS_DIR="webcam-monitoring-app/ai-service/models"
mkdir -p "$MODELS_DIR"

echo "======================================================================"
echo "🔍 Verifying YOLOv8 Neural Network Weights in '$MODELS_DIR'..."
echo "======================================================================"

REQUIRED_MODELS=(
    "bestsmokeyolov8n.pt"
    "bestyolov8drowsymodel.pt"
    "bestbelt.pt"
    "bestcellphone.pt"
    "bestClass_v2.pt"
)

ALL_PRESENT=true

for model in "${REQUIRED_MODELS[@]}"; do
    FILE_PATH="$MODELS_DIR/$model"
    if [ -f "$FILE_PATH" ]; then
        SIZE_MB=$(du -m "$FILE_PATH" | cut -f1)
        echo "  [✓] FOUND: $model (${SIZE_MB} MB)"
    else
        echo "  [✗] MISSING: $model"
        ALL_PRESENT=false
    fi
done

echo "======================================================================"

if [ "$ALL_PRESENT" = true ]; then
    echo "🎉 All 5 YOLOv8 model weights are verified and ready for inference!"
    exit 0
else
    echo "⚠️ WARNING: One or more required model weights are missing!"
    echo "Because .pt files exceed Git file size limits (>50 MB), they are excluded"
    echo "from repository control via .gitignore."
    echo ""
    echo "📋 ACTION REQUIRED:"
    echo "1. Download your trained weights from your Roboflow / Ultralytics export."
    echo "2. Place the .pt files directly into: $MODELS_DIR/"
    echo "3. Re-run this script to verify before launching FastAPI uvicorn."
    echo "======================================================================"
    exit 1
fi
