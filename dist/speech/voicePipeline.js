// src/speech/voicePipeline.ts
// BOWCON V4.0 — HARDWARE-GROUNDED VOICE PIPELINE (BODYPROTOCOL <-> CANONICAL AGENTLOOP)
//
// EN:
// End-to-end Voice Pipeline connecting real hardware microphone capture to the
// Canonical AgentLoop and streaming synthesized speech back to hardware headset/speaker.
// Real STT (Whisper.cpp x64) -> Canonical Brain -> Real Piper TTS (Duy Oryx) -> Body audio.play.
// Enforces PDP governance boundaries: voice commands undergo standard policy evaluation
// and approval gates. Raw audio binary is never persisted to the cryptographic audit ledger.
//
// VI:
// Pipeline Giọng nói đầu-cuối kết nối thu âm micro phần cứng thực tế với chu trình
// Canonical AgentLoop và phát âm thanh tổng hợp trở lại tai nghe/loa phần cứng.
// STT thật (Whisper.cpp) -> Brain chuẩn -> Piper TTS thật (Duy Oryx) -> Body audio.play.
// Thực thi nghiêm ngặt ranh giới quản trị PDP: lệnh giọng nói trải qua đầy đủ quy trình
// đánh giá chính sách và cổng phê duyệt. Dữ liệu âm thanh thô không bao giờ ghi vào audit ledger.
import crypto from 'node:crypto';
import { globalBodyRegistry } from '../core/bodyProtocol/index.js';
import { AgentLoop } from '../core/agentLoop.js';
import { sttEngine } from './sttEngine.js';
import { ttsEngine } from './ttsEngine.js';
import { globalPiperTtsEngine } from './piperTtsEngine.js';
import { globalAuditLedger } from '../core/auditLedger.js';
import { agentAnalytics } from '../monitoring/agentAnalytics.js';
import { logVoiceContent, purgeStaleVoiceDebugLogs } from './voiceDebugLogger.js';
import { redactPii } from './piiRedactor.js';
import { VOICE_CONFIG } from './voicePipelineConfig.js';
import { safeUnlink } from './audioFileCleanup.js';
import { VoicePipelineErrorCode } from './errorCodes.js';
/** Hằng số timeout tổng thể mặc định cho toàn bộ một lượt tương tác hỏi-đáp bằng giọng nói (30s) */
export const MAX_E2E_TIMEOUT_MS = VOICE_CONFIG.maxE2eTimeoutMs;
export class VoicePipeline {
    bodyRegistry;
    agentLoop;
    stt;
    tts;
    piperTts;
    constructor(bodyRegistry, agentLoop, stt, tts, piperTts) {
        this.bodyRegistry = bodyRegistry || globalBodyRegistry;
        this.agentLoop = agentLoop || new AgentLoop();
        this.stt = stt || sttEngine;
        this.tts = tts || ttsEngine;
        this.piperTts = piperTts || globalPiperTtsEngine;
        // Xóa debug log cũ > 24h ngay khi pipeline khởi tạo (crash recovery)
        purgeStaleVoiceDebugLogs();
    }
    /**
     * EN: Executes the complete voice roundtrip:
     * 1. Mic capture via BodyProtocol (audio.capture)
     * 2. Real Speech-To-Text transcription (STT) via Whisper.cpp
     * 3. Canonical AgentLoop (Intent -> Memory -> Plan -> PDP -> Execute -> Verify -> Update)
     * 4. Real Text-To-Speech synthesis (TTS) via Piper (Duy Oryx model)
     * 5. Speaker playback via BodyProtocol (audio.play)
     *
     * VI: Thực thi trọn vẹn chu trình tương tác giọng nói:
     * 1. Thu âm micro qua BodyProtocol (audio.capture)
     * 2. Nhận dạng tiếng nói thật thành văn bản (STT) qua Whisper.cpp
     * 3. Xử lý qua Canonical AgentLoop (Intent -> Memory -> Plan -> PDP -> Execute -> Verify -> Update)
     * 4. Tổng hợp văn bản thật thành tiếng nói (TTS) qua Piper (mô hình Duy Oryx)
     * 5. Phát âm thanh ra loa qua BodyProtocol (audio.play)
     */
    async executeVoiceRoundtrip(options = {}) {
        // Hard Guard: Các tham số giả lập kiểm thử tuyệt đối không được phép dùng ngoài NODE_ENV=test
        if (options.simulatedTranscript && process.env.NODE_ENV !== 'test') {
            throw new Error(`${VoicePipelineErrorCode.TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV}: simulatedTranscript option can only be used in test environment (NODE_ENV=test).`);
        }
        if (options.audioBufferOverride && process.env.NODE_ENV !== 'test') {
            throw new Error(`${VoicePipelineErrorCode.TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV}: audioBufferOverride option can only be used in test environment (NODE_ENV=test).`);
        }
        const startTime = Date.now();
        const correlationId = options.correlationId || `voice_corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const sessionId = options.sessionId || `voice_session_${Date.now()}`;
        const userId = options.userId || 'boss_user';
        const role = options.role || 'owner';
        const isOwner = options.isOwner ?? (role === 'owner');
        const maxE2eTimeoutMs = options.maxE2eTimeoutMs ?? MAX_E2E_TIMEOUT_MS;
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
                sttDurationMs: 0,
                brainDurationMs: 0,
                ttsDurationMs: 0,
                playbackDurationMs: 0,
                totalDurationMs: Date.now() - startTime,
                error: `${VoicePipelineErrorCode.NO_ACTIVE_BODY}: No peripheral body is currently connected to Central Brain.`,
            };
        }
        let captureDurationMs = 0;
        let sttDurationMs = 0;
        let brainDurationMs = 0;
        let ttsDurationMs = 0;
        let playbackDurationMs = 0;
        let userText = '';
        let responseText = '';
        let piiCheck;
        let captureResultData;
        let playResultData;
        let currentStage = 'INITIALIZATION';
        let speechFilePath;
        let activeBodyCommandId;
        const abortController = new AbortController();
        let timeoutTimer;
        let isTimedOut = false;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutTimer = setTimeout(() => {
                isTimedOut = true;
                abortController.abort();
                if (activeBodyCommandId) {
                    try {
                        this.bodyRegistry.abortCommand(activeBodyCommandId, 'VOICE_ROUNDTRIP_TIMEOUT');
                    }
                    catch { }
                }
                reject(new Error(`${VoicePipelineErrorCode.VOICE_ROUNDTRIP_TIMEOUT}: Pipeline exceeded maximum time of ${maxE2eTimeoutMs}ms during stage ${currentStage}`));
            }, maxE2eTimeoutMs);
        });
        const pipelinePromise = (async () => {
            // -----------------------------------------------------------------------
            // STAGE 1: MICROPHONE AUDIO CAPTURE VIA BODYPROTOCOL
            // -----------------------------------------------------------------------
            currentStage = 'CAPTURE';
            if (abortController.signal.aborted) {
                throw new Error(`${VoicePipelineErrorCode.VOICE_ROUNDTRIP_ABORTED}: Pipeline aborted at stage CAPTURE`);
            }
            const captureStart = Date.now();
            console.log(`[VOICE-TRACE] [${correlationId}] audio.capture.start body=${targetBodyId}`);
            this.recordAuditMetadata('AUDIO_CAPTURE_STARTED', targetBodyId, correlationId, userId);
            const captureCommand = {
                commandId: `cmd_cap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
                bodyId: targetBodyId,
                capability: 'audio.capture',
                params: {
                    durationMs: options.captureDurationMs || VOICE_CONFIG.defaultCaptureDurationMs,
                    sampleRate: VOICE_CONFIG.defaultSampleRate,
                    channels: VOICE_CONFIG.defaultChannels,
                },
                correlationId,
            };
            activeBodyCommandId = captureCommand.commandId;
            let captureResponse;
            try {
                captureResponse = await this.bodyRegistry.executeBodyCommand(captureCommand);
            }
            finally {
                activeBodyCommandId = undefined;
            }
            captureDurationMs = Date.now() - captureStart;
            if (!captureResponse.success || !captureResponse.data) {
                console.error(`[VOICE-TRACE] [${correlationId}] audio.capture.failed duration=${captureDurationMs}ms error=${captureResponse.error}`);
                throw new Error(`${VoicePipelineErrorCode.AUDIO_CAPTURE_FAILED}: ${captureResponse.error || 'Failed to capture audio from body'}`);
            }
            captureResultData = captureResponse.data;
            console.log(`[VOICE-TRACE] [${correlationId}] audio.capture.complete duration=${captureDurationMs}ms bytes=${captureResultData.byteLength} status=SUCCESS`);
            this.recordAuditMetadata('AUDIO_CAPTURE_COMPLETED', targetBodyId, correlationId, userId, {
                byteLength: captureResultData.byteLength,
                durationMs: captureDurationMs,
            });
            // -----------------------------------------------------------------------
            // STAGE 2: SPEECH-TO-TEXT (STT) VIA WHISPER.CPP
            // -----------------------------------------------------------------------
            currentStage = 'STT';
            if (abortController.signal.aborted) {
                throw new Error(`${VoicePipelineErrorCode.VOICE_ROUNDTRIP_ABORTED}: Pipeline aborted at stage STT`);
            }
            const sttStart = Date.now();
            console.log(`[VOICE-TRACE] [${correlationId}] stt.start`);
            this.recordAuditMetadata('STT_START', targetBodyId, correlationId, userId);
            if (options.simulatedTranscript) {
                if (process.env.NODE_ENV !== 'test') {
                    throw new Error(`${VoicePipelineErrorCode.TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV}: simulatedTranscript option can only be used in test environment (NODE_ENV=test).`);
                }
                // Deterministic transcript override for automated test harnesses only
                userText = options.simulatedTranscript;
            }
            else {
                if (options.audioBufferOverride && process.env.NODE_ENV !== 'test') {
                    throw new Error(`${VoicePipelineErrorCode.TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV}: audioBufferOverride option can only be used in test environment (NODE_ENV=test).`);
                }
                const audioBuffer = options.audioBufferOverride || Buffer.from(captureResultData.audioBase64, 'base64');
                const sttResult = await this.stt.transcribe(audioBuffer, { language: 'vi', signal: abortController.signal });
                if (!sttResult.success) {
                    throw new Error(`${VoicePipelineErrorCode.STT_FAILED}: ${sttResult.error || 'Speech transcription failed'}`);
                }
                userText = (sttResult.text || '').trim();
            }
            sttDurationMs = Date.now() - sttStart;
            if (!userText) {
                userText = 'Xin chào';
            }
            // PII REDACTION SCAN: quét PII để bảo vệ lưu trữ dài hạn và ghi log an toàn
            // Lưu ý: userText GỐC (unredacted) vẫn được đưa vào loopRequest để AgentLoop phân tích ý định
            piiCheck = redactPii(userText);
            // PII-SAFE LOG: chỉ ghi metadata, không ghi nội dung transcript
            console.log(`[VOICE-TRACE] [${correlationId}] stt.complete duration=${sttDurationMs}ms chars=${userText.length} status=SUCCESS`);
            // Nội dung transcript chỉ ghi vào debug log riêng khi BOW_DEBUG_VOICE_CONTENT=true
            logVoiceContent(correlationId, 'stt.complete', `chars=${userText.length} lang=vi`);
            this.recordAuditMetadata('STT_COMPLETE', targetBodyId, correlationId, userId, {
                sttDurationMs,
                userTextLength: userText.length,
            });
            // -----------------------------------------------------------------------
            // STAGE 3: CANONICAL AGENTLOOP REASONING & PDP GOVERNANCE
            // -----------------------------------------------------------------------
            currentStage = 'BRAIN';
            if (abortController.signal.aborted) {
                throw new Error(`${VoicePipelineErrorCode.VOICE_ROUNDTRIP_ABORTED}: Pipeline aborted at stage BRAIN`);
            }
            const brainStart = Date.now();
            // PII-SAFE LOG: không ghi nội dung lệnh giọng nói vào console
            console.log(`[VOICE-TRACE] [${correlationId}] brain.request chars=${userText.length}`);
            logVoiceContent(correlationId, 'brain.request', `chars=${userText.length}`);
            this.recordAuditMetadata('BRAIN_REQUEST', targetBodyId, correlationId, userId, {
                userTextLength: userText.length,
            });
            const loopRequest = {
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
            const agentResult = await this.agentLoop.execute(loopRequest);
            brainDurationMs = Date.now() - brainStart;
            responseText = agentResult.response?.content || 'Em đã nhận lệnh từ Sếp.';
            // PII-SAFE LOG: không ghi nội dung phản hồi vào console
            console.log(`[VOICE-TRACE] [${correlationId}] brain.response duration=${brainDurationMs}ms state=${agentResult.state} chars=${responseText.length} status=SUCCESS`);
            logVoiceContent(correlationId, 'brain.response', `state=${agentResult.state} chars=${responseText.length}`);
            this.recordAuditMetadata('BRAIN_RESPONSE', targetBodyId, correlationId, userId, {
                brainDurationMs,
                state: agentResult.state,
                responseLength: responseText.length,
            });
            // -----------------------------------------------------------------------
            // STAGE 4: REAL TEXT-TO-SPEECH (TTS) VIA PIPER (DUY ORYX MODEL)
            // -----------------------------------------------------------------------
            currentStage = 'TTS';
            if (abortController.signal.aborted) {
                throw new Error(`${VoicePipelineErrorCode.VOICE_ROUNDTRIP_ABORTED}: Pipeline aborted at stage TTS`);
            }
            const ttsStart = Date.now();
            console.log(`[VOICE-TRACE] [${correlationId}] tts.start provider=piper model=duyoryx3175`);
            this.recordAuditMetadata('TTS_START', targetBodyId, correlationId, userId, {
                provider: 'piper',
                model: 'duyoryx3175',
            });
            let speechAudioBase64;
            try {
                const piperResult = await this.piperTts.synthesize(responseText, { returnBase64: true, signal: abortController.signal });
                ttsDurationMs = Date.now() - ttsStart;
                speechFilePath = piperResult.wavFilePath;
                if (!piperResult.success) {
                    console.error(`[VOICE-TRACE] [${correlationId}] tts.failed duration=${ttsDurationMs}ms errorCode=${piperResult.errorCode} error=${piperResult.error}`);
                    this.recordAuditMetadata('TTS_FAILED', targetBodyId, correlationId, userId, {
                        errorCode: piperResult.errorCode,
                        error: piperResult.error,
                        durationMs: ttsDurationMs,
                    });
                    // EXPLICIT FAILURE — NO SILENT SAPI FALLBACK
                    throw new Error(`${VoicePipelineErrorCode.TTS_SYNTHESIS_FAILED}: [${piperResult.errorCode}] ${piperResult.error || 'Piper synthesis failed'}`);
                }
                speechAudioBase64 = piperResult.audioBase64;
                console.log(`[VOICE-TRACE] [${correlationId}] tts.complete duration=${ttsDurationMs}ms bytes=${piperResult.byteLength} status=SUCCESS`);
                this.recordAuditMetadata('TTS_COMPLETE', targetBodyId, correlationId, userId, {
                    durationMs: ttsDurationMs,
                    byteLength: piperResult.byteLength,
                    sampleRate: piperResult.sampleRate,
                });
                // -----------------------------------------------------------------------
                // STAGE 5: SPEAKER PLAYBACK VIA BODYPROTOCOL
                // -----------------------------------------------------------------------
                currentStage = 'PLAYBACK';
                if (abortController.signal.aborted) {
                    throw new Error(`${VoicePipelineErrorCode.VOICE_ROUNDTRIP_ABORTED}: Pipeline aborted at stage PLAYBACK`);
                }
                const playStart = Date.now();
                console.log(`[VOICE-TRACE] [${correlationId}] audio.play.start body=${targetBodyId}`);
                this.recordAuditMetadata('AUDIO_PLAY_START', targetBodyId, correlationId, userId);
                const playCommand = {
                    commandId: `cmd_play_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
                    bodyId: targetBodyId,
                    capability: 'audio.play',
                    params: {
                        audioBase64: speechAudioBase64,
                        audioFilePath: speechFilePath,
                        format: 'wav',
                    },
                    correlationId,
                };
                activeBodyCommandId = playCommand.commandId;
                let playResponse;
                try {
                    playResponse = await this.bodyRegistry.executeBodyCommand(playCommand);
                }
                finally {
                    activeBodyCommandId = undefined;
                }
                playbackDurationMs = Date.now() - playStart;
                playResultData = playResponse.data;
                if (!playResponse.success) {
                    console.error(`[VOICE-TRACE] [${correlationId}] audio.play.failed duration=${playbackDurationMs}ms error=${playResponse.error}`);
                    throw new Error(`${VoicePipelineErrorCode.AUDIO_PLAY_FAILED}: ${playResponse.error || 'Playback on body failed'}`);
                }
                console.log(`[VOICE-TRACE] [${correlationId}] audio.play.complete duration=${playbackDurationMs}ms device="${playResultData?.deviceName || 'default'}" status=SUCCESS`);
                this.recordAuditMetadata('AUDIO_PLAY_COMPLETED', targetBodyId, correlationId, userId, {
                    playbackDurationMs,
                    success: playResponse.success,
                });
            }
            finally {
                // Cleanup guard: đảm bảo file WAV tạm của TTS luôn được xóa trong mọi tình huống
                // (kể cả khi audio.play thất bại, body offline, lỗi mạng, PDP từ chối approval...)
                safeUnlink(speechFilePath);
            }
            currentStage = 'COMPLETED';
            return {
                success: true,
                correlationId,
                bodyId: targetBodyId,
                userText,
                redactedUserText: piiCheck ? piiCheck.redactedText : userText,
                detectedPiiTypes: piiCheck && piiCheck.detectedTypes.length > 0 ? piiCheck.detectedTypes : undefined,
                responseText,
                agentLoopState: agentResult.state,
                captureDurationMs,
                sttDurationMs,
                brainDurationMs,
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
        })();
        // Ngăn chặn unhandled promise rejection nếu pipeline settled sau khi timeout đã kích hoạt
        pipelinePromise.catch(() => { });
        try {
            return await Promise.race([pipelinePromise, timeoutPromise]);
        }
        catch (err) {
            if (isTimedOut || err?.message?.startsWith('VOICE_ROUNDTRIP_TIMEOUT')) {
                console.error(`[VOICE-TRACE] [${correlationId}] voice_roundtrip.timeout: Execution exceeded total timeout limit ${maxE2eTimeoutMs}ms during stage=${currentStage}`);
                logVoiceContent(correlationId, 'voice_roundtrip.timeout', `stage=${currentStage} maxE2eTimeoutMs=${maxE2eTimeoutMs}`);
                this.recordAuditMetadata('E2E_TIMEOUT', targetBodyId, correlationId, userId, {
                    stage: currentStage,
                    maxE2eTimeoutMs,
                    elapsedMs: Date.now() - startTime,
                });
                // Đảm bảo file WAV tạm của TTS nếu kịp sinh ra sẽ được dọn dẹp sạch sẽ
                safeUnlink(speechFilePath);
                return {
                    success: false,
                    correlationId,
                    bodyId: targetBodyId,
                    userText,
                    redactedUserText: piiCheck ? piiCheck.redactedText : userText,
                    detectedPiiTypes: piiCheck && piiCheck.detectedTypes.length > 0 ? piiCheck.detectedTypes : undefined,
                    responseText: 'Xin lỗi, tôi mất quá nhiều thời gian xử lý, vui lòng thử lại.',
                    agentLoopState: 'VOICE_PIPELINE_TIMEOUT',
                    stageAtError: currentStage,
                    captureDurationMs,
                    sttDurationMs,
                    brainDurationMs,
                    ttsDurationMs,
                    playbackDurationMs,
                    totalDurationMs: Date.now() - startTime,
                    error: `${VoicePipelineErrorCode.VOICE_ROUNDTRIP_TIMEOUT}: Pipeline exceeded maximum time of ${maxE2eTimeoutMs}ms during stage ${currentStage}`,
                };
            }
            console.error(`[VOICE-TRACE] [${correlationId}] voice_roundtrip.error: ${err?.message || String(err)}`);
            return {
                success: false,
                correlationId,
                bodyId: targetBodyId,
                userText,
                redactedUserText: piiCheck ? piiCheck.redactedText : userText,
                detectedPiiTypes: piiCheck && piiCheck.detectedTypes.length > 0 ? piiCheck.detectedTypes : undefined,
                responseText: '',
                agentLoopState: 'VOICE_PIPELINE_ERROR',
                stageAtError: currentStage,
                captureDurationMs,
                sttDurationMs,
                brainDurationMs,
                ttsDurationMs,
                playbackDurationMs,
                totalDurationMs: Date.now() - startTime,
                error: err?.message || String(err),
            };
        }
        finally {
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
            }
            safeUnlink(speechFilePath);
        }
    }
    /**
     * EN: Resolve target body ID (picks first connected body with audio.capture capability).
     * VI: Xác định ID của body đang kết nối có hỗ trợ năng lực audio.capture.
     */
    resolveActiveBodyId() {
        const bodies = this.bodyRegistry.findBodiesWithCapability('audio.capture');
        if (bodies.length > 0) {
            return bodies[0].bodyId;
        }
        const all = this.bodyRegistry.getAllActiveBodies();
        return all.length > 0 ? all[0].bodyId : undefined;
    }
    /**
     * EN: Records privacy-preserving audit metadata. Never writes raw microphone audio.
     * VI: Ghi nhận siêu dữ liệu kiểm toán bảo vệ quyền riêng tư. Tuyệt đối không ghi âm thanh thô.
     */
    recordAuditMetadata(stage, bodyId, correlationId, userId, metadata = {}) {
        // 1. Telemetry / Analytics Event
        agentAnalytics.track({
            eventType: `VOICE_${stage}`,
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
        }
        catch {
            // Non-blocking audit fail-safe
        }
    }
}
export const globalVoicePipeline = new VoicePipeline();
