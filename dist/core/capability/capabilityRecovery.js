// src/core/capability/capabilityRecovery.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Capability-Level Failure Recovery Engine.
//
// INVARIANTS:
// FAILURE != BRAIN_DEATH
// A capability failure must never kill the continuous Brain runtime.
import { globalCapabilityRegistry } from './capabilityRegistry.js';
export class CapabilityRecoveryManager {
    handleFailure(descriptor, error, context) {
        const failureCode = error?.code || 'RECOVERABLE';
        // 1. Recoverable error: capability remains operational
        if (failureCode === 'RECOVERABLE' || failureCode === 'POLICY_DENIED' || failureCode === 'AUTHORIZATION_REQUIRED') {
            return {
                recovered: true,
                failureCode,
                recoveryStrategy: 'GRACEFUL_EXCEPTION_BOUNDARY',
                message: `Handled non-fatal error gracefully: ${error.message}`,
            };
        }
        // 2. Verification or timeout: mark capability degraded temporarily
        if (failureCode === 'VERIFICATION_FAILED' || failureCode === 'TIMEOUT') {
            try {
                globalCapabilityRegistry.setCapabilityState(descriptor.capabilityId, 'DEGRADED');
            }
            catch { }
            return {
                recovered: true,
                failureCode,
                recoveryStrategy: 'MARK_DEGRADED_AND_FALLBACK',
                message: `Capability marked DEGRADED due to ${failureCode}: ${error.message}`,
            };
        }
        // 3. Unavailable: mark unavailable
        if (failureCode === 'UNAVAILABLE') {
            try {
                globalCapabilityRegistry.setCapabilityState(descriptor.capabilityId, 'UNAVAILABLE');
            }
            catch { }
            return {
                recovered: true,
                failureCode,
                recoveryStrategy: 'MARK_UNAVAILABLE',
                message: `Capability marked UNAVAILABLE: ${error.message}`,
            };
        }
        // 4. Fatal
        return {
            recovered: false,
            failureCode: 'FATAL',
            recoveryStrategy: 'NONE',
            message: `Fatal unrecoverable failure: ${error.message}`,
        };
    }
}
export const globalCapabilityRecovery = new CapabilityRecoveryManager();
