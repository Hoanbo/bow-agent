$path = "artifacts\voice-benchmark\audio\voice-07-duy-oryx\01.wav"
Write-Host "Playing Duy Oryx (Nam siêu trầm) - Câu 1 ra tai nghe Speakers (L80PRO)..."
$player = New-Object System.Media.SoundPlayer
$player.SoundLocation = (Resolve-Path $path).Path
$player.Load()
$player.PlaySync()
Write-Host "Playback completed successfully!"
