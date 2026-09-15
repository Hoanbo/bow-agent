import { type GovernedLongHorizonObjective, type LongHorizonAutonomyBudget, type LongHorizonGeneration, type LongHorizonProgressRecord, type LongHorizonSession, type LongHorizonSessionDocument } from './longHorizonExecutionTypes.js';
export declare class LongHorizonExecutionValidator {
    /**
     * EN: Recursively sanitizes and validates an object against prototype pollution, CoT, and prompt injection.
     * VI: Đệ quy khử trùng và xác thực đối tượng chống ô nhiễm prototype, CoT và tiêm nhiễm prompt.
     */
    static sanitizeAndValidateData(obj: unknown, path?: string): void;
    /**
     * EN: Validates tenant and session IDs across boundaries.
     * VI: Xác thực mã định danh tenant và session qua các ranh giới.
     */
    static validateIsolation(expectedTenantId: string, expectedSessionId: string, actualTenantId: string, actualSessionId: string): void;
    /**
     * EN: Validates autonomy budget constraints against system-wide maximums.
     * VI: Xác thực các ràng buộc ngân sách tự chủ so với mức tối đa toàn hệ thống.
     */
    static validateBudget(budget: LongHorizonAutonomyBudget): void;
    /**
     * EN: Validates a GovernedLongHorizonObjective envelope.
     * VI: Xác thực một phong bì mục tiêu GovernedLongHorizonObjective.
     */
    static validateObjective(objective: GovernedLongHorizonObjective): void;
    /**
     * EN: Validates a LongHorizonGeneration record.
     * VI: Xác thực một bản ghi thế hệ LongHorizonGeneration.
     */
    static validateGeneration(generation: LongHorizonGeneration): void;
    /**
     * EN: Validates a LongHorizonProgressRecord.
     * VI: Xác thực một bản ghi tiến trình LongHorizonProgressRecord.
     */
    static validateProgressRecord(record: LongHorizonProgressRecord): void;
    /**
     * EN: Validates a LongHorizonSession object.
     * VI: Xác thực đối tượng LongHorizonSession.
     */
    static validateSession(session: LongHorizonSession): void;
    /**
     * EN: Validates a LongHorizonSessionDocument for persistence.
     * VI: Xác thực tài liệu LongHorizonSessionDocument để lưu trữ.
     */
    static validateSessionDocument(doc: LongHorizonSessionDocument): void;
    validateObjectiveEnvelope(objective: GovernedLongHorizonObjective): void;
    validateObjective(objective: GovernedLongHorizonObjective): void;
    validateObjectiveScope(objective: GovernedLongHorizonObjective, requestedScope: string[]): void;
    validatePrototypePollution(obj: unknown): void;
    validateNoCoT(obj: unknown): void;
    validateObjectiveProvenance(objective: GovernedLongHorizonObjective): void;
    validateReplanningRequest(req: any): void;
}
