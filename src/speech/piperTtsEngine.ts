// src/speech/piperTtsEngine.ts
// BOW AGENT V4.0 — REAL PIPER TTS ENGINE (DUY ORYX MODEL)
//
// Standalone Piper TTS Provider producing real 22050Hz PCM WAV audio.
// Strictly enforces structured error states (NO silent fallback to Windows SAPI).

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export type PiperErrorCode =
  | 'SUCCESS'
  | 'SYNTHESIS_FAILED'
  | 'MODEL_NOT_FOUND'
  | 'PIPER_NOT_FOUND'
  | 'INVALID_AUDIO'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'UNSUPPORTED_TEXT';

export interface PiperTtsOptions {
  modelPath?: string;
  configPath?: string;
  piperPath?: string;
  timeoutMs?: number;
  outputWavPath?: string;
  returnBase64?: boolean;
  speakerId?: number;
  signal?: AbortSignal;
}

export interface PiperTtsResult {
  success: boolean;
  errorCode: PiperErrorCode;
  audioBase64?: string;
  wavFilePath?: string;
  sampleRate: number;
  durationMs: number;
  byteLength?: number;
  error?: string;
}

import { VOICE_CONFIG } from './voicePipelineConfig.js';
import { safeUnlink } from './audioFileCleanup.js';

export class PiperTtsEngine {
  private piperExe: string;
  private modelPath: string;
  private configPath: string;
  private defaultTimeoutMs: number;

  constructor(options?: { piperPath?: string; modelPath?: string; configPath?: string; timeoutMs?: number }) {
    this.piperExe = options?.piperPath || VOICE_CONFIG.piperExePath;
    this.modelPath = options?.modelPath || VOICE_CONFIG.piperModelPath;
    this.configPath = options?.configPath || VOICE_CONFIG.piperConfigPath;
    this.defaultTimeoutMs = options?.timeoutMs || VOICE_CONFIG.ttsTimeoutMs;
  }

  /**
   * Status check of Piper binary and Duy Oryx ONNX model
   */
  public getStatus(): {
    piperAvailable: boolean;
    modelAvailable: boolean;
    piperPath: string;
    modelPath: string;
  } {
    return {
      piperAvailable: fs.existsSync(this.piperExe),
      modelAvailable: fs.existsSync(this.modelPath) && fs.existsSync(this.configPath),
      piperPath: this.piperExe,
      modelPath: this.modelPath,
    };
  }

  /**
   * Synthesizes Vietnamese text to real WAV audio using standalone Piper with Duy Oryx model.
   */
  public async synthesize(text: string, options: PiperTtsOptions = {}): Promise<PiperTtsResult> {
    const startTime = Date.now();
    const piperExe = options.piperPath || this.piperExe;
    const modelPath = options.modelPath || this.modelPath;
    const configPath = options.configPath || this.configPath;
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;

    // 1. Validate Piper Binary
    if (!fs.existsSync(piperExe)) {
      return {
        success: false,
        errorCode: 'PIPER_NOT_FOUND',
        sampleRate: 22050,
        durationMs: Date.now() - startTime,
        error: `Piper binary not found at: ${piperExe}`,
      };
    }

    // 2. Validate Model Files
    if (!fs.existsSync(modelPath) || !fs.existsSync(configPath)) {
      return {
        success: false,
        errorCode: 'MODEL_NOT_FOUND',
        sampleRate: 22050,
        durationMs: Date.now() - startTime,
        error: `Duy Oryx model or config not found. Model: ${modelPath}, Config: ${configPath}`,
      };
    }

    // 3. Validate Text
    const trimmed = text ? text.trim() : '';
    if (!trimmed) {
      return {
        success: false,
        errorCode: 'UNSUPPORTED_TEXT',
        sampleRate: 22050,
        durationMs: Date.now() - startTime,
        error: 'Text is empty or contains only whitespace.',
      };
    }

    // Prepare temporary WAV output path if not specified
    const tempDir = path.resolve('.tmp/audio');
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch {}
    }
    const outWavPath =
      options.outputWavPath ||
      path.join(tempDir, `piper_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.wav`);

    if (options.signal?.aborted) {
      safeUnlink(outWavPath);
      return {
        success: false,
        errorCode: 'ABORTED',
        sampleRate: 22050,
        durationMs: Date.now() - startTime,
        error: 'Piper synthesis aborted by signal',
      };
    }

