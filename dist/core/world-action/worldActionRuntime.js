// src/core/world-action/worldActionRuntime.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Central Governed Execution Runtime Orchestrator:
// - Resource Locking (Deterministic Resource Keys)
// - Global Emergency Stop (SAFE_STOP)
// - Observability & Telemetry (getHealth)
// - Idempotency Cache & Conflict Detection
// - End-to-End Governed Execution Pipeline
import path from 'node:path';
import { globalWorldActionPlanner } from './worldActionPlanner.js';
import { globalWorldActionAuth } from './worldActionAuthorization.js';
import { globalWorldActionRegistry } from './worldActionRegistry.js';
import { globalWorldActionCommit } from './worldActionCommit.js';
import { globalWorldActionAudit } from './worldActionAudit.js';
import { WorldActionError } from './worldActionFailure.js';
import { assertValidActionTransition } from './worldActionTransitions.js';
export class WorldActionRuntime {
    _emergencyStop = false;
    _emergencyStopReason;
    _activeLocks = new Set();
    _idempotencyCache = new Map();
    // Metrics
    _completedCount = 0;
    _failedCount = 0;
    _deniedCount = 0;
    _verifiedCount = 0;
    _verifierFailureCount = 0;
    _activeActionCount = 0;
    // -------------------------------------------------------------------------
    // 1. Emergency Stop (SAFE_STOP)
    // -------------------------------------------------------------------------
    activateEmergencyStop(reason) {
        this._emergencyStop = true;
        this._emergencyStopReason = reason;
        globalWorldActionAudit.record('SECURITY_BLOCK', 'SYSTEM_GLOBAL', {
            event: 'EMERGENCY_STOP_ACTIVATED',
            reason,
        });
    }
    resetEmergencyStop(operatorToken) {
        if (!operatorToken || typeof operatorToken !== 'string') {
            throw new WorldActionError('AUTHORIZATION_FAILURE', 'Valid operator token required to reset emergency stop.');
        }
        this._emergencyStop = false;
        this._emergencyStopReason = undefined;
        globalWorldActionAudit.record('AUTHORIZED', 'SYSTEM_GLOBAL', {
            event: 'EMERGENCY_STOP_RESET',
            operatorToken: '[REDACTED_SECRET]',
        });
    }
    isEmergencyStopActive() {
        return this._emergencyStop;
    }
    // -------------------------------------------------------------------------
    // 2. Concurrency & Resource Locking
    // -------------------------------------------------------------------------
    makeResourceKey(target) {
        if (!target)
            return '__global_resource__';
        return path.normalize(target).toLowerCase();
    }
    acquireLock(target) {
        const key = this.makeResourceKey(target);
        if (this._activeLocks.has(key)) {
            return false;
        }
        this._activeLocks.add(key);
        return true;
    }
    releaseLock(target) {
        const key = this.makeResourceKey(target);
        this._activeLocks.delete(key);
    }
    isLocked(target) {
        return this._activeLocks.has(this.makeResourceKey(target));
    }
    // -------------------------------------------------------------------------
    // 3. Governed End-to-End Execution Pipeline
    // -------------------------------------------------------------------------
    /**
     * Executes a WorldAction through the full governance pipeline:
     * Idempotency -> Prepare -> Authorize -> Lock -> Execute -> Verify -> Commit -> Audit
     */
    async executeAction(action) {
        // 1. Emergency Stop Gate
        if (this._emergencyStop) {
            action.lifecycleState = 'CANCELLED';
            action.failureCode = 'EMERGENCY_STOP_ACTIVE';
            action.failureReason = `Emergency stop active: ${this._emergencyStopReason}`;
            globalWorldActionAudit.record('SECURITY_BLOCK', action.actionId, { reason: action.failureReason });
            throw new WorldActionError('EMERGENCY_STOP_ACTIVE', action.failureReason, action.actionId, action.target);
        }
        // 2. Idempotency Check
        if (action.idempotencyKey) {
            const cached = this._idempotencyCache.get(action.idempotencyKey);
            if (cached) {
                if (cached.action.parametersHash !== action.parametersHash) {
                    action.lifecycleState = 'FAILED';
                    action.failureCode = 'IDEMPOTENCY_CONFLICT';
                    action.failureReason = 'Idempotency key reused with different parameters.';
                    throw new WorldActionError('IDEMPOTENCY_CONFLICT', action.failureReason, action.actionId, action.target);
                }
                // Return previously committed action without re-executing physical side effect
                return cached.action;
            }
        }
        this._activeActionCount++;
        globalWorldActionAudit.record('REQUESTED', action.actionId, {
            toolId: action.actionType,
            target: action.target,
            parameters: action.parameters,
            isDryRun: action.isDryRun,
        }, { traceId: action.traceId, tenantId: action.tenantId, deviceId: action.deviceId, userId: action.userId, toolId: action.actionType, target: action.target });
        let resourceLocked = false;
        try {
            // 3. Phase 1: Preparation (Zero Physical Side Effects)
            globalWorldActionPlanner.prepare(action);
            globalWorldActionAudit.record('PLANNED', action.actionId, {
                plan: action.preparedPlan,
            });
            // 4. Authorization Enforcement
            if (action.preparedPlan?.requiresAuthorization) {
                if (!action.authorizationToken) {
                    action.authorizationState = 'DENIED';
                    action.lifecycleState = 'DENIED';
                    this._deniedCount++;
                    throw new WorldActionError('AUTHORIZATION_FAILURE', `Action "${action.actionId}" requires explicit authorization token.`, action.actionId, action.target);
                }
                const authValidation = globalWorldActionAuth.validateToken(action.authorizationToken, action);
                if (!authValidation.valid) {
                    action.authorizationState = 'DENIED';
                    action.lifecycleState = 'DENIED';
                    this._deniedCount++;
                    throw new WorldActionError('AUTHORIZATION_FAILURE', `Authorization failed: ${authValidation.reason}`, action.actionId, action.target);
                }
                action.authorizationState = 'AUTHORIZED';
                action.lifecycleState = 'AUTHORIZED';
                globalWorldActionAudit.record('AUTHORIZED', action.actionId, {
                    tokenId: action.authorizationToken.tokenId,
                });
            }
            // 5. Concurrency Lock Acquisition
            if (!action.isDryRun && action.target) {
                const lockAcquired = this.acquireLock(action.target);
                if (!lockAcquired) {
                    throw new WorldActionError('RESOURCE_LOCKED', `Resource "${action.target}" is currently locked by another concurrent action.`, action.actionId, action.target);
                }
                resourceLocked = true;
            }
            // 6. Phase 2: Physical Tool Execution
            assertValidActionTransition(action.lifecycleState, 'EXECUTING', action.actionId);
            action.lifecycleState = 'EXECUTING';
            action.executionState = 'EXECUTING';
            globalWorldActionAudit.record('EXECUTION_STARTED', action.actionId, {
                toolId: action.actionType,
                target: action.target,
            });
            const tool = globalWorldActionRegistry.getTool(action.actionType);
            const executionResult = await tool.executor(action);
            action.executionResult = executionResult;
            action.executionState = executionResult.success ? 'EXECUTED' : 'EXECUTION_FAILED';
            globalWorldActionAudit.record('EXECUTION_COMPLETED', action.actionId, {
                success: executionResult.success,
                actualEffect: executionResult.actualEffect,
            });
            // Single-use token consumption upon physical execution
            if (action.authorizationToken && action.authorizationToken.singleUse) {
                globalWorldActionAuth.consumeToken(action.authorizationToken.tokenId, action.actionId);
                action.authorizationState = 'CONSUMED';
            }
            if (!executionResult.success) {
                action.lifecycleState = 'FAILED';
                this._failedCount++;
                throw new WorldActionError('EXECUTION_FAILURE', executionResult.errorMessage || 'Physical execution failed.', action.actionId, action.target);
            }
            // 7. Phase 3: Independent Verification
            assertValidActionTransition(action.lifecycleState, 'VERIFYING', action.actionId);
            action.lifecycleState = 'VERIFYING';
            action.verificationState = 'VERIFYING';
            globalWorldActionAudit.record('VERIFICATION_STARTED', action.actionId, {
                strategy: action.preparedPlan?.verificationStrategy,
            });
            const verificationResult = await tool.verifier(action, executionResult);
            action.verificationResult = verificationResult;
            action.verificationState = verificationResult.passed ? 'VERIFIED' : 'VERIFICATION_FAILED';
            if (!verificationResult.passed) {
                this._verifierFailureCount++;
                action.lifecycleState = 'FAILED';
                action.failureCode = 'VERIFICATION_FAILURE';
                action.failureReason = verificationResult.failureReason;
                globalWorldActionAudit.record('VERIFICATION_FAILED', action.actionId, {
                    reason: verificationResult.failureReason,
                });
                // Trigger automatic rollback if reversible
                if (tool.rollback && !action.isDryRun) {
                    const rollbackRes = await globalWorldActionCommit.rollback(action);
                    globalWorldActionAudit.record(rollbackRes.success ? 'ROLLED_BACK' : 'ROLLBACK_FAILED', action.actionId, { rollbackResult: rollbackRes });
                }
                throw new WorldActionError('VERIFICATION_FAILURE', verificationResult.failureReason || 'Physical state verification failed.', action.actionId, action.target);
            }
            this._verifiedCount++;
            globalWorldActionAudit.record('VERIFICATION_PASSED', action.actionId, {
                checks: verificationResult.checksPerformed,
            });
            // 8. Phase 4: Governed Commit
            globalWorldActionCommit.commit(action);
            this._completedCount++;
            globalWorldActionAudit.record('COMMITTED', action.actionId, {
                committedAt: action.committedAt,
            });
            // Record in Idempotency store
            if (action.idempotencyKey) {
                this._idempotencyCache.set(action.idempotencyKey, { action, result: executionResult });
            }
            return action;
        }
        catch (err) {
            if (action.lifecycleState !== 'DENIED' && action.lifecycleState !== 'CANCELLED') {
                action.lifecycleState = 'FAILED';
            }
            if (!action.failureReason)
                action.failureReason = err.message;
            if (!action.failureCode)
                action.failureCode = err.code || 'EXECUTION_FAILURE';
            throw err;
        }
        finally {
            if (resourceLocked && action.target) {
                this.releaseLock(action.target);
            }
            this._activeActionCount--;
        }
    }
    // -------------------------------------------------------------------------
    // 4. Observability & Health
    // -------------------------------------------------------------------------
    getHealth() {
        const allTools = globalWorldActionRegistry.getAllTools();
        return {
            runtimeState: this._emergencyStop ? 'SAFE_STOP' : 'OPERATIONAL',
            queuedActions: 0,
            activeActions: this._activeActionCount,
            completedActions: this._completedCount,
            failedActions: this._failedCount,
            deniedActions: this._deniedCount,
            verifiedActions: this._verifiedCount,
            emergencyStop: this._emergencyStop,
            toolRegistryHealth: {
                totalTools: allTools.length,
                enabledTools: allTools.filter(t => t.enabled).length,
            },
            authorizationHealth: {
                activeTokens: 0, // dynamic
            },
            verifierHealth: {
                verifiedCount: this._verifiedCount,
                failureCount: this._verifierFailureCount,
            },
        };
    }
    clearIdempotency() {
        this._idempotencyCache.clear();
    }
}
export const globalWorldActionRuntime = new WorldActionRuntime();
