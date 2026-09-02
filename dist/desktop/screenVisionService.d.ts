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
    targetDisplay?: 'primary' | 'secondary' | 'screen_1' | 'screen_2' | 'all' | number;
    screenIndex?: number;
    imageBase64?: string;
}
export declare const SAMPLE_FALLBACK_SCREEN_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
export declare class ScreenVisionService {
    /**
     * Capture Windows screen as Base64 PNG supporting Multi-Monitor setup (0% GPU, pure OS)
     * @param target 'primary' (màn chính của Sếp) | 'secondary' (màn phụ) | 'screen_1' | 'screen_2' | 'all' | number
     */
    captureScreenBase64(target?: string | number): Promise<string>;
    /**
     * Analyze screen image using Gemini Multimodal Vision API (Free Tier)
     */
    inspectScreenForNotifications(options?: ScreenInspectionOptions): Promise<ScreenNotificationResult>;
}
export declare const screenVisionService: ScreenVisionService;
