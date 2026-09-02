export interface SoundSourceEstimate {
    estimatedPanAngle: number;
    confidence: number;
    sourceDirection: 'left' | 'center' | 'right';
    intensityDb: number;
}
export declare class SoundLocalizationEngine {
    private currentPanAngle;
    private currentTiltAngle;
    /**
     * Ước lượng hướng âm thanh từ năng lượng micro đa kênh hoặc dữ liệu cảm biến
     */
    estimateSoundDirection(micLeftEnergy: number, micRightEnergy: number, totalRmsDb?: number): SoundSourceEstimate;
    /**
     * Tự động xoay đầu Robot nhìn về hướng giọng nói của Sếp
     */
    trackAndAimHeadAtSound(micLeftEnergy: number, micRightEnergy: number): Promise<{
        success: boolean;
        targetAngle: number;
        direction: string;
    }>;
    getCurrentOrientation(): {
        pan: number;
        tilt: number;
    };
}
export declare const globalSoundLocalization: SoundLocalizationEngine;
