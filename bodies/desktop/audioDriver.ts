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
import { BODY_CONFIG } from '../../src/core/bodyProtocol/bodyProtocolConfig.js';
import { BodyProtocolErrorCode } from '../../src/core/bodyProtocol/errorCodes.js';
import { VOICE_CONFIG } from '../../src/speech/voicePipelineConfig.js';
import { safeUnlink, cleanupAudioTempDirectories } from '../../src/speech/audioFileCleanup.js';
import { globalPrivacyIndicator, VisualPrivacyIndicator } from './privacyIndicator.js';

export class DesktopAudioDriver {
  private activeInputDevice: string;
  private activeOutputDevice: string;
  private isCapturing = false;
  private isPlaying = false;
  private tempAudioDir: string;
  private privacyIndicator: VisualPrivacyIndicator;

  /**
   * EN: Hook invoked whenever a privacy beep is emitted (useful for tests and auditing).
   * VI: Hook sự kiện được gọi mỗi khi phát tiếng beep chỉ báo an toàn.
   */
  public onPrivacyBeep?: (type: 'start' | 'stop' | 'timeout') => void;

  constructor(privacyIndicator: VisualPrivacyIndicator = globalPrivacyIndicator) {
    this.privacyIndicator = privacyIndicator;
    this.activeInputDevice = process.env.BOW_AUDIO_INPUT_DEVICE || 'Default Microphone';
    this.activeOutputDevice = process.env.BOW_AUDIO_OUTPUT_DEVICE || 'Default Speakers';
    this.tempAudioDir = VOICE_CONFIG.tempAudioDir;


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

    // Crash recovery: xóa các file WAV tạm còn sót từ lần chạy trước (khi bị kill đột ngột)
    this.cleanupStaleTempFiles();
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

      const jsonStart = resultJson.indexOf('{');
      const cleanJson = jsonStart !== -1 ? resultJson.slice(jsonStart) : resultJson.trim();
      const parsed = JSON.parse(cleanJson);
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
   * EN: Set or swap the privacy indicator instance (useful for tests or custom indicators).
   * VI: Gán hoặc thay đổi instance privacy indicator (dùng cho test hoặc custom indicator).
   */
  public setPrivacyIndicator(indicator: VisualPrivacyIndicator): void {
    this.privacyIndicator = indicator;
  }

  public getPrivacyIndicator(): VisualPrivacyIndicator {
    return this.privacyIndicator;
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
      defaultSampleRate: VOICE_CONFIG.defaultSampleRate,
      defaultChannels: VOICE_CONFIG.defaultChannels,
      isCapturing: this.isCapturing,
      isPlaying: this.isPlaying,
    };
  }

