// src/speech/voicePipeline.ts
// BOWCON V4.0 — HARDWARE-GROUNDED VOICE PIPELINE (BODYPROTOCOL <-> CANONICAL AGENTLOOP)
//
// EN:
// End-to-end Voice Pipeline connecting real hardware microphone capture to the
// Canonical AgentLoop and streaming synthesized speech back to hardware headset/speaker.
// Enforces PDP governance boundaries: voice commands undergo standard policy evaluation
// and approval gates. Raw audio binary is never persisted to the cryptographic audit ledger.
//
// VI:
// Pipeline Giọng nói đầu-cuối kết nối thu âm micro phần cứng thực tế với chu trình
// Canonical AgentLoop và phát âm thanh tổng hợp trở lại tai nghe/loa phần cứng.
// Thực thi nghiêm ngặt ranh giới quản trị PDP: lệnh giọng nói trải qua đầy đủ quy trình
// đánh giá chính sách và cổng phê duyệt. Dữ liệu âm thanh thô không bao giờ ghi vào audit ledger.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { globalBodyRegistry, type BodyRegistry } from '../core/bodyProtocol/index.js';
import { AgentLoop, type AgentLoopRequest, type AgentLoopResult } from '../core/agentLoop.js';
import { sttEngine, type VietnameseSttEngine } from './sttEngine.js';
import { ttsEngine, type VietnameseTtsEngine } from './ttsEngine.js';
import { globalAuditLedger } from '../core/auditLedger.js';
import { agentAnalytics } from '../monitoring/agentAnalytics.js';
import type {
  AudioCaptureParams,
  AudioCaptureResult,
  AudioPlayParams,
  AudioPlayResult,
} from '../core/bodyProtocol/types.js';

export interface VoiceRoundtripOptions {
  /** Target body ID (default: 'desktop_xeon' or first active body) */
  bodyId?: string;
  /** Session ID for conversational context */
  sessionId?: string;
  /** Authenticated user identifier */
  userId?: string;
  /** User role (e.g. 'owner', 'customer') */
  role?: string;
  /** Is Root Owner flag */
  isOwner?: boolean;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Capture duration in milliseconds (default: 2000ms) */
  captureDurationMs?: number;
  /** Optional mock transcription for deterministic unit testing */
  simulatedTranscript?: string;
  /** Optional execution token for privileged actions (Level 4 PDP) */
  executionToken?: string;
}

export interface VoiceRoundtripResult {
  success: boolean;
  correlationId: string;
  bodyId: string;
  userText: string;
  responseText: string;
  agentLoopState: string;
  captureDurationMs: number;
  ttsDurationMs: number;
  playbackDurationMs: number;
  totalDurationMs: number;
  error?: string;
  audioCapture?: {
    format: string;
    byteLength: number;
    sampleRate: number;
  };
  audioPlayback?: {
    deviceName?: string;
  };
}

export class VoicePipeline {
  private bodyRegistry: BodyRegistry;
  private agentLoop: AgentLoop;
  private stt: VietnameseSttEngine;
  private tts: VietnameseTtsEngine;

  constructor(
    bodyRegistry?: BodyRegistry,
    agentLoop?: AgentLoop,
    stt?: VietnameseSttEngine,
    tts?: VietnameseTtsEngine
  ) {
    this.bodyRegistry = bodyRegistry || globalBodyRegistry;
    this.agentLoop = agentLoop || new AgentLoop();
    this.stt = stt || sttEngine;
    this.tts = tts || ttsEngine;
  }

