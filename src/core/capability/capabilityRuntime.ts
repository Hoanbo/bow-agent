// src/core/capability/capabilityRuntime.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Master Capability Runtime Orchestrator:
// - Real Environment Discovery
// - Governed Capability Execution Pipeline
// - Independent Verification & Fail-Closed Gating
// - Concurrency & Resource Safety
// - Global Emergency Stop (SAFE_STOP)
// - Telemetry & Resilience

import path from 'node:path';
import type {
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
  HostEnvironmentSnapshot,
  HostMode,
} from './capabilityTypes.js';
import { globalCapabilityRegistry } from './capabilityRegistry.js';
import { globalCapabilityResolver } from './capabilityResolver.js';
import { globalCapabilityPlanner } from './capabilityPlanner.js';
import { globalCapabilityExecutor } from './capabilityExecutor.js';
import { globalCapabilityVerifier } from './capabilityVerifier.js';
import { globalCapabilityRecovery } from './capabilityRecovery.js';
import { globalCapabilityDiscovery } from './capabilityDiscovery.js';
import { globalCapabilityAudit } from './capabilityAudit.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { buildWorldAction } from '../world-action/worldActionRequest.js';
import { CapabilityError } from './capabilityFailure.js';

export interface CapabilityRuntimeHealth {
  readonly status: 'OPERATIONAL' | 'SAFE_STOP' | 'DEGRADED';
  readonly hostMode: HostMode;
  readonly emergencyStop: boolean;
  readonly totalCapabilities: number;
  readonly availableCapabilities: number;
  readonly activeLocks: number;
  readonly executedCount: number;
  readonly verifiedCount: number;
  readonly recoveredCount: number;
}

export class CapabilityRuntime {
  private _emergencyStop: boolean = false;
  private _emergencyStopReason?: string;
  private _activeLocks = new Set<string>();
  private _cachedSnapshot?: HostEnvironmentSnapshot;
  private _executedCount = 0;
  private _verifiedCount = 0;
  private _recoveredCount = 0;

  // -------------------------------------------------------------------------
  // 1. Emergency Stop (SAFE_STOP)
  // -------------------------------------------------------------------------

  public activateEmergencyStop(reason: string): void {
    this._emergencyStop = true;
    this._emergencyStopReason = reason;
    globalCapabilityAudit.record('SAFE_STOP_TRIGGERED', 'SYSTEM_GLOBAL', { reason });
  }

  public triggerEmergencyStop(reason: string): void {
    this.activateEmergencyStop(reason);
  }

  public resetEmergencyStop(operatorToken: string): void {
    if (!operatorToken || typeof operatorToken !== 'string') {
      throw new CapabilityError('AUTHORIZATION_REQUIRED', 'Valid operator token required to reset emergency stop.');
    }
    this._emergencyStop = false;
    this._emergencyStopReason = undefined;
  }

  public isEmergencyStopActive(): boolean {
    return this._emergencyStop;
  }

  // -------------------------------------------------------------------------
  // 2. Resource Locking
  // -------------------------------------------------------------------------

  private makeResourceKey(target?: string): string {
    if (!target) return '__system_capability_resource__';
    return path.normalize(target).toLowerCase();
  }

  public acquireLock(target?: string): boolean {
    const key = this.makeResourceKey(target);
    if (this._activeLocks.has(key)) return false;
    this._activeLocks.add(key);
    return true;
  }

  public releaseLock(target?: string): void {
    const key = this.makeResourceKey(target);
    this._activeLocks.delete(key);
  }

  // -------------------------------------------------------------------------
  // 3. Environment Awareness
  // -------------------------------------------------------------------------

  public getEnvironmentSnapshot(forceRefresh: boolean = false): HostEnvironmentSnapshot {
    if (!this._cachedSnapshot || forceRefresh) {
      this._cachedSnapshot = globalCapabilityDiscovery.captureSnapshot();
      globalCapabilityAudit.record('CAPABILITY_DISCOVERED', 'SYSTEM_DISCOVERY', {
        hostMode: this._cachedSnapshot.hostMode,
        cores: this._cachedSnapshot.cpu.cores,
        platform: this._cachedSnapshot.platform,
      });
    }
    return this._cachedSnapshot;
  }

  // -------------------------------------------------------------------------
  // 4. Governed Execution Pipeline
  // -------------------------------------------------------------------------

