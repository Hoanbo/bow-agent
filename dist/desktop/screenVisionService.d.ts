export interface ScreenNotificationResult {
    success: boolean;
    detectedApp: 'Facebook' | 'Zalo' | 'Telegram' | 'Gmail' | 'Browser' | 'IDE' | 'Unknown';
    senderName?: string;
    messageText?: string;
    timestampText?: string;
    unreadCount?: number;
    summary: string;
    rawVisualInsight?: string;
    recommendedReply?: string;
}
export interface ScreenInspectionOptions {
    userQuery?: string;
    focusApp?: string;
    imageBase64?: string;
}
export declare const SAMPLE_FALLBACK_SCREEN_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
export declare class ScreenVisionService {
    /**
     * Capture the primary Windows screen as a Base64 PNG using native PowerShell (0% GPU, pure OS)
     */
    captureScreenBase64(): Promise<string>;
    /**
     * Analyze screen image using Gemini Multimodal Vision API (Free Tier)
     */
    inspectScreenForNotifications(options?: ScreenInspectionOptions): Promise<ScreenNotificationResult>;
}
export declare const screenVisionService: ScreenVisionService;
