/**
 * EN: Computes a 32-bit FNV-1a hash formatted as a hex string with a prefix.
 * VI: Tính toán mã băm FNV-1a 32-bit được định dạng chuỗi hex kèm tiền tố.
 */
export declare function computeDeterministicExecutionFingerprint(userId: string, sessionId: string, actionType: string, sourceDecisionFingerprint: string, parameters?: Readonly<Record<string, unknown>>): string;
