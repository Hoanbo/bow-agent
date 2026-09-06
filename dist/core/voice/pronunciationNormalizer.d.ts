export interface PronunciationDictionary {
    [term: string]: {
        vi: string;
        en: string;
    };
}
export declare const TECHNICAL_PRONUNCIATION_MAP: PronunciationDictionary;
/**
 * Normalizes technical terms and acronyms into natural phonetics for spoken audio.
 */
export declare function normalizePronunciation(text: string, language?: string): string;
