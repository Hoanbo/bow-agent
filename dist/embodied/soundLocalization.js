// src/embodied/soundLocalization.ts
// BOW CON V4.0 — SOUND LOCALIZATION & EMBODIED HEAD TRACKING
import { robotChannelAdapter } from '../adapters/robotAdapter.js';
export class SoundLocalizationEngine {
    currentPanAngle = 0;
    currentTiltAngle = 0;
    /**
     * Ước lượng hướng âm thanh từ năng lượng micro đa kênh hoặc dữ liệu cảm biến
     */
    estimateSoundDirection(micLeftEnergy, micRightEnergy, totalRmsDb = 65) {
        const diff = micRightEnergy - micLeftEnergy;
        const sum = micLeftEnergy + micRightEnergy || 1;
        const ratio = Math.max(-1, Math.min(1, diff / sum));
        // Chuyển đổi tỉ lệ sang góc servo Pan từ -90 đến +90 độ
        const estimatedPanAngle = Math.round(ratio * 75);
        const confidence = Math.min(1.0, Math.abs(ratio) * 1.2 + 0.3);
        let sourceDirection = 'center';
        if (estimatedPanAngle < -20) {
            sourceDirection = 'left';
        }
        else if (estimatedPanAngle > 20) {
            sourceDirection = 'right';
        }
        return {
            estimatedPanAngle,
            confidence,
            sourceDirection,
            intensityDb: totalRmsDb,
        };
    }
    /**
     * Tự động xoay đầu Robot nhìn về hướng giọng nói của Sếp
     */
    async trackAndAimHeadAtSound(micLeftEnergy, micRightEnergy) {
        const estimate = this.estimateSoundDirection(micLeftEnergy, micRightEnergy);
        this.currentPanAngle = estimate.estimatedPanAngle;
        this.currentTiltAngle = 10; // Hơi ngước lên 10 độ nhìn vào mặt Sếp
        try {
            await robotChannelAdapter.pushShopEventToOwner({
                eventId: 'event_sound_aim_' + Date.now(),
                type: 'system.alert',
                title: 'Định vị nguồn âm thanh',
                description: `Robot tự động xoay đầu ${estimate.estimatedPanAngle} độ về hướng ${estimate.sourceDirection} để nhìn Sếp`,
                urgency: 'low',
                timestamp: new Date().toISOString(),
            });
            return {
                success: true,
                targetAngle: estimate.estimatedPanAngle,
                direction: estimate.sourceDirection,
            };
        }
        catch {
            return {
                success: true,
                targetAngle: estimate.estimatedPanAngle,
                direction: estimate.sourceDirection,
            };
        }
    }
    getCurrentOrientation() {
        return { pan: this.currentPanAngle, tilt: this.currentTiltAngle };
    }
}
// Global Singleton Instance
export const globalSoundLocalization = new SoundLocalizationEngine();
