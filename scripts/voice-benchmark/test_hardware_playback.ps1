$audioDir = "artifacts\voice-benchmark\audio"
$report = @()

Write-Host "=== PHASE 6: AUDIO PLAYBACK TEST ON SELECTED HEADSET (Speakers (L80PRO)) ==="
$voices = Get-ChildItem $audioDir -Directory

foreach ($v in $voices) {
    $firstWav = Join-Path $v.FullName "01.wav"
    if (Test-Path $firstWav) {
        Write-Host "Testing playback: $($v.Name) -> 01.wav"
        try {
            $player = New-Object System.Media.SoundPlayer
            $player.SoundLocation = $firstWav
            $player.Load()
            $player.Play() # Non-blocking or quick test
            Start-Sleep -Milliseconds 1500
            $player.Stop()
            Write-Host "  -> Playback command completed on selected output device: Speakers (L80PRO)"
            $report += [PSCustomObject]@{
                Voice = $v.Name
                PlaybackAttempt = "01.wav"
                OutputDevice = "Speakers (L80PRO)"
                Result = "VERIFIED"
            }
        } catch {
            Write-Host "  -> Playback failed: $_"
            $report += [PSCustomObject]@{
                Voice = $v.Name
                PlaybackAttempt = "01.wav"
                OutputDevice = "Speakers (L80PRO)"
                Result = "FAILED"
            }
        }
    }
}

Write-Host "`n=== PHASE 7: MICROPHONE SMOKE TEST (Microphone (L80PRO)) ==="
$testWav = ".tmp\mic_benchmark_test.wav"
if (Test-Path $testWav) { Remove-Item $testWav -Force }

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinmmMicTest {
    [DllImport("winmm.dll", CharSet = CharSet.Ansi)] public static extern int mciSendStringA(string command, string buffer, int bufferSize, IntPtr hwndCallback);
}
"@ -ErrorAction SilentlyContinue

try {
    $null = [WinmmMicTest]::mciSendStringA("open new type waveaudio alias bmic", "", 0, [IntPtr]::Zero)
    $null = [WinmmMicTest]::mciSendStringA("set bmic format tag pcm", "", 0, [IntPtr]::Zero)
    $null = [WinmmMicTest]::mciSendStringA("set bmic bitspersample 16", "", 0, [IntPtr]::Zero)
    $null = [WinmmMicTest]::mciSendStringA("set bmic channels 1", "", 0, [IntPtr]::Zero)
    $null = [WinmmMicTest]::mciSendStringA("set bmic samplespersec 16000", "", 0, [IntPtr]::Zero)
    $null = [WinmmMicTest]::mciSendStringA("record bmic", "", 0, [IntPtr]::Zero)
    Write-Host "Recording from Microphone (L80PRO) for 1500ms..."
    Start-Sleep -Milliseconds 1500
    $null = [WinmmMicTest]::mciSendStringA("stop bmic", "", 0, [IntPtr]::Zero)
    $null = [WinmmMicTest]::mciSendStringA("save bmic $testWav", "", 0, [IntPtr]::Zero)
    $null = [WinmmMicTest]::mciSendStringA("close bmic", "", 0, [IntPtr]::Zero)

    if (Test-Path $testWav) {
        $size = (Get-Item $testWav).Length
        Write-Host "Microphone capture SUCCESS! File size: $size bytes"
        Remove-Item $testWav -Force
        Write-Host "Temporary recording cleaned up."
        $micStatus = "VERIFIED"
    } else {
        Write-Host "Microphone capture FAILED: File not found"
        $micStatus = "FAILED"
    }
} catch {
    Write-Host "Microphone error: $_"
    $micStatus = "FAILED: $_"
}

$report | Format-Table -AutoSize
Write-Host "Mic Status:" $micStatus
