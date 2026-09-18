// bodies/desktop/audioDriver.ts
// BOWCON V4.0 — DESKTOP BODY AUDIO DRIVER (HARDWARE MICROPHONE & SPEAKER INTEGRATION)
//
// EN:
// Native hardware audio driver for Desktop Body running on Windows/Node.js.
// Interacts with OS audio endpoints via Windows Multimedia (winmm.dll) and .NET SoundPlayer/Speech,
// providing low-latency microphone capture, audio device discovery, and speaker playback
// with zero external heavy binary dependencies (ffmpeg/sox not required).
//
// VI:
// Driver âm thanh phần cứng thực cho Desktop Body chạy trên môi trường Windows/Node.js.
// Tương tác trực tiếp với các thiết bị âm thanh qua Windows Multimedia (winmm.dll) và .NET SoundPlayer/Speech,
// hỗ trợ thu âm micro độ trễ thấp, phát hiện thiết bị âm thanh và phát loa/tai nghe
// mà không cần cài đặt các binary cồng kềnh bên ngoài (không cần ffmpeg hay sox).

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {
  AudioDeviceDescriptor,
  AudioDeviceListResult,
  AudioStatusResult,
  AudioCaptureParams,
  AudioCaptureResult,
  AudioPlayParams,
  AudioPlayResult,
} from '../../src/core/bodyProtocol/types.js';

export class DesktopAudioDriver {
  private activeInputDevice: string;
  private activeOutputDevice: string;
  private isCapturing = false;
  private isPlaying = false;
  private tempAudioDir: string;

  constructor() {
    this.activeInputDevice = process.env.BOW_AUDIO_INPUT_DEVICE || 'Default Microphone';
    this.activeOutputDevice = process.env.BOW_AUDIO_OUTPUT_DEVICE || 'Default Speakers';
    this.tempAudioDir = path.resolve(process.cwd(), '.tmp', 'audio');

    if (!fs.existsSync(this.tempAudioDir)) {
      try {
        fs.mkdirSync(this.tempAudioDir, { recursive: true });
      } catch {
        // Fallback to os tmpdir
        this.tempAudioDir = path.join(os.tmpdir(), 'bow_audio');
        if (!fs.existsSync(this.tempAudioDir)) {
          fs.mkdirSync(this.tempAudioDir, { recursive: true });
        }
      }
    }
  }

  /**
   * EN: List all available hardware audio input (microphones) and output (speakers) devices.
   * VI: Liệt kê tất cả các thiết bị thu (micro) và phát (loa/tai nghe) phần cứng có trên máy.
   */
  public async listAudioDevices(): Promise<AudioDeviceListResult> {
    if (process.platform === 'win32') {
      return this.listWindowsAudioDevices();
    }

    // Generic fallback for non-Windows environments
    return {
      inputs: [{ id: 0, name: 'Default Microphone', type: 'input', isDefault: true }],
      outputs: [{ id: 0, name: 'Default Speakers', type: 'output', isDefault: true }],
      activeInput: this.activeInputDevice,
      activeOutput: this.activeOutputDevice,
    };
  }

