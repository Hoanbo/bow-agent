// src/core/cognitiveState/cognitiveStateExecutionGate.ts
// BOWCON V4.0 — MS-1.5.02: COGNITIVE STATE EXECUTION & SECURITY GATE
// Component 995 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// COGNITIVE_STATE != EXECUTION
// USER_STOP_SUPREMACY == TRUE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// STRICT_TENANT_CONFINEMENT == TRUE
import { CognitiveStateUserStopError, CrossTenantCognitiveStateError, CognitiveStateValidationError, } from './cognitiveStateTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
export class CognitiveStateExecutionGate {
    userStopProvider;
    constructor(userStopProvider) {
        this.userStopProvider = userStopProvider;
    }
    /**
     * Returns true if USER_STOP is currently active.
     */
    isUserStopActive() {
        if (this.userStopProvider && this.userStopProvider()) {
            return true;
        }
        try {
            return globalMasterHumanAuthority.isUserStopActive;
        }
        catch {
            return false;
        }
    }
    /**
     * Synchronously verifies that USER_STOP is not active.
     * Fails closed by throwing CognitiveStateUserStopError immediately.
     */
    assertNoUserStop(checkpoint) {
        if (this.isUserStopActive()) {
            throw new CognitiveStateUserStopError(checkpoint);
        }
    }
    /**
     * Verifies that the tenant identity matches the authorized active tenant.
     */
    assertTenantIsolation(requestedTenant, activeTenant) {
        this.assertSafeIdentity(requestedTenant, 'tenantId');
        if (activeTenant && requestedTenant.trim() !== activeTenant.trim()) {
            throw new CrossTenantCognitiveStateError(requestedTenant, activeTenant);
        }
    }
    /**
     * Validates identity tokens against path traversal, null bytes, and Windows reserved names.
     */
    assertSafeIdentity(id, fieldName) {
        if (!id || typeof id !== 'string' || !id.trim()) {
            throw new CognitiveStateValidationError(`${fieldName} must be a non-empty string`, ['EMPTY_IDENTIFIER']);
        }
        const trimmed = id.trim();
        if (trimmed.includes('\0')) {
            throw new CognitiveStateValidationError(`Null-byte injection detected in ${fieldName}`, ['NULL_BYTE_INJECTION']);
        }
        if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
            throw new CognitiveStateValidationError(`Path traversal characters detected in ${fieldName}`, ['PATH_TRAVERSAL']);
        }
        if (WINDOWS_RESERVED_NAMES.test(trimmed)) {
            throw new CognitiveStateValidationError(`Windows reserved device name detected in ${fieldName}`, ['RESERVED_DEVICE_NAME']);
        }
    }
    /**
     * Guarantees that an object contains zero execution capabilities or execution methods.
     */
    assertNoExecutionAuthority(target, objectName = 'CognitiveState') {
        if (!target || typeof target !== 'object')
            return;
        const forbiddenMethods = [
            'execute',
            'run',
            'runTool',
            'dispatchTool',
            'shell',
            'spawn',
            'exec',
            'eval',
            'command',
        ];
        for (const method of forbiddenMethods) {
            if (typeof target[method] === 'function' || (target.registers && typeof target.registers[method] === 'function')) {
                throw new CognitiveStateValidationError(`Security violation: ${objectName} illegally exposes execution method '${method}()' (COGNITION != AUTHORITY)`, ['ILLEGAL_EXECUTION_AUTHORITY']);
            }
        }
    }
}
export const defaultCognitiveExecutionGate = new CognitiveStateExecutionGate();
