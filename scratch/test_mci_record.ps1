Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class MciAudio {
    [DllImport("winmm.dll", EntryPoint = "mciSendStringA", CharSet = CharSet.Ansi)]
    public static extern int mciSendString(string command, StringBuilder returnString, int returnLength, IntPtr hwndCallback);

    public static int Send(string cmd) {
        StringBuilder sb = new StringBuilder(128);
        return mciSendString(cmd, sb, 128, IntPtr.Zero);
    }
}
"@

$wavPath = [System.IO.Path]::GetFullPath("scratch/test_rec.wav")
if (Test-Path $wavPath) { Remove-Item $wavPath }

Write-Output "Opening MCI waveaudio recording device..."
[MciAudio]::Send("open new type waveaudio alias recsound")
[MciAudio]::Send("set recsound time format ms")
[MciAudio]::Send("set recsound bitspersample 16")
[MciAudio]::Send("set recsound channels 1")
[MciAudio]::Send("set recsound samplespersec 16000")

Write-Output "Recording for 1000ms..."
[MciAudio]::Send("record recsound")
Start-Sleep -Milliseconds 1000
[MciAudio]::Send("stop recsound")

Write-Output "Saving recording to $wavPath..."
[MciAudio]::Send("save recsound `"$wavPath`"")
[MciAudio]::Send("close recsound")

if (Test-Path $wavPath) {
    $len = (Get-Item $wavPath).Length
    Write-Output "SUCCESS: Recorded WAV file created with size: $len bytes"
} else {
    Write-Output "FAIL: File not created"
}
