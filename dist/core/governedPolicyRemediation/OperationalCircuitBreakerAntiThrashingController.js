// src/core/governedPolicyRemediation/OperationalCircuitBreakerAntiThrashingController.ts
// Component 1203: OperationalCircuitBreakerAntiThrashingController (REAL)
//
// Multi-tenant operational circuit breaker enforcing exponential backoff cooldowns,
// anti-thrashing containment, and bounded probe evaluation; strictly downward containment.
// Bộ ngắt mạch vận hành đa tenant thực thi thời gian hạ nhiệt lùi cấp số nhân,
// ngăn chặn dao động thrashing và đánh giá thăm dò giới hạn; chỉ thực hiện kiểm soát đi xuống.
import { DEFAULT_CIRCUIT_BREAKER_PARAMS, asCircuitBreakerStateId, CircuitBreakerOpenError, CircuitBreakerLockoutError, EmergencyStopActiveError, CrossTenantAccessForbiddenError, SecondaryAuthorityRejectedError, } from './GovernedPolicyRemediationTypes.js';
export class OperationalCircuitBreakerAntiThrashingController {
    emergencyStopProvider;
    params;
    // Key: tenantId + "::" + policyDomain + "::" + actionType
    registry = new Map();
    constructor(emergencyStopProvider, customParams) {
        this.emergencyStopProvider = emergencyStopProvider;
        this.params = Object.freeze({
            failureWindowSeconds: Math.max(60, Math.min(3600, customParams?.failureWindowSeconds ?? DEFAULT_CIRCUIT_BREAKER_PARAMS.failureWindowSeconds)),
            failureThreshold: Math.max(2, Math.min(10, customParams?.failureThreshold ?? DEFAULT_CIRCUIT_BREAKER_PARAMS.failureThreshold)),
            initialCooldownSeconds: Math.max(30, Math.min(1800, customParams?.initialCooldownSeconds ?? DEFAULT_CIRCUIT_BREAKER_PARAMS.initialCooldownSeconds)),
            backoffMultiplier: Math.max(1.5, Math.min(4.0, customParams?.backoffMultiplier ?? DEFAULT_CIRCUIT_BREAKER_PARAMS.backoffMultiplier)),
            maxCooldownSeconds: Math.max(600, Math.min(86400, customParams?.maxCooldownSeconds ?? DEFAULT_CIRCUIT_BREAKER_PARAMS.maxCooldownSeconds)),
            maxHalfOpenProbes: Math.max(1, Math.min(3, customParams?.maxHalfOpenProbes ?? DEFAULT_CIRCUIT_BREAKER_PARAMS.maxHalfOpenProbes)),
            resetSuccessThreshold: Math.max(1, Math.min(5, customParams?.resetSuccessThreshold ?? DEFAULT_CIRCUIT_BREAKER_PARAMS.resetSuccessThreshold)),
            lockoutThreshold: Math.max(3, Math.min(10, customParams?.lockoutThreshold ?? DEFAULT_CIRCUIT_BREAKER_PARAMS.lockoutThreshold)),
        });
    }
    assertEmergencyStopInactive() {
        if (!this.emergencyStopProvider) {
            throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
        }
        let active;
        try {
            active = this.emergencyStopProvider.isEmergencyStopActive();
        }
        catch (err) {
            throw new EmergencyStopActiveError(`Emergency stop provider threw error: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (typeof active !== 'boolean') {
            throw new EmergencyStopActiveError('Emergency stop provider returned non-boolean value (fail-closed)');
        }
        if (active === true) {
            throw new EmergencyStopActiveError('Emergency stop is currently ACTIVE (fail-closed)');
        }
    }
    getBreakerKey(tenantId, policyDomain, actionType) {
        return `${tenantId}::${policyDomain}::${actionType}`;
    }
    getOrCreateEntry(key) {
        let entry = this.registry.get(key);
        if (!entry) {
            entry = {
                state: 'CLOSED',
                failureTimestamps: [],
                tripCount: 0,
                currentCooldownSeconds: this.params.initialCooldownSeconds,
                halfOpenProbesAttempted: 0,
                consecutiveSuccesses: 0,
                lockedOut: false,
            };
            this.registry.set(key, entry);
        }
        return entry;
    }
    getBreakerStatus(tenantId, policyDomain, actionType, currentTime = new Date()) {
        this.assertEmergencyStopInactive();
        if (!tenantId || tenantId.trim() === '') {
            throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
        }
        const key = this.getBreakerKey(tenantId, policyDomain, actionType);
        const entry = this.getOrCreateEntry(key);
        const nowMs = currentTime.getTime();
        // Check if cooldown elapsed to transition OPEN -> HALF_OPEN
        if (entry.state === 'OPEN' && !entry.lockedOut && entry.cooldownExpiresAtMs && nowMs >= entry.cooldownExpiresAtMs) {
            entry.state = 'HALF_OPEN';
            entry.halfOpenProbesAttempted = 0;
        }
        const stateId = asCircuitBreakerStateId(`cb_${tenantId}_${policyDomain}_${actionType}`);
        return Object.freeze({
            stateId,
            tenantId,
            policyDomain,
            actionType,
            state: entry.state,
            failureCount: entry.failureTimestamps.length,
            tripCount: entry.tripCount,
            currentCooldownSeconds: entry.currentCooldownSeconds,
            lastTripTimestamp: entry.lastTripTimestamp,
            cooldownExpiresAt: entry.cooldownExpiresAtMs ? new Date(entry.cooldownExpiresAtMs).toISOString() : undefined,
            halfOpenProbesAttempted: entry.halfOpenProbesAttempted,
            consecutiveSuccesses: entry.consecutiveSuccesses,
            lockedOut: entry.lockedOut,
        });
    }
    recordFailure(tenantId, policyDomain, actionType, currentTime = new Date()) {
        this.assertEmergencyStopInactive();
        if (!tenantId || tenantId.trim() === '') {
            throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
        }
        const key = this.getBreakerKey(tenantId, policyDomain, actionType);
        const entry = this.getOrCreateEntry(key);
        const nowMs = currentTime.getTime();
        if (entry.lockedOut) {
            throw new CircuitBreakerLockoutError(`Circuit breaker for '${actionType}' is LOCKED OUT after ${entry.tripCount} consecutive trips; requires Boss intervention`);
        }
        // Filter failure timestamps within sliding window
        const windowStartMs = nowMs - this.params.failureWindowSeconds * 1000;
        entry.failureTimestamps = entry.failureTimestamps.filter((t) => t >= windowStartMs);
        entry.failureTimestamps.push(nowMs);
        entry.consecutiveSuccesses = 0;
        // Handle failure in HALF_OPEN: immediately double backoff and trip back to OPEN
        if (entry.state === 'HALF_OPEN') {
            entry.state = 'OPEN';
            entry.tripCount += 1;
            entry.currentCooldownSeconds = Math.min(this.params.maxCooldownSeconds, Math.round(entry.currentCooldownSeconds * this.params.backoffMultiplier));
            entry.lastTripTimestamp = currentTime.toISOString();
            entry.cooldownExpiresAtMs = nowMs + entry.currentCooldownSeconds * 1000;
            if (entry.tripCount >= this.params.lockoutThreshold) {
                entry.lockedOut = true;
            }
        }
        else if (entry.state === 'CLOSED') {
            // Check if threshold breached in sliding window
            if (entry.failureTimestamps.length >= this.params.failureThreshold) {
                entry.state = 'OPEN';
                entry.tripCount += 1;
                entry.currentCooldownSeconds = this.params.initialCooldownSeconds;
                entry.lastTripTimestamp = currentTime.toISOString();
                entry.cooldownExpiresAtMs = nowMs + entry.currentCooldownSeconds * 1000;
                if (entry.tripCount >= this.params.lockoutThreshold) {
                    entry.lockedOut = true;
                }
            }
        }
        return this.getBreakerStatus(tenantId, policyDomain, actionType, currentTime);
    }
    attemptProbe(tenantId, policyDomain, actionType, currentTime = new Date()) {
        this.assertEmergencyStopInactive();
        const status = this.getBreakerStatus(tenantId, policyDomain, actionType, currentTime);
        if (status.lockedOut) {
            throw new CircuitBreakerLockoutError(`Circuit breaker for '${actionType}' is locked out`);
        }
        if (status.state === 'OPEN') {
            throw new CircuitBreakerOpenError(`Circuit breaker for '${actionType}' is OPEN (cooldown active until ${status.cooldownExpiresAt})`);
        }
        if (status.state === 'HALF_OPEN') {
            const entry = this.getOrCreateEntry(this.getBreakerKey(tenantId, policyDomain, actionType));
            if (entry.halfOpenProbesAttempted >= this.params.maxHalfOpenProbes) {
                throw new CircuitBreakerOpenError(`Circuit breaker for '${actionType}' is HALF_OPEN and probe limit (${this.params.maxHalfOpenProbes}) exhausted`);
            }
            entry.halfOpenProbesAttempted += 1;
        }
    }
    recordSuccess(tenantId, policyDomain, actionType, currentTime = new Date()) {
        this.assertEmergencyStopInactive();
        const key = this.getBreakerKey(tenantId, policyDomain, actionType);
        const entry = this.getOrCreateEntry(key);
        if (entry.state === 'HALF_OPEN') {
            entry.consecutiveSuccesses += 1;
            if (entry.consecutiveSuccesses >= this.params.resetSuccessThreshold) {
                // Reset to CLOSED
                entry.state = 'CLOSED';
                entry.failureTimestamps = [];
                entry.tripCount = 0;
                entry.currentCooldownSeconds = this.params.initialCooldownSeconds;
                entry.halfOpenProbesAttempted = 0;
                entry.consecutiveSuccesses = 0;
                entry.lockedOut = false;
                entry.cooldownExpiresAtMs = undefined;
            }
        }
        else if (entry.state === 'CLOSED') {
            entry.consecutiveSuccesses += 1;
        }
        return this.getBreakerStatus(tenantId, policyDomain, actionType, currentTime);
    }
    resetLockoutByHumanAuthority(tenantId, policyDomain, actionType, callerIdentity) {
        this.assertEmergencyStopInactive();
        if (callerIdentity !== 'BOSS_ROOT_OPERATOR') {
            throw new SecondaryAuthorityRejectedError(`Only Sole Human Authority ('BOSS_ROOT_OPERATOR') may reset circuit breaker lockout; received '${callerIdentity}'`);
        }
        const key = this.getBreakerKey(tenantId, policyDomain, actionType);
        const entry = this.getOrCreateEntry(key);
        entry.state = 'CLOSED';
        entry.failureTimestamps = [];
        entry.tripCount = 0;
        entry.currentCooldownSeconds = this.params.initialCooldownSeconds;
        entry.halfOpenProbesAttempted = 0;
        entry.consecutiveSuccesses = 0;
        entry.lockedOut = false;
        entry.cooldownExpiresAtMs = undefined;
        return this.getBreakerStatus(tenantId, policyDomain, actionType);
    }
}
