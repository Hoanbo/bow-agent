import { type GovernedExecutionResultEnvelope, type GovernedExecutionState, type GovernedExecutionOutcome, type ExecutionFailure, type ExecutionTelemetry, type ExecutionRequest } from './executionTypes.js';
export declare class ExecutionResultFailureManager {
    /**
     * EN: Creates a sanitized, cryptographically sealed successful execution result envelope.
     * VI: Tạo một phong bì kết quả thực thi thành công đã được khử trùng và niêm phong mật mã.
     */
    static createSuccessEnvelope(params: {
        readonly executionId: string;
        readonly request: ExecutionRequest;
        readonly output: Readonly<Record<string, unknown>>;
        readonly telemetry: ExecutionTelemetry;
        readonly sessionVersion: number;
    }): GovernedExecutionResultEnvelope;
    /**
     * EN: Creates a sanitized, cryptographically sealed failure execution result envelope.
     * VI: Tạo một phong bì kết quả thực thi thất bại đã được khử trùng và niêm phong mật mã.
     */
    static createFailureEnvelope(params: {
        readonly executionId: string;
        readonly request: ExecutionRequest;
        readonly state: GovernedExecutionState;
        readonly outcome: GovernedExecutionOutcome;
        readonly error: Error | unknown;
        readonly category: ExecutionFailure['category'];
        readonly telemetry: ExecutionTelemetry;
        readonly sessionVersion: number;
    }): GovernedExecutionResultEnvelope;
}
