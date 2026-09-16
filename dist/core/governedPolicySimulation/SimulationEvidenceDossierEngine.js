// src/core/governedPolicySimulation/SimulationEvidenceDossierEngine.ts
// Component 1214: SimulationEvidenceDossierEngine (REAL)
//
// Immutable, deep-frozen simulation evidence dossier compilation with deterministic SHA-256 fingerprinting.
// Biên soạn hồ sơ bằng chứng mô phỏng bất biến, đóng băng sâu với dấu vân tay SHA-256 tiền định.
import { EmergencyStopActiveError, SimulationCrossTenantAccessForbiddenError, SimulationAuthorityViolationError, asSimulationDossierId, computeSimulationDossierFingerprint, DEFAULT_SIMULATION_DOSSIER_TTL_MS, } from './GovernedPolicySimulationTypes.js';
export class SimulationEvidenceDossierEngine {
    emergencyStopProvider;
    constructor(emergencyStopProvider) {
        this.emergencyStopProvider = emergencyStopProvider;
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
            throw new EmergencyStopActiveError(`Emergency stop provider threw error during dossier compilation: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (typeof active !== 'boolean' || active === true) {
            throw new EmergencyStopActiveError('Emergency stop is ACTIVE or non-boolean (fail-closed)');
        }
    }
    sanitizeTenantId(tenantId) {
        if (!tenantId || typeof tenantId !== 'string') {
            throw new SimulationCrossTenantAccessForbiddenError('Tenant ID must be a non-empty string');
        }
        const clean = tenantId.trim();
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(clean)) {
            throw new SimulationCrossTenantAccessForbiddenError(`Invalid tenant ID format: ${clean}`);
        }
        const reservedWindows = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        if (reservedWindows.test(clean) || clean.includes('..') || clean.includes('/') || clean.includes('\\')) {
            throw new SimulationCrossTenantAccessForbiddenError(`Forbidden tenant path token: ${clean}`);
        }
        return clean;
    }
    deepFreeze(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        Object.freeze(obj);
        for (const key of Object.getOwnPropertyNames(obj)) {
            const val = obj[key];
            if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
                this.deepFreeze(val);
            }
        }
        return obj;
    }
    /**
     * Compiles an immutable, deep-frozen PolicySimulationEvidenceDossier.
     */
    compileSimulationDossier(input) {
        this.assertEmergencyStopInactive();
        const cleanTenant = this.sanitizeTenantId(input.tenantId);
        if (!input.candidatePolicyHash || !input.basePolicyHash) {
            throw new SimulationAuthorityViolationError('Candidate and base policy hashes must be non-empty');
        }
        // Determine overall verdict based on constituent checks
        let overallVerdict = 'STABLE';
        if (input.invariantResult.hasDeadlock) {
            overallVerdict = 'DEADLOCK_DETECTED';
        }
        else if (input.assuranceProjection.isHighRegressionRisk) {
            overallVerdict = 'HIGH_REGRESSION_RISK';
        }
        else if (input.replayResult.totalReplayed === 0) {
            overallVerdict = 'INSUFFICIENT_EVIDENCE';
        }
        else if (input.assuranceProjection.assuranceDelta < -0.1) {
            overallVerdict = 'REGRESSIVE';
        }
        else if (input.assuranceProjection.assuranceDelta >= 0.05) {
            overallVerdict = 'PROJECTION_VALIDATED';
        }
        const compiledAt = Date.now();
        const expiresAt = compiledAt + (input.ttlMs ?? DEFAULT_SIMULATION_DOSSIER_TTL_MS);
        const shadowSummary = input.shadowSummary ?? {
            totalShadowEvaluations: 0,
            totalDivergences: 0,
        };
        const dossierId = asSimulationDossierId(`dossier_sim_${compiledAt}_${Math.random().toString(36).substring(2, 9)}`);
        const payloadForFingerprint = {
            dossierId,
            sessionId: input.sessionId,
            tenantId: cleanTenant,
            policyDomain: input.policyDomain,
            candidatePolicyHash: input.candidatePolicyHash,
            basePolicyHash: input.basePolicyHash,
            replayResult: input.replayResult,
            assuranceProjection: input.assuranceProjection,
            invariantResult: input.invariantResult,
            stressResult: input.stressResult,
            shadowSummary,
            overallVerdict,
            compiledAt,
            expiresAt,
        };
        const simulationDossierFingerprint = computeSimulationDossierFingerprint(payloadForFingerprint);
        const dossier = {
            dossierId,
            sessionId: input.sessionId,
            tenantId: cleanTenant,
            policyDomain: input.policyDomain,
            candidatePolicyHash: input.candidatePolicyHash,
            basePolicyHash: input.basePolicyHash,
            replayResult: input.replayResult,
            assuranceProjection: input.assuranceProjection,
            invariantResult: input.invariantResult,
            stressResult: input.stressResult,
            shadowSummary,
            overallVerdict,
            simulationDossierFingerprint,
            compiledAt,
            expiresAt,
        };
        return this.deepFreeze(dossier);
    }
}