  public async executeCapability(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    // 1. Emergency Stop check
    if (this._emergencyStop) {
      throw new CapabilityError(
        'FATAL',
        `Cannot execute capability: Emergency Stop is active (${this._emergencyStopReason}).`,
        request.capabilityId
      );
    }

    // 2. Resolve descriptor
    const descriptor = globalCapabilityResolver.resolve(request.capabilityId);

    // 3. Plan & validate parameters
    const plan = globalCapabilityPlanner.plan(descriptor, request);
    globalCapabilityAudit.record('CAPABILITY_PLANNED', descriptor.capabilityId, { planId: plan.planId });

    // 4. Authorization Enforcement
    if (plan.requiresAuthorization && !request.isDryRun) {
      if (!request.authorizationToken) {
        const err = new CapabilityError(
          'AUTHORIZATION_REQUIRED',
          `Capability "${descriptor.capabilityId}" requires an explicit authorization token.`,
          descriptor.capabilityId,
          request.target
        );
        globalCapabilityAudit.record('CAPABILITY_DENIED', descriptor.capabilityId, { reason: err.message });
        throw err;
      }

      // Validate cryptographic token
      const dummyAction = buildWorldAction({
        actionId: request.requestId,
        actionType: descriptor.capabilityId,
        target: request.target || '',
        parameters: request.parameters || {},
        userId: request.userId || request.authorizationToken.userId || 'user_primary',
        deviceId: request.deviceId || request.authorizationToken.deviceId || 'dev_host_master',
        sessionId: request.sessionId || request.authorizationToken.sessionId,
        riskLevel: (request.authorizationToken.riskLevel as any) || (descriptor.riskLevel as any),
      });

      const tokenValidation = globalWorldActionAuth.validateToken(request.authorizationToken, dummyAction);
      if (!tokenValidation.valid) {
        const err = new CapabilityError(
          'AUTHORIZATION_REQUIRED',
          `Authorization token invalid: ${tokenValidation.reason}`,
          descriptor.capabilityId,
          request.target
        );
        globalCapabilityAudit.record('CAPABILITY_DENIED', descriptor.capabilityId, { reason: err.message });
        throw err;
      }

      globalCapabilityAudit.record('CAPABILITY_AUTHORIZED', descriptor.capabilityId, {
        tokenId: request.authorizationToken.tokenId,
      });
    }

    // 5. Concurrency Lock
    let lockAcquired = false;
    if (!request.isDryRun && request.target) {
      lockAcquired = this.acquireLock(request.target);
      if (!lockAcquired) {
        throw new CapabilityError(
          'RECOVERABLE',
          `Target resource "${request.target}" is currently locked by another concurrent action.`,
          descriptor.capabilityId,
          request.target
        );
      }
    }

    try {
      // 6. Physical execution
      globalCapabilityAudit.record('CAPABILITY_REQUESTED', descriptor.capabilityId, {
        target: request.target,
        isDryRun: request.isDryRun,
      });

      const execResult = await globalCapabilityExecutor.execute(descriptor, request);
      this._executedCount++;

      // Consume single-use token on real mutation
      if (request.authorizationToken && request.authorizationToken.singleUse && !request.isDryRun) {
        globalWorldActionAuth.consumeToken(request.authorizationToken.tokenId, request.requestId);
      }

      if (!execResult.success) {
        const recovery = globalCapabilityRecovery.handleFailure(descriptor, new Error(execResult.errorMessage));
        this._recoveredCount++;
        globalCapabilityAudit.record('CAPABILITY_FAILED', descriptor.capabilityId, {
          error: execResult.errorMessage,
          recovery,
        });
        return {
          ...execResult,
          verificationPassed: false,
        };
      }

      // 7. Independent Physical Verification
      const verifOutcome = await globalCapabilityVerifier.verify(descriptor, request, execResult);
      if (!verifOutcome.passed) {
        this._recoveredCount++;
        const rec = globalCapabilityRecovery.handleFailure(descriptor, new Error(verifOutcome.failureReason));
        globalCapabilityAudit.record('CAPABILITY_FAILED', descriptor.capabilityId, {
          reason: verifOutcome.failureReason,
          recovery: rec,
        });
        return {
          ...execResult,
          success: false,
          verificationPassed: false,
          errorMessage: verifOutcome.failureReason || 'Physical verification failed.',
        };
      }

      this._verifiedCount++;
      globalCapabilityAudit.record('CAPABILITY_VERIFIED', descriptor.capabilityId, {
        checks: verifOutcome.checksPerformed,
      });

      return {
        ...execResult,
        verificationPassed: true,
      };
    } catch (err: any) {
      const rec = globalCapabilityRecovery.handleFailure(descriptor, err);
      this._recoveredCount++;
      globalCapabilityAudit.record('CAPABILITY_FAILED', descriptor.capabilityId, {
        error: err.message,
        recovery: rec,
      });
      throw err;
    } finally {
      if (lockAcquired && request.target) {
        this.releaseLock(request.target);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Observability & Health
  // -------------------------------------------------------------------------

  public getHealth(): CapabilityRuntimeHealth {
    const checks = globalCapabilityRegistry.runSelfChecks();
    const snapshot = this.getEnvironmentSnapshot();

    return {
      status: this._emergencyStop ? 'SAFE_STOP' : checks.degraded > 0 ? 'DEGRADED' : 'OPERATIONAL',
      hostMode: snapshot.hostMode,
      emergencyStop: this._emergencyStop,
      totalCapabilities: checks.total,
      availableCapabilities: checks.available,
      activeLocks: this._activeLocks.size,
      executedCount: this._executedCount,
      verifiedCount: this._verifiedCount,
      recoveredCount: this._recoveredCount,
    };
  }
}

export const globalCapabilityRuntime = new CapabilityRuntime();
