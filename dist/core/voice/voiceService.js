// src/core/voice/voiceService.ts
// BOWCON V4.0 — CENTRAL VOICE SERVICE RUNTIME (MILESTONE 1.3.6)
//
// EN:
// VoiceService is the provider-independent TTS orchestrator for the BOWCON agent.
// It abstracts the AgentLoop from any specific TTS implementation.
// The AgentLoop never knows which TTS provider (OpenAI, ElevenLabs, Mock) is active.
// Voice synthesis failures are completely isolated: they never crash the AgentLoop
// or change the text content of the agent's response.
//
// Before synthesis, text goes through a quality pipeline:
// SpeechTextProcessor → SpeechSegmenter → VoiceProsodyPlanner → Provider → AudioAssembler
//
// VI:
// VoiceService là bộ điều phối TTS độc lập với provider cho agent BOWCON.
// Nó trừu tượng hóa AgentLoop khỏi bất kỳ triển khai TTS cụ thể nào.
// AgentLoop không bao giờ biết provider TTS (OpenAI, ElevenLabs, Mock) nào đang hoạt động.
// Lỗi tổng hợp giọng nói được cô lập hoàn toàn: chúng không bao giờ làm crash AgentLoop
// hoặc thay đổi nội dung văn bản của phản hồi agent.
//
// Trước khi tổng hợp, văn bản đi qua quy trình chất lượng:
// SpeechTextProcessor → SpeechSegmenter → VoiceProsodyPlanner → Provider → AudioAssembler
//
// Invariants (Bất biến):
// 1. AgentLoop giao tiếp độc quyền qua VoiceService (Độc lập với Provider).
// 2. Biên giới provider không trạng thái: Không có trạng thái giọng nói có thể thay đổi ở cấp module.
// 3. Cô lập user & session: Phạm vi ngữ cảnh mà không có rò rỉ trạng thái toàn cục.
// 4. Toàn vẹn văn bản (INV-1/INV-7): Văn bản gốc không bao giờ bị thay đổi.
// 5. Cô lập lỗi provider (INV-8): Lỗi TTS không làm crash suy luận agent.
// 6. Cô lập bí mật (INV-9/INV-15): Thông tin xác thực và API key được xóa tự động.
// 7. Ngữ điệu hội thoại & phân đoạn câu (INV-2, INV-3, INV-4, INV-5).
// 8. Đàm phán năng lực provider & dự phòng (INV-9, INV-13).
// 9. Tổng hợp cấp câu & lắp ráp âm thanh (INV-10, INV-11).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MockTtsProvider } from './providers/mockTtsProvider.js';
import { OpenAiTtsProvider } from './providers/openAiTtsProvider.js';
import { ElevenLabsProvider } from './providers/elevenLabsProvider.js';
import { DEFAULT_VOICE_TIMEOUT_MS, DEFAULT_MAX_TEXT_LENGTH, validateVoiceConfig, } from './voiceConfig.js';
import { processAndPlanSpeech } from './speechTextProcessor.js';
import { AudioAssembler } from './audioAssembler.js';
import { negotiateCapabilities } from './voiceCapabilities.js';
import { VoiceSecurityError, VoiceTimeoutError, VoiceSynthesisError, redactSecrets, } from './voiceErrors.js';
export class VoiceService {
    providers = new Map();
    defaultProviderId = 'mock';
    constructor(initialProviders) {
        if (initialProviders !== undefined) {
            for (const p of initialProviders) {
                this.registerProvider(p);
            }
            if (initialProviders.length > 0) {
                this.defaultProviderId = initialProviders[0].getProviderId();
            }
        }
        else {
            // Default built-in registry
            this.registerProvider(new MockTtsProvider());
            this.registerProvider(new OpenAiTtsProvider());
            this.registerProvider(new ElevenLabsProvider());
            this.defaultProviderId = 'mock';
        }
    }
    /**
     * Registers or replaces a TTS provider adapter.
     */
    registerProvider(provider) {
        if (!provider || typeof provider.getProviderId !== 'function') {
            throw new Error('Invalid TTSProvider instance');
        }
        this.providers.set(provider.getProviderId().toLowerCase(), provider);
    }
    /**
     * Retrieves a registered provider by its identifier.
     */
    getProvider(providerId) {
        const id = (providerId || this.defaultProviderId).toLowerCase();
        return this.providers.get(id);
    }
    /**
     * Inspects static capabilities of a registered provider.
     */
    getCapabilities(providerId) {
        const provider = this.getProvider(providerId);
        return provider?.getCapabilities();
    }
    /**
     * Lists all registered provider identifiers.
     */
    listProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Sets the fallback default provider identifier.
     */
    setDefaultProvider(providerId) {
        const id = providerId.toLowerCase();
        if (!this.providers.has(id)) {
            throw new Error(`Cannot set unknown default provider: "${providerId}"`);
        }
        this.defaultProviderId = id;
    }
    /**
     * Validates a voice configuration against service bounds and provider limits.
     */
    validateConfiguration(config) {
        const baseVal = validateVoiceConfig(config);
        if (!baseVal.valid) {
            return baseVal;
        }
        const providerId = config.provider || this.defaultProviderId;
        const provider = this.getProvider(providerId);
        if (!provider) {
            return {
                valid: false,
                errors: [`VOICE_PROVIDER_NOT_FOUND: Requested voice provider "${providerId}" is not registered. Registered: ${this.listProviders().join(', ')}`],
            };
        }
        return provider.validate(baseVal.config || config);
    }
    /**
     * Core voice synthesis execution path.
     *
     * Guarantees:
     * - Does NOT modify request.text (Text Integrity INV-1 / INV-7).
     * - Executes speech normalization, sentence segmentation, and prosody planning.
     * - Handles sentence-level synthesis and audio assembly when enabled.
     * - Executes deterministic provider fallback if primary fails (INV-13).
     * - Times out cleanly after configured deadline without hanging.
     * - Returns structured VoiceResult; never throws unhandled exceptions to caller.
     * - Sanitizes error messages to prevent secret leaks (INV-15).
     */
    async synthesize(request) {
        const startTime = Date.now();
        const config = request.voiceConfig || {};
        const defaultFormat = config.outputFormat || 'audio/wav';
        const primaryProviderId = (config.provider || this.defaultProviderId).toLowerCase();
        let speechText = '';
        try {
            // 1. Text presence and validity
            if (!request.text || typeof request.text !== 'string' || !request.text.trim()) {
                return {
                    success: false,
                    provider: primaryProviderId,
                    audioFormat: defaultFormat,
                    speechText: '',
                    error: 'VOICE_INVALID_INPUT: Text must be a non-empty string.',
                };
            }
            // 2. Text length boundary check (INV-16)
            const maxLen = config.maxTextLength || DEFAULT_MAX_TEXT_LENGTH;
            if (request.text.length > maxLen) {
                return {
                    success: false,
                    provider: primaryProviderId,
                    audioFormat: defaultFormat,
                    speechText: '',
                    error: `VOICE_TEXT_TOO_LONG: Text length (${request.text.length}) exceeds maximum limit (${maxLen} characters).`,
                };
            }
            // 3. Validate voice configuration
            if (request.voiceConfig) {
                const configVal = this.validateConfiguration(request.voiceConfig);
                if (!configVal.valid) {
                    return {
                        success: false,
                        provider: primaryProviderId,
                        audioFormat: defaultFormat,
                        speechText: '',
                        error: `VOICE_CONFIG_INVALID: ${configVal.errors?.join('; ') || 'Invalid configuration'}`,
                    };
                }
            }
            // 4. Preprocess speech, segment into sentences, and plan prosody (INV-2, INV-3, INV-4, INV-5, INV-6, INV-7)
            const language = request.language || config.language || 'vi-VN';
            const planned = processAndPlanSpeech(request.text, {
                language,
                personality: config.personality || config.personalityPreset,
            });
            speechText = planned.speechText;
            // 5. Build candidate provider chain for fallback (INV-13)
            const candidateChain = [primaryProviderId];
            if (config.fallbackProviders && Array.isArray(config.fallbackProviders)) {
                for (const fb of config.fallbackProviders) {
                    const lower = fb.toLowerCase().trim();
                    if (!candidateChain.includes(lower)) {
                        candidateChain.push(lower);
                    }
                }
            }
            // 6. Iterate through providers in candidate chain
            let lastError = null;
            const timeoutMs = config.timeoutMs || DEFAULT_VOICE_TIMEOUT_MS;
            for (const providerId of candidateChain) {
                const provider = this.getProvider(providerId);
                if (!provider) {
                    lastError = new Error(`VOICE_PROVIDER_NOT_FOUND: Voice provider "${providerId}" is not registered.`);
                    continue;
                }
                try {
                    // Negotiate capabilities with active provider (INV-9)
                    const capabilities = provider.getCapabilities();
                    const negotiation = negotiateCapabilities(capabilities, config, {
                        wantsSentenceLevel: Boolean(config.enableSentenceLevel),
                        wantsSsml: Boolean(config.enableProsody),
                    });
                    let response;
                    // Check if sentence-level synthesis should be used (INV-10 & INV-11)
                    if (negotiation.useSentenceLevel && planned.segments.length > 1) {
                        const chunks = [];
                        for (const seg of planned.segments) {
                            const segText = seg.spokenText || seg.text;
                            const segResponse = await this.executeWithTimeout(provider.synthesize({
                                ...request,
                                language,
                                text: segText,
                                voiceConfig: {
                                    ...config,
                                    speed: Math.round(((config.speed || 1.0) * seg.speedMultiplier) * 100) / 100,
                                },
                            }), timeoutMs);
                            if (!segResponse.success || !segResponse.audioData) {
                                throw new VoiceSynthesisError(segResponse.error || `Segment synthesis failed for segment: "${segText}"`);
                            }
                            chunks.push({
                                audioData: segResponse.audioData,
                                format: segResponse.audioFormat,
                                pauseAfterMs: seg.pauseAfterMs,
                                sampleRate: config.sampleRate,
                            });
                        }
                        // Assemble chunks into final audio buffer (INV-11)
                        const assembledData = AudioAssembler.assemble(chunks, defaultFormat, config.sampleRate);
                        response = {
                            success: true,
                            provider: providerId,
                            audioFormat: defaultFormat,
                            audioData: assembledData,
                            durationMs: Date.now() - startTime,
                            speechText,
                            metadata: {
                                sentenceLevel: true,
                                segmentCount: planned.segments.length,
                                personality: planned.prosodyPlan.overallSpeakingRate,
                            },
                        };
                    }
                    else {
                        // Monolithic synthesis
                        const textToSynthesize = negotiation.useSsml && planned.prosodyPlan.ssmlRepresentation
                            ? planned.prosodyPlan.ssmlRepresentation
                            : speechText;
                        response = await this.executeWithTimeout(provider.synthesize({
                            ...request,
                            language,
                            text: textToSynthesize,
                        }), timeoutMs);
                    }
                    if (response.success) {
                        // Optional safe disk persistence if outputDir is configured (Security Sandboxed)
                        let filePath;
                        if (config.outputDir && response.audioData) {
                            filePath = this.persistAudioToDisk(response.audioData, response.audioFormat, config.outputDir);
                        }
                        return {
                            ...response,
                            speechText,
                            filePath,
                            durationMs: response.durationMs || (Date.now() - startTime),
                            metadata: {
                                ...response.metadata,
                                segmentsCount: planned.segments.length,
                                fallbackUsed: providerId !== primaryProviderId,
                                activeProvider: providerId,
                            },
                        };
                    }
                    else {
                        lastError = new Error(response.error || 'Provider returned unsuccessful status');
                    }
                }
                catch (provErr) {
                    lastError = provErr;
                    // Continue loop to try next fallback provider in chain
                }
            }
            // If loop finishes without returning, all providers in candidate chain failed
            const safeErrorMsg = redactSecrets(lastError?.message || 'Synthesis execution failed across all candidate providers');
            return {
                success: false,
                provider: primaryProviderId,
                audioFormat: defaultFormat,
                speechText: speechText || request.text || '',
                error: safeErrorMsg,
            };
        }
        catch (err) {
            const safeErrorMsg = redactSecrets(err?.message || 'Synthesis execution failed');
            return {
                success: false,
                provider: primaryProviderId,
                audioFormat: defaultFormat,
                speechText: speechText || request.text || '',
                error: safeErrorMsg,
            };
        }
    }
    /**
     * Streaming-ready interface contract (Section 8, 22, INV-12).
     */
    async *synthesizeStream(request) {
        const config = request.voiceConfig || {};
        const providerId = (config.provider || this.defaultProviderId).toLowerCase();
        const provider = this.getProvider(providerId);
        if (!provider) {
            throw new Error(`Voice provider "${providerId}" not found for streaming.`);
        }
        const language = request.language || config.language || 'vi-VN';
        const planned = processAndPlanSpeech(request.text, {
            language,
            personality: config.personality || config.personalityPreset,
        });
        // If provider natively supports synthesizeStream, delegate to it
        if (typeof provider.synthesizeStream === 'function') {
            yield* provider.synthesizeStream({
                ...request,
                language,
                text: planned.speechText,
            });
            return;
        }
        // If sentence-level streaming is viable: yield chunks sentence-by-sentence (INV-12)
        if (config.enableSentenceLevel && planned.segments.length > 1) {
            for (const seg of planned.segments) {
                const segRes = await provider.synthesize({
                    ...request,
                    language,
                    text: seg.spokenText || seg.text,
                });
                if (segRes.audioData) {
                    yield segRes.audioData;
                }
            }
            return;
        }
        // Default fallback: monolithic synthesis yielding complete buffer
        const res = await provider.synthesize({
            ...request,
            language,
            text: planned.speechText,
        });
        if (res.audioData) {
            yield res.audioData;
        }
    }
    /**
     * Wraps a promise with an explicit deadline timeout.
     */
    async executeWithTimeout(promise, timeoutMs) {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => {
                reject(new VoiceTimeoutError(`VOICE_TIMEOUT: Synthesis operation exceeded deadline of ${timeoutMs}ms`));
            }, timeoutMs);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
    }
    /**
     * Persists synthesized audio data to an enforced, sandboxed directory.
     */
    persistAudioToDisk(audioData, format, outputDir) {
        const resolvedDir = path.resolve(outputDir);
        // Verify containment and create directory
        fs.mkdirSync(resolvedDir, { recursive: true });
        const extMap = {
            'audio/mpeg': 'mp3',
            'audio/wav': 'wav',
            'audio/pcm': 'pcm',
        };
        const ext = extMap[format] || 'bin';
        const filename = `voice_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const targetPath = path.join(resolvedDir, filename);
        // Ensure targetPath does not escape resolvedDir
        const normalizedTarget = path.resolve(targetPath);
        if (!normalizedTarget.startsWith(resolvedDir)) {
            throw new VoiceSecurityError('Path traversal detected during audio file output write');
        }
        fs.writeFileSync(normalizedTarget, audioData);
        return normalizedTarget;
    }
}
/**
 * Authoritative global voice service singleton.
 */
export const globalVoiceService = new VoiceService();
