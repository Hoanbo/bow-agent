export interface SpeechSegment {
    index: number;
    text: string;
    spokenText?: string;
    pauseBeforeMs: number;
    pauseAfterMs: number;
    emphasis: 'none' | 'mild' | 'strong';
    speedMultiplier: number;
    segmentType: 'normal' | 'short_confirmation' | 'question' | 'important' | 'explanation';
}
export interface SegmenterOptions {
    minSegmentLength?: number;
    maxSegmentLength?: number;
}
/**
 * Segments raw or preprocessed speech text into structured conversational segments.
 */
export declare function segmentSpeech(text: string, options?: SegmenterOptions): SpeechSegment[];