  /**
   * EN: Emit physical privacy beep tone:
   *     - START: 1200Hz high pitch (single tone 120ms)
   *     - STOP: 600Hz low pitch (single tone 150ms)
   *     - TIMEOUT: 400Hz urgent low pulse (3 short bursts 80ms each, spaced by 40ms)
   * VI: Phát âm thanh chỉ báo an toàn vật lý:
   *     - BẮT ĐẦU: 1200Hz cao (1 tiếng đơn 120ms)
   *     - KẾT THÚC: 600Hz thấp (1 tiếng đơn 150ms)
   *     - TIMEOUT: 400Hz cảnh báo trầm (3 tiếng còi ngắn 80ms ngắt quãng 40ms)
   * LƯU Ý BẢO MẬT: Không thể bị tắt hay bỏ qua bởi bất kỳ tham số nào từ Brain.
   */
  public async emitPrivacyBeep(type: 'start' | 'stop' | 'timeout'): Promise<void> {
    if (this.onPrivacyBeep) {
      try { this.onPrivacyBeep(type); } catch {}
    }

    if (process.platform === 'win32') {
      if (type === 'timeout') {
        try {
          const { timeoutFreqHz, timeoutBurstDurationMs, timeoutPauseDurationMs } = BODY_CONFIG.beep;
          execSync(
            `powershell -NoProfile -NonInteractive -Command "[Console]::Beep(${timeoutFreqHz}, ${timeoutBurstDurationMs}); Start-Sleep -Milliseconds ${timeoutPauseDurationMs}; [Console]::Beep(${timeoutFreqHz}, ${timeoutBurstDurationMs}); Start-Sleep -Milliseconds ${timeoutPauseDurationMs}; [Console]::Beep(${timeoutFreqHz}, ${timeoutBurstDurationMs})"`,
            { stdio: 'ignore', timeout: 2000 }
          );
        } catch {}
      } else {
        const freq = type === 'start' ? BODY_CONFIG.beep.startFreqHz : BODY_CONFIG.beep.stopFreqHz;
        const duration = type === 'start' ? BODY_CONFIG.beep.startDurationMs : BODY_CONFIG.beep.stopDurationMs;
        try {
          execSync(`powershell -NoProfile -NonInteractive -Command "[Console]::Beep(${freq}, ${duration})"`, {
            stdio: 'ignore',
            timeout: 1500,
          });
        } catch {}
      }
    } else {
      console.log(`[DESKTOP-AUDIO-BEEP] 🔔 PRIVACY BEEP (${type.toUpperCase()}) emitted.`);
    }

    // Nếu là tiếng bắt đầu thu, chờ 60ms để âm thanh dứt hẳn, tránh microphone thu lại tiếng beep
    if (type === 'start') {
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  /**
   * EN: Record audio from hardware microphone to WAV buffer using Windows MCI.
   * VI: Thu âm từ micro phần cứng ra buffer WAV sử dụng Windows MCI.
   */
  public async recordAudio(params: AudioCaptureParams = {}): Promise<AudioCaptureResult> {
    const durationMs = Math.max(500, Math.min(10000, params.durationMs || VOICE_CONFIG.defaultCaptureDurationMs));
    const sampleRate = params.sampleRate || VOICE_CONFIG.defaultSampleRate;
    const channels = params.channels || VOICE_CONFIG.defaultChannels;

    // 0. Hard Prerequisite: Chỉ báo quyền riêng tư vật lý (VisualPrivacyIndicator) PHẢI hoạt động
    const allowWithoutIndicator = process.env.BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR === 'true';
    if (!this.privacyIndicator.isReady()) {
      if (!allowWithoutIndicator) {
        throw new Error(`${BodyProtocolErrorCode.PRIVACY_INDICATOR_UNAVAILABLE} — không thể xác nhận chỉ báo vật lý đang hoạt động, từ chối thu âm để bảo vệ quyền riêng tư.`);
      }
      console.warn('[DESKTOP-AUDIO] ⚠️ CẢNH BÁO AN NINH (PRIVACY WARNING): Đang thu âm microphone khi KHÔNG CÓ chỉ báo vật lý hoạt động! (Được cho phép do BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR=true)');
    }

    // 1. Kích hoạt chỉ báo hiển thị khay hệ thống (System Tray đổi màu ĐỎ)
    this.privacyIndicator.setRecording(true);

    // 2. Phát tiếng BEEP BẮT ĐẦU thu âm (Chỉ báo an toàn bắt buộc, Brain không thể tắt)
    await this.emitPrivacyBeep('start');

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
      safeUnlink(tempWavFile);

      return {
        audioBase64,
        format: 'wav',
        durationMs,
        sampleRate,
        channels,
        byteLength: fileBuffer.byteLength,
      };
    } finally {
      // Cleanup guard: đảm bảo file tạm luôn được xóa trong mọi tình huống (kể cả khi exception xảy ra)
      safeUnlink(tempWavFile);
      this.isCapturing = false;
      // 3. Phát tiếng BEEP KẾT THÚC thu âm (Chỉ báo an toàn bắt buộc)
      await this.emitPrivacyBeep('stop');
      // 4. Khôi phục chỉ báo hiển thị kháy hệ thống về trạng thái RẢNH (XÁM)
      this.privacyIndicator.setRecording(false);
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
      if (tempCreated) {
        safeUnlink(wavFilePath);
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

  /**
   * EN: Crash recovery — delete stale WAV/TMP temp files older than maxAgeMs (default: 5 min)
   * left from a previous crashed session (capture_*.wav, piper_*.wav, play_*.wav, stt_in_*.wav).
   * Scans both Body audio temp directory and Piper TTS temp directory.
   *
   * VI: Crash recovery — xóa các file WAV/TMP tạm còn sót từ phiên trước bị kill đột ngột
   * (capture_*.wav, piper_*.wav, play_*.wav, stt_in_*.wav).
   * Quét cả thư mục âm thanh của Body và thư mục TTS tạm của Piper (.tmp/audio).
   *
   * @param maxAgeMs Tuổi tối đa của file tính bằng ms (mặc định: 5 phút = 300,000ms).
   * @returns Số lượng file tạm đã được dọn dẹp.
   */
  public cleanupStaleTempFiles(maxAgeMs: number = VOICE_CONFIG.staleAudioMaxAgeMs): number {
    return cleanupAudioTempDirectories([this.tempAudioDir], maxAgeMs);
  }
}

export const desktopAudioDriver = new DesktopAudioDriver();

export async function emitPrivacyBeep(type: 'start' | 'stop' | 'timeout'): Promise<void> {
  return desktopAudioDriver.emitPrivacyBeep(type);
}

export function cleanupStaleTempFiles(maxAgeMs?: number): number {
  return desktopAudioDriver.cleanupStaleTempFiles(maxAgeMs);
}
