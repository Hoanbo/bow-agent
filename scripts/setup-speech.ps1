# scripts/setup-speech.ps1
$ErrorActionPreference = 'Stop'
$repoRoot = "C:\BOW\bow-agent"
$binDir = Join-Path $repoRoot "bin"
$piperDir = Join-Path $binDir "piper"
$whisperDir = Join-Path $binDir "whisper"
$modelsDir = Join-Path $repoRoot "artifacts\voice-benchmark\models-cache"
$duyOryxDir = Join-Path $modelsDir "voice-07-duy-oryx"
$whisperModelDir = Join-Path $modelsDir "whisper"

New-Item -ItemType Directory -Force -Path $piperDir | Out-Null
New-Item -ItemType Directory -Force -Path $whisperDir | Out-Null
New-Item -ItemType Directory -Force -Path $duyOryxDir | Out-Null
New-Item -ItemType Directory -Force -Path $whisperModelDir | Out-Null

# 1. Download Piper Windows standalone
$piperExe = Join-Path $piperDir "piper.exe"
if (-not (Test-Path $piperExe)) {
    $piperZip = Join-Path $binDir "piper_windows_amd64.zip"
    Write-Host "[1/4] Downloading piper_windows_amd64.zip..."
    curl.exe -L -o $piperZip "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
    Write-Host "[1/4] Extracting Piper..."
    Expand-Archive -Path $piperZip -DestinationPath $piperDir -Force
    if (Test-Path (Join-Path $piperDir "piper\piper.exe")) {
        Get-ChildItem (Join-Path $piperDir "piper\*") | Move-Item -Destination $piperDir -Force
        Remove-Item (Join-Path $piperDir "piper") -Recurse -Force
    }
    Remove-Item $piperZip -Force
    Write-Host "[1/4] Piper extraction complete."
} else {
    Write-Host "[1/4] Piper already installed."
}

# 2. Download Duy Oryx Model & Config
$duyModel = Join-Path $duyOryxDir "duyoryx3175.onnx"
$duyConfig = Join-Path $duyOryxDir "duyoryx3175.onnx.json"
if (-not (Test-Path $duyModel) -or (Get-Item $duyModel).Length -lt 10000000) {
    Write-Host "[2/4] Downloading duyoryx3175.onnx (~60.5 MB)..."
    curl.exe -L -o $duyModel "https://huggingface.co/hoangquocviet/PIPER_MODELS/resolve/main/duyoryx3175.onnx"
}
if (-not (Test-Path $duyConfig)) {
    Write-Host "[2/4] Downloading duyoryx3175.onnx.json..."
    curl.exe -L -o $duyConfig "https://huggingface.co/hoangquocviet/PIPER_MODELS/raw/main/duyoryx3175.onnx.json"
}

# 3. Download Whisper.cpp Windows x64 binary
$whisperExe = Join-Path $whisperDir "whisper-cli.exe"
if (-not (Test-Path $whisperExe)) {
    $whisperZip = Join-Path $binDir "whisper-bin-x64.zip"
    Write-Host "[3/4] Downloading whisper-bin-x64.zip (b5130)..."
    curl.exe -L -o $whisperZip "https://github.com/ggml-org/whisper.cpp/releases/download/b5130/whisper-bin-x64.zip"
    Write-Host "[3/4] Extracting whisper.cpp..."
    Expand-Archive -Path $whisperZip -DestinationPath $whisperDir -Force
    Remove-Item $whisperZip -Force
    Write-Host "[3/4] whisper.cpp extraction complete."
} else {
    Write-Host "[3/4] whisper.cpp already installed."
}

# 4. Download Whisper model (ggml-base.bin)
$whisperModel = Join-Path $whisperModelDir "ggml-base.bin"
if (-not (Test-Path $whisperModel) -or (Get-Item $whisperModel).Length -lt 10000000) {
    Write-Host "[4/4] Downloading ggml-base.bin (~148 MB)..."
    curl.exe -L -o $whisperModel "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
    Write-Host "[4/4] ggml-base.bin download complete."
} else {
    Write-Host "[4/4] ggml-base.bin already present."
}

Write-Host "All runtimes and models ready!"
