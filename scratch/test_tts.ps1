param([string]$Text = "Xin chào sếp Hoàn. Em là Bowcon.", [string]$OutWav = "scratch/test_tts.wav")
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$fullPath = [System.IO.Path]::GetFullPath($OutWav)
$synth.SetOutputToWaveFile($fullPath)
$synth.Speak($Text)
$synth.Dispose()
if (Test-Path $fullPath) {
    Write-Output "TTS_SUCCESS: $fullPath ($((Get-Item $fullPath).Length) bytes)"
} else {
    Write-Output "TTS_FAILED"
}
