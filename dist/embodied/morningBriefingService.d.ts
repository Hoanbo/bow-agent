import { MorningDigest } from './nightlyHunterDaemon.js';
export interface BriefingExecutionResult {
    speechText: string;
    digest: MorningDigest;
    robotActions: {
        servoAngle: number;
        eyesEmotion: string;
        deskLightStatus: string;
    };
    executedAt: string;
}
export declare class MorningBriefingService {
    /**
     * Tạo văn bản đọc bản tin buổi sáng súc tích và truyền cảm
     */
    generateBriefingScript(digest: MorningDigest): string;
    /**
     * Kích hoạt kịch bản chào buổi sáng hoàn chỉnh kết hợp cử chỉ Robot
     */
    executeMorningBriefing(): Promise<BriefingExecutionResult>;
}
export declare const globalMorningBriefing: MorningBriefingService;