  /**
   * EN: Query Windows audio endpoints via winmm.dll waveIn/waveOut device capabilities.
   * VI: Truy vấn các thiết bị âm thanh Windows thông qua waveIn/waveOut trong winmm.dll.
   */
  private listWindowsAudioDevices(): AudioDeviceListResult {
    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinAudioDevs {
    [DllImport("winmm.dll")] public static extern int waveInGetNumDevs();
    [DllImport("winmm.dll")] public static extern int waveOutGetNumDevs();
    [DllImport("winmm.dll", CharSet = CharSet.Auto)] public static extern int waveInGetDevCaps(IntPtr uDeviceID, out WAVEINCAPS pwic, int cbwic);
    [DllImport("winmm.dll", CharSet = CharSet.Auto)] public static extern int waveOutGetDevCaps(IntPtr uDeviceID, out WAVEOUTCAPS pwoc, int cbwoc);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct WAVEINCAPS { public ushort wMid; public ushort wPid; public uint vDriverVersion; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szPname; public uint dwFormats; public ushort wChannels; public ushort wReserved1; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct WAVEOUTCAPS { public ushort wMid; public ushort wPid; public uint vDriverVersion; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szPname; public uint dwFormats; public ushort wChannels; public ushort wReserved1; public uint dwSupport; }
}
"@
$inputs = @()
$inDevs = [WinAudioDevs]::waveInGetNumDevs()
for ($i = 0; $i -lt $inDevs; $i++) {
    $c = New-Object WinAudioDevs+WAVEINCAPS
    $null = [WinAudioDevs]::waveInGetDevCaps([IntPtr]$i, [ref]$c, [System.Runtime.InteropServices.Marshal]::SizeOf($c))
    $inputs += [PSCustomObject]@{ id = $i; name = $c.szPname; type = "input"; channels = $c.wChannels }
}
$outputs = @()
$outDevs = [WinAudioDevs]::waveOutGetNumDevs()
for ($i = 0; $i -lt $outDevs; $i++) {
    $c = New-Object WinAudioDevs+WAVEOUTCAPS
    $null = [WinAudioDevs]::waveOutGetDevCaps([IntPtr]$i, [ref]$c, [System.Runtime.InteropServices.Marshal]::SizeOf($c))
    $outputs += [PSCustomObject]@{ id = $i; name = $c.szPname; type = "output"; channels = $c.wChannels }
}
[PSCustomObject]@{ inputs = $inputs; outputs = $outputs } | ConvertTo-Json -Compress
`;

    try {
      const b64 = Buffer.from(script, 'utf16le').toString('base64');
      const resultJson = execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${b64}`, {
        encoding: 'utf8',
        timeout: 8000,
        windowsHide: true,
      });

      const parsed = JSON.parse(resultJson.trim());
      const inputs: AudioDeviceDescriptor[] = Array.isArray(parsed.inputs)
        ? parsed.inputs.map((d: any) => ({ id: d.id, name: d.name, type: 'input', channels: d.channels }))
        : parsed.inputs ? [{ id: parsed.inputs.id, name: parsed.inputs.name, type: 'input' }] : [];

      const outputs: AudioDeviceDescriptor[] = Array.isArray(parsed.outputs)
        ? parsed.outputs.map((d: any) => ({ id: d.id, name: d.name, type: 'output', channels: d.channels }))
        : parsed.outputs ? [{ id: parsed.outputs.id, name: parsed.outputs.name, type: 'output' }] : [];

      return {
        inputs,
        outputs,
        activeInput: this.activeInputDevice,
        activeOutput: this.activeOutputDevice,
      };
    } catch (err: any) {
      console.warn(`[DESKTOP-AUDIO] Could not query Windows waveIn/waveOut devices: ${err.message}`);
      return {
        inputs: [{ id: 0, name: 'Default Microphone (Fallback)', type: 'input', isDefault: true }],
        outputs: [{ id: 0, name: 'Default Speakers (Fallback)', type: 'output', isDefault: true }],
        activeInput: this.activeInputDevice,
        activeOutput: this.activeOutputDevice,
      };
    }
  }

  /**
   * EN: Select active audio device by name or ID.
   * VI: Chọn thiết bị âm thanh hoạt động theo tên hoặc ID.
   */
  public selectAudioDevice(type: 'input' | 'output', deviceName: string): boolean {
    if (type === 'input') {
      this.activeInputDevice = deviceName;
      process.env.BOW_AUDIO_INPUT_DEVICE = deviceName;
    } else {
      this.activeOutputDevice = deviceName;
      process.env.BOW_AUDIO_OUTPUT_DEVICE = deviceName;
    }
    return true;
  }

  /**
   * EN: Get current audio driver status.
   * VI: Lấy trạng thái hoạt động hiện tại của driver âm thanh.
   */
  public getAudioStatus(): AudioStatusResult {
    return {
      ready: true,
      activeInput: this.activeInputDevice,
      activeOutput: this.activeOutputDevice,
      defaultSampleRate: 16000,
      defaultChannels: 1,
      isCapturing: this.isCapturing,
      isPlaying: this.isPlaying,
    };
  }

  /**
   * EN: Record audio from hardware microphone to WAV buffer using Windows MCI.
   * VI: Thu âm từ micro phần cứng ra buffer WAV sử dụng Windows MCI.
   */
  public async recordAudio(params: AudioCaptureParams = {}): Promise<AudioCaptureResult> {
    const durationMs = Math.max(500, Math.min(10000, params.durationMs || 2000));
    const sampleRate = params.sampleRate || 16000;
    const channels = params.channels || 1;

    this.isCapturing = true;
    const timestamp = Date.now();
    const tempWavFile = path.join(this.tempAudioDir, `capture_${timestamp}.wav`);

    try {
      if (process.platform === 'win32') {
        await this.recordWindowsMci(tempWavFile, durationMs, sampleRate, channels);
      } else {
        // Non-windows dummy PCM generator for test environments
        await this.createSyntheticWav(tempWavFile, durationMs, sampleRate, channels);
      }

      const fileBuffer = fs.readFileSync(tempWavFile);
      const audioBase64 = fileBuffer.toString('base64');

      // Cleanup temp capture file after reading into memory
      try {
        fs.unlinkSync(tempWavFile);
      } catch {}

      return {
        audioBase64,
        format: 'wav',
        durationMs,
        sampleRate,
        channels,
        byteLength: fileBuffer.byteLength,
      };
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * EN: Windows MCI recording worker via PowerShell.
   * VI: Thực hiện thu âm qua Windows MCI bằng PowerShell script.
   */
  private async recordWindowsMci(destPath: string, durationMs: number, sampleRate: number, channels: number): Promise<void> {
    const absPath = path.resolve(destPath).replace(/\\/g, '/');
    const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class MciRec {
    [DllImport("winmm.dll", EntryPoint = "mciSendStringA", CharSet = CharSet.Ansi)]
    public static extern int mciSendString(string cmd, StringBuilder ret, int retLen, IntPtr cb);
    public static int Exec(string cmd) {
        StringBuilder sb = new StringBuilder(128);
        return mciSendString(cmd, sb, 128, IntPtr.Zero);
    }
}
"@
$alias = "rec_${Date.now()}"
$wavPath = "${absPath}"
[MciRec]::Exec("open new type waveaudio alias " + $alias)
[MciRec]::Exec("set " + $alias + " time format ms")
[MciRec]::Exec("set " + $alias + " bitspersample 16")
[MciRec]::Exec("set " + $alias + " channels ${channels}")
[MciRec]::Exec("set " + $alias + " samplespersec ${sampleRate}")
[MciRec]::Exec("record " + $alias)
Start-Sleep -Milliseconds ${durationMs}
[MciRec]::Exec("stop " + $alias)
[MciRec]::Exec('save ' + $alias + ' "' + $wavPath + '"')
[MciRec]::Exec("close " + $alias)
`;

    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    return new Promise((resolve, reject) => {
      const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', b64], {
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        try { child.kill(); } catch {}
        reject(new Error(`MCI recording process timed out after ${durationMs + 5000}ms`));
      }, durationMs + 5000);

      let stderr = '';
      let stdout = '';
      child.stdout?.on('data', (d) => { stdout += d.toString(); });
      child.stderr?.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && fs.existsSync(destPath)) {
          resolve();
        } else {
          reject(new Error(`MCI recording process failed with exit code ${code}: ${stderr || stdout}`));
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * EN: Play audio buffer or file through headset / speakers.
   * VI: Phát âm thanh từ buffer hoặc tệp ra tai nghe / loa.
   */
  public async playAudio(params: AudioPlayParams = {}): Promise<AudioPlayResult> {
    const startTime = Date.now();
    this.isPlaying = true;

    const safeParams = params || {};
    let wavFilePath = safeParams.audioFilePath;
    const base64Data = safeParams.audioBase64 || (safeParams as any).data;
    let tempCreated = false;

    try {
      if (!wavFilePath && base64Data) {
        wavFilePath = path.join(this.tempAudioDir, `play_${Date.now()}.wav`);
        fs.writeFileSync(wavFilePath, Buffer.from(base64Data, 'base64'));
        tempCreated = true;
      }

      if (!wavFilePath || !fs.existsSync(wavFilePath)) {
        throw new Error('No valid audio file or base64 data provided for playback.');
      }

      if (process.platform === 'win32') {
        await this.playWindowsSound(wavFilePath);
      } else {
        // Non-windows test fallback: simulate playback delay
        await new Promise((r) => setTimeout(r, 200));
      }

      const elapsed = Date.now() - startTime;
      return {
        success: true,
        playbackDurationMs: elapsed,
        deviceName: this.activeOutputDevice,
      };
    } catch (err: any) {
      return {
        success: false,
        playbackDurationMs: Date.now() - startTime,
        error: err?.message || 'Audio playback failed',
      };
    } finally {
      if (tempCreated && wavFilePath && fs.existsSync(wavFilePath)) {
        try {
          fs.unlinkSync(wavFilePath);
        } catch {}
      }
      this.isPlaying = false;
    }
  }

  /**
   * EN: Playback via .NET System.Media.SoundPlayer on Windows.
   * VI: Phát âm thanh qua .NET System.Media.SoundPlayer trên Windows.
   */
  private async playWindowsSound(filePath: string): Promise<void> {
    const fullPath = path.resolve(filePath).replace(/\\/g, '\\\\');
    const psScript = `
$player = New-Object System.Media.SoundPlayer("${fullPath}")
$player.PlaySync()
`;

    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    return new Promise((resolve, reject) => {
      const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', b64], {
        windowsHide: true,
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Audio playback process exited with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * EN: Synthetic WAV generator for headless/cross-platform testing.
   * VI: Bộ tạo file WAV tổng hợp phục vụ kiểm thử không phụ thuộc phần cứng.
   */
  private async createSyntheticWav(destPath: string, durationMs: number, sampleRate: number, channels: number): Promise<void> {
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const dataSize = numSamples * channels * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * 2, 28);
    buffer.writeUInt16LE(channels * 2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Write simple 440Hz sine wave PCM
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 16000;
      buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
    }

    fs.writeFileSync(destPath, buffer);
  }
}

export const desktopAudioDriver = new DesktopAudioDriver();