  /**
   * EN: Executes the complete voice roundtrip:
   * 1. Mic capture via BodyProtocol (audio.capture)
   * 2. Speech-To-Text transcription (STT)
   * 3. Canonical AgentLoop (Intent -> Memory -> Plan -> PDP -> Execute -> Verify -> Update)
   * 4. Text-To-Speech synthesis (TTS)
   * 5. Speaker playback via BodyProtocol (audio.play)
   *
   * VI: Thực thi trọn vẹn chu trình tương tác giọng nói:
   * 1. Thu âm micro qua BodyProtocol (audio.capture)
   * 2. Nhận dạng tiếng nói thành văn bản (STT)
   * 3. Xử lý qua Canonical AgentLoop (Intent -> Memory -> Plan -> PDP -> Execute -> Verify -> Update)
   * 4. Tổng hợp văn bản thành tiếng nói (TTS)
   * 5. Phát âm thanh ra loa qua BodyProtocol (audio.play)
   */
  public async executeVoiceRoundtrip(options: VoiceRoundtripOptions = {}): Promise<VoiceRoundtripResult> {
    const startTime = Date.now();
    const correlationId = options.correlationId || `voice_corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sessionId = options.sessionId || `voice_session_${Date.now()}`;
    const userId = options.userId || 'boss_user';
    const role = options.role || 'owner';
    const isOwner = options.isOwner ?? (role === 'owner');

    // 0. Resolve target body
    const targetBodyId = options.bodyId || this.resolveActiveBodyId();
    if (!targetBodyId) {
      return {
        success: false,
        correlationId,
        bodyId: 'none',
        userText: '',
        responseText: '',
        agentLoopState: 'NO_BODY_CONNECTED',
        captureDurationMs: 0,
        ttsDurationMs: 0,
        playbackDurationMs: 0,
        totalDurationMs: Date.now() - startTime,
        error: 'NO_ACTIVE_BODY: No peripheral body is currently connected to Central Brain.',
      };
    }

    let captureDurationMs = 0;
    let ttsDurationMs = 0;
    let playbackDurationMs = 0;
    let userText = '';
    let responseText = '';
    let captureResultData: AudioCaptureResult | undefined;
    let playResultData: AudioPlayResult | undefined;

    try {
      // -----------------------------------------------------------------------
      // STAGE 1: MICROPHONE AUDIO CAPTURE VIA BODYPROTOCOL
      // -----------------------------------------------------------------------
      const captureStart = Date.now();
      this.recordAuditMetadata('AUDIO_CAPTURE_STARTED', targetBodyId, correlationId, userId);

      const captureCommand = {
        commandId: `cmd_cap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        bodyId: targetBodyId,
        capability: 'audio.capture',
        params: {
          durationMs: options.captureDurationMs || 2000,
          sampleRate: 16000,
          channels: 1,
        } as AudioCaptureParams,
        correlationId,
      };

      const captureResponse = await this.bodyRegistry.executeBodyCommand(captureCommand);
      captureDurationMs = Date.now() - captureStart;

      if (!captureResponse.success || !captureResponse.data) {
        throw new Error(`AUDIO_CAPTURE_FAILED: ${captureResponse.error || 'Failed to capture audio from body'}`);
      }

      captureResultData = captureResponse.data as AudioCaptureResult;
      this.recordAuditMetadata('AUDIO_CAPTURE_COMPLETED', targetBodyId, correlationId, userId, {
        byteLength: captureResultData.byteLength,
        durationMs: captureDurationMs,
      });

      // -----------------------------------------------------------------------
      // STAGE 2: SPEECH-TO-TEXT (STT)
      // -----------------------------------------------------------------------
      this.recordAuditMetadata('STT_REQUEST', targetBodyId, correlationId, userId);

      if (options.simulatedTranscript) {
        // Deterministic transcript override for automated test harnesses
        userText = options.simulatedTranscript;
      } else {
        const audioBuffer = Buffer.from(captureResultData.audioBase64, 'base64');
        const sttResult = await this.stt.transcribe(audioBuffer, { language: 'vi' });
        userText = sttResult.text || '';
      }

      if (!userText.trim()) {
        userText = 'Xin chào';
      }

      // -----------------------------------------------------------------------
      // STAGE 3: CANONICAL AGENTLOOP REASONING & PDP GOVERNANCE
      // -----------------------------------------------------------------------
      this.recordAuditMetadata('AGENT_REQUEST', targetBodyId, correlationId, userId, {
        userTextLength: userText.length,
      });

      const loopRequest: AgentLoopRequest = {
        requestId: `req_voice_${Date.now()}`,
        correlationId,
        sessionId,
        userText,
        executionToken: options.executionToken,
        actor: {
          userId,
          role,
          channel: 'VOICE',
          isOwner,
        },
      };

      const agentResult: AgentLoopResult = await this.agentLoop.execute(loopRequest);
      responseText = agentResult.response?.content || 'Em đã nhận lệnh từ Sếp.';

      // -----------------------------------------------------------------------
      // STAGE 4: TEXT-TO-SPEECH (TTS)
      // -----------------------------------------------------------------------
      const ttsStart = Date.now();
      this.recordAuditMetadata('TTS_REQUEST', targetBodyId, correlationId, userId);

      let speechAudioBase64: string | undefined;
      let speechFilePath: string | undefined;

      // Check if running on Windows with local Speech synthesis capability
      if (process.platform === 'win32') {
        const tempTtsWav = path.resolve(process.cwd(), '.tmp', 'audio', `tts_${Date.now()}.wav`);
        const synthesizedPath = await this.synthesizeWindowsSpeechWav(responseText, tempTtsWav);
        if (synthesizedPath && fs.existsSync(synthesizedPath)) {
          speechFilePath = synthesizedPath;
        }
      }

      if (!speechFilePath) {
        const ttsResult = await this.tts.synthesize(responseText);
        speechAudioBase64 = ttsResult.audioBase64;
      }
      ttsDurationMs = Date.now() - ttsStart;

