export interface FaceDetectionResult {
    personIdentified: boolean;
    identity: 'BOSS' | 'GUEST' | 'NONE';
    confidence: number;
    faceCoordinates?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    servoTrackingTarget: {
        panAngle: number;
        tiltAngle: number;
    };
    greetingMessage?: string;
    emotionTrigger: 'happy' | 'neutral' | 'curious';
}
export declare class PhysicalVisionService {
    /**
     * Process a camera frame from Robot physical eye
     */
    analyzeCameraFrame(framePayload?: Buffer | string, mode?: 'auto' | 'boss_simulation' | 'guest_simulation'): Promise<FaceDetectionResult>;
}
export declare const physicalVisionService: PhysicalVisionService;
