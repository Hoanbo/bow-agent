// src/core/authority/masterHumanAuthority.ts
// BOWCON V4.0 — MS-1.3.38: MASTER HUMAN AUTHORITY UNIFICATION & EXECUTIVE GOVERNANCE CLOSURE
//
// Canonical Master Human Authority.
// BOWCON is a personal AI runtime intended to serve one master human operator.
// There must be exactly ONE authoritative human governance hierarchy for the entire runtime.
//
// Invariants:
// USER_STOP > MASTER_AUTHORITY_AUTONOMOUS_EXECUTION
// MASTER_HUMAN_AUTHORITY > AUTONOMOUS_EXECUTION
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// DETECTION != DIAGNOSIS
// DIAGNOSIS != AUTHORIZATION
// AUTHORIZATION != SUCCESS
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// FAILURE != BRAIN_DEATH
// DRY_RUN != MUTATION
// EXECUTIVE_RUNTIME != HOST_EXECUTION_ENGINE
// EXECUTIVE_RUNTIME -> HumanGate -> CapabilityRuntime
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { globalSupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import { globalExecutiveCancellation } from '../executive/executiveCancellation.js';
import { globalAgentLoopControl } from '../agent-loop/agentLoopControl.js';
import { globalSupervisorRuntime } from '../supervisor/supervisorRuntime.js';
import { globalCapabilityRuntime } from '../capability/capabilityRuntime.js';
import { globalExecutiveAudit } from '../executive/executiveAudit.js';
export class MasterHumanAuthorityError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'MasterHumanAuthorityError';
    }
}
export const FORBIDDEN_EXECUTION_PATTERNS = [
    'cmd.exe',
    'powershell.exe',
    '/bin/sh',
    '/bin/bash',
    'eval',
    'new Function',
    'execSync',
    'child_process.exec',
];
export class MasterHumanAuthority {
    static CANONICAL_MASTER_ID = 'master_operator';
    _masterOperatorId = MasterHumanAuthority.CANONICAL_MASTER_ID;
    _trustedMasterAliases = new Set([
        MasterHumanAuthority.CANONICAL_MASTER_ID,
        'user_primary',
        'operator',
        'master',
        'boss_user',
    ]);
    _isUserStopActive = false;
    _userStopReason;
    _userStoppedAt;
    _userStoppedBy;
    /**
     * Returns whether the given operator identifier represents the Master Human Authority.
     */
    isMasterOperator(operatorId) {
        if (!operatorId)
            return false;
        const normalized = operatorId.trim().toLowerCase();
        return (normalized === this._masterOperatorId.toLowerCase() ||
            this._trustedMasterAliases.has(normalized));
    }
    get masterOperatorId() {
        return this._masterOperatorId;
    }
    setMasterOperatorId(operatorId) {
        if (!operatorId || !operatorId.trim()) {
            throw new MasterHumanAuthorityError('INVALID_MASTER_ID', 'Master Operator ID cannot be empty.');
        }
        this._masterOperatorId = operatorId.trim();
        this._trustedMasterAliases.add(this._masterOperatorId.toLowerCase());
    }
    registerMasterAlias(alias) {
        if (alias && alias.trim()) {
            this._trustedMasterAliases.add(alias.trim().toLowerCase());
        }
    }
    // -------------------------------------------------------------------------
    // 1. Absolute USER_STOP Supremacy
    // -------------------------------------------------------------------------
    get isUserStopActive() {
        return (this._isUserStopActive ||
            globalExecutiveCancellation.isUserStopActive ||
            globalAgentLoopControl.isStopped() ||
            globalSupervisorRuntime.isSafeStopActive() ||
            globalCapabilityRuntime.isEmergencyStopActive());
    }
    get userStopReason() {
        return (this._userStopReason ||
            globalExecutiveCancellation.userStopReason ||
            'Master Human Operator emergency stop');
    }
    get userStoppedAt() {
        return this._userStoppedAt;
    }
    get userStoppedBy() {
        return this._userStoppedBy;
    }
    /**
     * Immediately activates USER_STOP globally across all subsystems.
     * Halts: ExecutiveRuntime, AgentLoopRuntime, SupervisorRuntime, CapabilityRuntime,
     * and cancels all pending HumanGate requests.
     */
    triggerUserStop(reason = 'Master Human Operator Emergency Stop', operatorId = this._masterOperatorId) {
        this._isUserStopActive = true;
        this._userStopReason = reason;
        this._userStoppedAt = Date.now();
        this._userStoppedBy = operatorId;
        // Propagate unconditionally to all subsystem cancellation planes
        globalExecutiveCancellation.triggerUserStop(reason);
        globalAgentLoopControl.stop(reason);
        globalSupervisorRuntime.triggerSafeStop(reason);
        globalCapabilityRuntime.triggerEmergencyStop(reason);
        globalSupervisorHumanGate.cancelAllBySafeStop();
        globalExecutiveAudit.record('MASTER_USER_STOP_TRIGGERED', 'GLOBAL', {
            operatorId,
            reason,
            timestamp: this._userStoppedAt,
        });
    }
    /**
     * Resets USER_STOP.
     * INVARIANT: Only the authentic Master Human Authority may reset USER_STOP.
     */
    resetUserStop(operatorId) {
        if (!this.isMasterOperator(operatorId)) {
            throw new MasterHumanAuthorityError('UNAUTHORIZED_USER_STOP_RESET', `Unauthorized operator "${operatorId}" cannot reset USER_STOP. Only Master Human Authority can reset.`);
        }
        this._isUserStopActive = false;
        this._userStopReason = undefined;
        this._userStoppedAt = undefined;
        this._userStoppedBy = undefined;
        // Reset across all subsystems
        globalExecutiveCancellation.resetUserStop();
        globalAgentLoopControl.resetStop(operatorId, operatorId);
        globalSupervisorRuntime.resetSafeStop(operatorId);
        globalCapabilityRuntime.resetEmergencyStop(operatorId);
        globalExecutiveAudit.record('MASTER_USER_STOP_RESET', 'GLOBAL', {
            operatorId,
            timestamp: Date.now(),
        });
    }
    // -------------------------------------------------------------------------
    // 2. Canonical Human Gate Governance
    // -------------------------------------------------------------------------
    /**
     * Approves a HumanGate request on behalf of the Master Human Authority.
     * Strictly enforces that only the Master Human Authority can approve.
     */
    approveGateRequest(requestId, operatorId, context) {
        if (this.isUserStopActive) {
            throw new MasterHumanAuthorityError('USER_STOP_ACTIVE', 'Cannot approve HumanGate request while USER_STOP is active.');
        }
        if (!this.isMasterOperator(operatorId)) {
            throw new MasterHumanAuthorityError('UNAUTHORIZED_APPROVAL', `Operator "${operatorId}" is not the Master Human Authority. Approval rejected.`);
        }
        const approved = globalSupervisorHumanGate.approve(requestId, operatorId, context);
        globalExecutiveAudit.record('MASTER_GATE_APPROVED', requestId, {
            operatorId,
            tokenId: approved.authorizationToken?.tokenId,
            context,
        });
        return approved;
    }
    /**
     * Denies a HumanGate request.
     */
    denyGateRequest(requestId, operatorId, reason = 'Denied by Master Human Authority') {
        if (!this.isMasterOperator(operatorId)) {
            throw new MasterHumanAuthorityError('UNAUTHORIZED_DENIAL', `Operator "${operatorId}" is not the Master Human Authority. Denial rejected.`);
        }
        const denied = globalSupervisorHumanGate.deny(requestId, reason);
        globalExecutiveAudit.record('MASTER_GATE_DENIED', requestId, {
            operatorId,
            reason,
        });
        return denied;
    }
    /**
     * Revokes an existing authorization token.
     */
    revokeAuthorizationToken(tokenId, operatorId) {
        if (!this.isMasterOperator(operatorId)) {
            throw new MasterHumanAuthorityError('UNAUTHORIZED_REVOCATION', `Operator "${operatorId}" is not authorized to revoke tokens.`);
        }
        const success = globalWorldActionAuth.revokeToken(tokenId);
        globalExecutiveAudit.record('MASTER_TOKEN_REVOKED', tokenId, {
            operatorId,
            revoked: success,
        });
        return success;
    }
    // -------------------------------------------------------------------------
    // 3. Prohibited Shell Execution Guard
    // -------------------------------------------------------------------------
    /**
     * Validates that the requested target or command is not a forbidden shell execution.
     * INVARIANT: Master authority does NOT mean unrestricted host shell execution.
     */
    assertPermittedExecution(commandOrPath) {
        if (!commandOrPath)
            return;
        const lower = commandOrPath.toLowerCase();
        for (const forbidden of FORBIDDEN_EXECUTION_PATTERNS) {
            if (lower.includes(forbidden.toLowerCase())) {
                throw new MasterHumanAuthorityError('FORBIDDEN_HOST_SHELL_EXECUTION', `Prohibited host execution pattern detected: "${forbidden}". Master authority does not permit unrestricted shell execution.`);
            }
        }
    }
    // -------------------------------------------------------------------------
    // 4. Lifecycle Reset
    // -------------------------------------------------------------------------
    clear() {
        this._isUserStopActive = false;
        this._userStopReason = undefined;
        this._userStoppedAt = undefined;
        this._userStoppedBy = undefined;
    }
}
export const globalMasterHumanAuthority = new MasterHumanAuthority();