    // 4. Invoke Piper executable via child process
    return new Promise<PiperTtsResult>((resolve) => {
      let isSettled = false;
      let cleanupAbortListener: (() => void) | undefined;

      const timer = setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
        cleanupAbortListener?.();
        try {
          child.kill('SIGKILL');
        } catch {}
        safeUnlink(outWavPath);
        resolve({
          success: false,
          errorCode: 'TIMEOUT',
          sampleRate: 22050,
          durationMs: Date.now() - startTime,
          error: `Piper synthesis timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      const piperArgs = ['--model', modelPath, '--config', configPath, '--output_file', outWavPath];
      if (typeof options.speakerId === 'number') {
        piperArgs.push('--speaker', String(options.speakerId));
      }

      const child = spawn(piperExe, piperArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      if (options.signal) {
        const onAbort = () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timer);
          try {
            child.kill('SIGKILL');
          } catch {}
          safeUnlink(outWavPath);
          resolve({
            success: false,
            errorCode: 'ABORTED',
            sampleRate: 22050,
            durationMs: Date.now() - startTime,
            error: 'Piper synthesis aborted by signal',
          });
        };

        if (options.signal.aborted) {
          onAbort();
          return;
        }
        options.signal.addEventListener('abort', onAbort, { once: true });
        cleanupAbortListener = () => options.signal?.removeEventListener('abort', onAbort);
      }

      let stderrOutput = '';
      child.stderr.on('data', (chunk) => {
        stderrOutput += chunk.toString('utf8');
      });

      child.on('error', (err) => {
        if (isSettled) return;
        isSettled = true;
        cleanupAbortListener?.();
        clearTimeout(timer);
        resolve({
          success: false,
          errorCode: 'SYNTHESIS_FAILED',
          sampleRate: 22050,
          durationMs: Date.now() - startTime,
          error: `Failed to spawn Piper process: ${err.message}`,
        });
      });

      child.on('close', (code) => {
        if (isSettled) return;
        isSettled = true;
        cleanupAbortListener?.();
        clearTimeout(timer);

        const durationMs = Date.now() - startTime;

        if (code !== 0) {
          resolve({
            success: false,
            errorCode: 'SYNTHESIS_FAILED',
            sampleRate: 22050,
            durationMs,
            error: `Piper exited with code ${code}. Details: ${stderrOutput.trim() || 'Unknown error'}`,
          });
          return;
        }

        // 5. Validate Output Audio File
        if (!fs.existsSync(outWavPath)) {
          resolve({
            success: false,
            errorCode: 'INVALID_AUDIO',
            sampleRate: 22050,
            durationMs,
            error: 'Output WAV file was not created by Piper.',
          });
          return;
        }

        const stat = fs.statSync(outWavPath);
        if (stat.size < 100) {
          resolve({
            success: false,
            errorCode: 'INVALID_AUDIO',
            sampleRate: 22050,
            durationMs,
            error: `Output WAV file is too small (${stat.size} bytes).`,
          });
          return;
        }

        // Validate RIFF header
        const headerBuf = Buffer.alloc(12);
        const fd = fs.openSync(outWavPath, 'r');
        fs.readSync(fd, headerBuf, 0, 12, 0);
        fs.closeSync(fd);

        const isRiff = headerBuf.toString('ascii', 0, 4) === 'RIFF';
        const isWave = headerBuf.toString('ascii', 8, 12) === 'WAVE';

        if (!isRiff || !isWave) {
          resolve({
            success: false,
            errorCode: 'INVALID_AUDIO',
            sampleRate: 22050,
            durationMs,
            error: 'Output file is not a valid RIFF/WAVE container.',
          });
          return;
        }

        let audioBase64: string | undefined;
        if (options.returnBase64 !== false) {
          try {
            audioBase64 = fs.readFileSync(outWavPath).toString('base64');
          } catch {}
        }

        resolve({
          success: true,
          errorCode: 'SUCCESS',
          audioBase64,
          wavFilePath: outWavPath,
          sampleRate: 22050,
          durationMs,
          byteLength: stat.size,
        });
      });

      // Write UTF-8 encoded text into Piper stdin
      try {
        child.stdin.write(trimmed, 'utf8');
        child.stdin.end();
      } catch (err: any) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          resolve({
            success: false,
            errorCode: 'SYNTHESIS_FAILED',
            sampleRate: 22050,
            durationMs: Date.now() - startTime,
            error: `Failed to write to Piper stdin: ${err.message}`,
          });
        }
      }
    });
  }
}

export const globalPiperTtsEngine = new PiperTtsEngine();
