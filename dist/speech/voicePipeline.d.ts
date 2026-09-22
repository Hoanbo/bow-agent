import { type BodyRegistry } from '../core/bodyProtocol/index.js';
import { AgentLoop } from '../core/agentLoop.js';
import { type VietnameseSttEngine } from './sttEngine.js';
import { type VietnameseTtsEngine } from './ttsEngine.js';
import { PiperTtsEngine } from './piperTtsEngine.js';
/** Hằng số timeout tổng thể mặc định cho toàn bộ một lượt tương tác hỏi-đáp bằng giọng nói (30s) */
export declare const MAX_E2E_TIMEOUT_MS: number;
export type VoicePipelineStage = 'INITIALIZATION' | 'CAPTURE' | 'STT' | 'BRAIN' | 'TTS' | 'PLAYBACK' | 'COMPLETED';
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
    /** Maximum end-to-end roundtrip timeout in milliseconds (default: 30000ms from CONFIG) */
    maxE2eTimeoutMs?: number;
    /** Optional mock transcription for deterministic unit testing ONLY */
    simulatedTranscript?: string;
    /** Optional audio buffer override for deterministic STT testing without human speaking */
    audioBufferOverride?: Buffer;
    /** Optional execution token for privileged actions (Level 4 PDP) */
    executionToken?: string;
}
export interface VoiceRoundtripResult {
    success: boolean;
    correlationId: string;
    bodyId: string;
    userText: string;
    /** PII-redacted text safe for downstream long-term storage */
    redactedUserText?: string;
    /** Types of PII detected in user speech transcript (if any) */
    detectedPiiTypes?: string[];
    responseText: string;
    agentLoopState: string;
    captureDurationMs: number;
    sttDurationMs: number;
    brainDurationMs: number;
    ttsDurationMs: number;
    playbackDurationMs: number;
    totalDurationMs: number;
    error?: string;
    stageAtError?: VoicePipelineStage;
    audioCapture?: {
        format: string;
        byteLength: number;
        sampleRate: number;
    };
    audioPlayback?: {
        deviceName?: string;
    };
}
export declare class VoicePipeline {
    private bodyRegistry;
    private agentLoop;
    private stt;
    private tts;
    private piperTts;
    constructor(bodyRegistry?: BodyRegistry, agentLoop?: AgentLoop, stt?: VietnameseSttEngine, tts?: VietnameseTtsEngine, piperTts?: PiperTtsEngine);
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
    executeVoiceRoundtrip(options?: VoiceRoundtripOptions): Promise<VoiceRoundtripResult>;
    /**
     * EN: Resolve target body ID (picks first connected body with audio.capture capability).
     * VI: Xác định ID của body đang kết nối có hỗ trợ năng lực audio.capture.
     */
    private resolveActiveBodyId;
    /**
     * EN: Records privacy-preserving audit metadata. Never writes raw microphone audio.
     * VI: Ghi nhận siêu dữ liệu kiểm toán bảo vệ quyền riêng tư. Tuyệt đối không ghi âm thanh thô.
     */
    private recordAuditMetadata;
}
export declare const globalVoicePipeline: VoicePipeline;