      // -----------------------------------------------------------------------
      // STAGE 5: SPEAKER PLAYBACK VIA BODYPROTOCOL
      // -----------------------------------------------------------------------
      const playStart = Date.now();
      const playCommand = {
        commandId: `cmd_play_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        bodyId: targetBodyId,
        capability: 'audio.play',
        params: {
          audioBase64: speechAudioBase64,
          audioFilePath: speechFilePath,
          format: 'wav',
        } as AudioPlayParams,
        correlationId,
      };

      const playResponse = await this.bodyRegistry.executeBodyCommand(playCommand);
      playbackDurationMs = Date.now() - playStart;
      playResultData = playResponse.data as AudioPlayResult;

      this.recordAuditMetadata('AUDIO_PLAY_COMPLETED', targetBodyId, correlationId, userId, {
        playbackDurationMs,
        success: playResponse.success,
      });

      // Cleanup local temp TTS WAV file if created
      if (speechFilePath && fs.existsSync(speechFilePath)) {
        try {
          fs.unlinkSync(speechFilePath);
        } catch {}
      }

      return {
        success: true,
        correlationId,
        bodyId: targetBodyId,
        userText,
        responseText,
        agentLoopState: agentResult.state,
        captureDurationMs,
        ttsDurationMs,
        playbackDurationMs,
        totalDurationMs: Date.now() - startTime,
        audioCapture: captureResultData
          ? {
              format: captureResultData.format,
              byteLength: captureResultData.byteLength,
              sampleRate: captureResultData.sampleRate,
            }
          : undefined,
        audioPlayback: playResultData
          ? {
              deviceName: playResultData.deviceName,
            }
          : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        correlationId,
        bodyId: targetBodyId,
        userText,
        responseText: '',
        agentLoopState: 'VOICE_PIPELINE_ERROR',
        captureDurationMs,
        ttsDurationMs,
        playbackDurationMs,
        totalDurationMs: Date.now() - startTime,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * EN: Resolve target body ID (picks first connected body with audio.capture capability).
   * VI: Xác định ID của body đang kết nối có hỗ trợ năng lực audio.capture.
   */
  private resolveActiveBodyId(): string | undefined {
    const bodies = this.bodyRegistry.findBodiesWithCapability('audio.capture');
    if (bodies.length > 0) {
      return bodies[0].bodyId;
    }
    const all = this.bodyRegistry.getAllActiveBodies();
    return all.length > 0 ? all[0].bodyId : undefined;
  }

  /**
   * EN: Synthesize text to WAV file on Windows using PowerShell System.Speech.
   * VI: Tổng hợp giọng nói ra file WAV trên Windows dùng PowerShell System.Speech.
   */
  private async synthesizeWindowsSpeechWav(text: string, outWavPath: string): Promise<string | null> {
    const dir = path.dirname(outWavPath);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    }

    const absPath = path.resolve(outWavPath).replace(/\\/g, '/');
    const cleanText = text.replace(/[`$]/g, '').slice(0, 300);
    const psScript = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToWaveFile('${absPath}')
$s.Speak(@'
${cleanText}
'@)
$s.Dispose()
`;

    try {
      const { execSync } = await import('node:child_process');
      const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
      execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${b64}`, {
        timeout: 8000,
        windowsHide: true,
      });

      if (fs.existsSync(outWavPath) && fs.statSync(outWavPath).size > 100) {
        return outWavPath;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  /**
   * EN: Records privacy-preserving audit metadata. Never writes raw microphone audio.
   * VI: Ghi nhận siêu dữ liệu kiểm toán bảo vệ quyền riêng tư. Tuyệt đối không ghi âm thanh thô.
   */
  private recordAuditMetadata(
    stage: string,
    bodyId: string,
    correlationId: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): void {
    // 1. Telemetry / Analytics Event
    agentAnalytics.track({
      eventType: `VOICE_${stage}` as any,
      sessionId: correlationId,
      userId,
      metadata: {
        bodyId,
        correlationId,
        ...metadata,
      },
    });

    // 2. Cryptographic Audit Ledger Entry (Metadata hash-chaining only)
    try {
      globalAuditLedger.record({
        timestamp: new Date().toISOString(),
        actor: {
          userId,
          role: 'owner',
          channel: 'VOICE',
        },
        domain: 'voice',
        toolName: `audio.${stage.toLowerCase()}`,
        classification: 'SAFE_READ',
        argumentsHash: crypto.createHash('sha256').update(JSON.stringify({ stage, bodyId, correlationId, ...metadata })).digest('hex'),
        policyDecision: 'PERMIT',
        executionStatus: 'SUCCESS',
      });
    } catch {
      // Non-blocking audit fail-safe
    }
  }
}

export const globalVoicePipeline = new VoicePipeline();
