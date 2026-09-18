param([string]$FilePath = "scratch/test_rec.wav")
$fullPath = [System.IO.Path]::GetFullPath($FilePath)
if (Test-Path $fullPath) {
    $player = New-Object System.Media.SoundPlayer($fullPath)
    $player.PlaySync()
    Write-Output "PLAYBACK_SUCCESS: $fullPath"
} else {
    Write-Output "FILE_NOT_FOUND: $fullPath"
}
