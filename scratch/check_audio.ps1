Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinAudio {
    [DllImport("winmm.dll")]
    public static extern int waveInGetNumDevs();
    [DllImport("winmm.dll")]
    public static extern int waveOutGetNumDevs();
    [DllImport("winmm.dll", CharSet = CharSet.Auto)]
    public static extern int waveInGetDevCaps(IntPtr uDeviceID, out WAVEINCAPS pwic, int cbwic);
    [DllImport("winmm.dll", CharSet = CharSet.Auto)]
    public static extern int waveOutGetDevCaps(IntPtr uDeviceID, out WAVEOUTCAPS pwoc, int cbwoc);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct WAVEINCAPS {
        public ushort wMid;
        public ushort wPid;
        public uint vDriverVersion;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string szPname;
        public uint dwFormats;
        public ushort wChannels;
        public ushort wReserved1;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct WAVEOUTCAPS {
        public ushort wMid;
        public ushort wPid;
        public uint vDriverVersion;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string szPname;
        public uint dwFormats;
        public ushort wChannels;
        public ushort wReserved1;
        public uint dwSupport;
    }
}
"@

$inDevs = [WinAudio]::waveInGetNumDevs()
$outDevs = [WinAudio]::waveOutGetNumDevs()

Write-Output "--- AUDIO INPUT DEVICES ($inDevs) ---"
for ($i = 0; $i -lt $inDevs; $i++) {
    $caps = New-Object WinAudio+WAVEINCAPS
    $res = [WinAudio]::waveInGetDevCaps([IntPtr]$i, [ref]$caps, [System.Runtime.InteropServices.Marshal]::SizeOf($caps))
    Write-Output "[$i] $($caps.szPname)"
}

Write-Output "`n--- AUDIO OUTPUT DEVICES ($outDevs) ---"
for ($i = 0; $i -lt $outDevs; $i++) {
    $caps = New-Object WinAudio+WAVEOUTCAPS
    $res = [WinAudio]::waveOutGetDevCaps([IntPtr]$i, [ref]$caps, [System.Runtime.InteropServices.Marshal]::SizeOf($caps))
    Write-Output "[$i] $($caps.szPname)"
}
