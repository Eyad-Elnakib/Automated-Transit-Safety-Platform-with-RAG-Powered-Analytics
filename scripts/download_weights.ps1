# ==============================================================================
# 🧠 YOLOv8 MODEL WEIGHTS ONBOARDING & VERIFICATION SCRIPT (PowerShell)
# ==============================================================================
# This script verifies that all required PyTorch/Ultralytics neural network 
# weights (.pt files) are present inside the ai-service models directory.
# ==============================================================================

$ModelsDir = "webcam-monitoring-app/ai-service/models"
if (-not (Test-Path $ModelsDir)) {
    New-Item -ItemType Directory -Force -Path $ModelsDir | Out-Null
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🔍 Verifying YOLOv8 Neural Network Weights in '$ModelsDir'..." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$RequiredModels = @(
    "bestsmokeyolov8n.pt",
    "bestyolov8drowsymodel.pt",
    "bestbelt.pt",
    "bestcellphone.pt",
    "bestClass_v2.pt"
)

$AllPresent = $true

foreach ($Model in $RequiredModels) {
    $FilePath = Join-Path $ModelsDir $Model
    if (Test-Path $FilePath) {
        $SizeMB = [math]::round((Get-Item $FilePath).Length / 1MB, 2)
        Write-Host "  [✓] FOUND: $Model ($SizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host "  [✗] MISSING: $Model" -ForegroundColor Red
        $AllPresent = $false
    }
}

Write-Host "======================================================================" -ForegroundColor Cyan

if ($AllPresent) {
    Write-Host "🎉 All 5 YOLOv8 model weights are verified and ready for inference!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️ WARNING: One or more required model weights are missing!" -ForegroundColor Yellow
    Write-Host "Because .pt files exceed Git file size limits (>50 MB), they are excluded"
    Write-Host "from repository control via .gitignore."
    Write-Host ""
    Write-Host "📋 ACTION REQUIRED:" -ForegroundColor White
    Write-Host "1. Download your trained weights from your Roboflow / Ultralytics export."
    Write-Host "2. Place the .pt files directly into: $ModelsDir/"
    Write-Host "3. Re-run this script to verify before launching FastAPI uvicorn."
    Write-Host "======================================================================" -ForegroundColor Cyan
    exit 1
}
