// src/core/voice/voiceProsody.ts
// BOWCON V4.0 — CONVERSATIONAL PROSODY PLANNER (MILESTONE 1.3.6)
//
// Invariants:
// - INV-3: Conversational Pause Planning (Structured internal pause metadata)
// - INV-4: Natural Speaking Rate (Pacing tailored to sentence semantics and personality)
// - INV-5: Emphasis Planning (Internal emphasis metadata without altering text)
import { resolveVoicePersonality } from './voicePersonality.js';
const CRITICAL_KEYWORDS = /\b(thành công|hoàn tất|lỗi|thất bại|cảnh báo|nguy hiểm|khẩn cấp|chú ý|success|completed|failed|error|warning|critical|alert)\b/i;
/**
 * Plans pauses, speaking rate, and emphasis across all speech segments based on
 * sentence semantics and the configured voice personality.
 */
export function planProsody(segments, options = {}) {
    const personality = resolveVoicePersonality(options.personality);
    const pauseIntensity = personality.pauseIntensity ?? 1.0;
    const baseSpeakingRate = personality.speakingRate ?? 1.0;
    const emphasisIntensity = personality.emphasisIntensity ?? 0.5;
    let totalPauseMs = 0;
    const plannedSegments = segments.map((seg, idx) => {
        let segRate = baseSpeakingRate;
        let segPause = 350;
        let emphasis = 'none';
        // 1. Rate and Pause adjustment based on semantic segment type (INV-3 & INV-4)
        switch (seg.segmentType) {
            case 'short_confirmation':
                // Short confirmations: slightly brisker pacing, compact pause
                segRate = baseSpeakingRate * 1.06;
                segPause = 250 * pauseIntensity;
                emphasis = emphasisIntensity >= 0.5 ? 'mild' : 'none';
                break;
            case 'question':
                // Questions: natural cadence, slight pause for thought
                segRate = baseSpeakingRate * 1.0;
                segPause = 400 * pauseIntensity;
                emphasis = 'none';
                break;
            case 'important':
                // Important statements/alerts: deliberate, controlled, slightly slower
                segRate = baseSpeakingRate * 0.93;
                segPause = 450 * pauseIntensity;
                emphasis = emphasisIntensity >= 0.3 ? 'strong' : 'mild';
                break;
            case 'explanation':
                // Explanations (>20 words): measured pacing to ensure comprehension
                segRate = baseSpeakingRate * 0.94;
                segPause = 350 * pauseIntensity;
                break;
            case 'normal':
            default:
                segRate = baseSpeakingRate * 1.0;
                segPause = 320 * pauseIntensity;
                break;
        }
        // Keyword emphasis detection (INV-5)
        if (CRITICAL_KEYWORDS.test(seg.text) && emphasis === 'none') {
            emphasis = emphasisIntensity >= 0.4 ? 'mild' : 'none';
        }
        // Last segment natural trailing pause
        if (idx === segments.length - 1) {
            segPause = 200 * pauseIntensity;
        }
        // Round pauses to 10ms boundary for cleaner audio alignment
        const finalPause = Math.max(50, Math.round(segPause / 10) * 10);
        totalPauseMs += finalPause;
        return {
            ...seg,
            speedMultiplier: Math.round(segRate * 100) / 100,
            pauseAfterMs: finalPause,
            emphasis,
        };
    });
    // Generate optional SSML representation for providers supporting SSML
    const ssml = generateSsml(plannedSegments);
    return {
        segments: plannedSegments,
        overallSpeakingRate: baseSpeakingRate,
        totalEstimatedPauseMs: totalPauseMs,
        ssmlRepresentation: ssml,
    };
}
/**
 * Builds standard SSML document from planned segments for providers that support SSML.
 */
export function generateSsml(segments) {
    const parts = ['<speak>'];
    for (const seg of segments) {
        const ratePercent = Math.round(seg.speedMultiplier * 100);
        let content = seg.spokenText || seg.text;
        // Apply SSML emphasis tag if specified
        if (seg.emphasis === 'strong') {
            content = `<emphasis level="strong">${content}</emphasis>`;
        }
        else if (seg.emphasis === 'mild') {
            content = `<emphasis level="moderate">${content}</emphasis>`;
        }
        // Escape basic XML characters in text
        content = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        parts.push(`<prosody rate="${ratePercent}%">${content}</prosody>`);
        if (seg.pauseAfterMs > 0) {
            parts.push(`<break time="${seg.pauseAfterMs}ms"/>`);
        }
    }
    parts.push('</speak>');
    return parts.join('');
}
