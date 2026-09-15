import { type ExecutionEnvironmentSnapshot, type ExecutionEnvironmentValidity } from './multiStepExecutionTypes.js';
export interface EnvironmentVerificationOutcome {
    readonly validity: ExecutionEnvironmentValidity;
    readonly reason: string;
    readonly driftedPreconditions: readonly string[];
    readonly snapshot: ExecutionEnvironmentSnapshot;
}
export interface CaptureSnapshotParams {
    readonly tenantId: string;
    readonly sessionId: string;
    readonly generationId: string;
    readonly stepId?: string;
    readonly screenStateHash?: string;
    readonly observedElements?: readonly {
        readonly id: string;
        readonly label?: string;
        readonly bounds?: unknown;
    }[];
    readonly systemPreconditions: Record<string, boolean | string | number>;
    readonly observedPreconditions: Record<string, boolean | string | number>;
}
export declare class ExecutionEnvironmentMonitor {
    private readonly userStopProvider;
    constructor(options?: {
        readonly userStopProvider?: () => boolean;
    });
    /**
     * EN: Captures an immutable, cryptographically sealed environment snapshot.
     * VI: Ghi lại một ảnh chụp môi trường bất biến, được niêm phong mật mã.
     */
    captureSnapshot(params: CaptureSnapshotParams): ExecutionEnvironmentSnapshot;
    /**
     * EN: Compares observed environment snapshot against expected preconditions and classifies validity.
     * VI: So sánh ảnh chụp môi trường quan sát được với các điều kiện tiên quyết dự kiến và phân loại tính hợp lệ.
     */
    verifyEnvironmentState(snapshot: ExecutionEnvironmentSnapshot, expectedPreconditions: Readonly<Record<string, boolean | string | number>>): EnvironmentVerificationOutcome;
}
