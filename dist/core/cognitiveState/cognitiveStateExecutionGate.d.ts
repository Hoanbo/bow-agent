export declare class CognitiveStateExecutionGate {
    private readonly userStopProvider?;
    constructor(userStopProvider?: () => boolean);
    /**
     * Returns true if USER_STOP is currently active.
     */
    isUserStopActive(): boolean;
    /**
     * Synchronously verifies that USER_STOP is not active.
     * Fails closed by throwing CognitiveStateUserStopError immediately.
     */
    assertNoUserStop(checkpoint: string): void;
    /**
     * Verifies that the tenant identity matches the authorized active tenant.
     */
    assertTenantIsolation(requestedTenant: string, activeTenant?: string): void;
    /**
     * Validates identity tokens against path traversal, null bytes, and Windows reserved names.
     */
    assertSafeIdentity(id: string, fieldName: string): void;
    /**
     * Guarantees that an object contains zero execution capabilities or execution methods.
     */
    assertNoExecutionAuthority(target: any, objectName?: string): void;
}
export declare const defaultCognitiveExecutionGate: CognitiveStateExecutionGate;
