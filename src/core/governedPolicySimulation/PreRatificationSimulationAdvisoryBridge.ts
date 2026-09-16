// src/core/governedPolicySimulation/PreRatificationSimulationAdvisoryBridge.ts
// Component 1215: PreRatificationSimulationAdvisoryBridge (REAL)
//
// Closed-loop simulation advisory handoff delivery strictly to MS-1.5.19 Deliberation Gateway with cryptographic nonces.
// Chuyển giao tư vấn mô phỏng khép vòng nghiêm ngặt tới Cổng cân nhắc MS-1.5.19 với nonce mật mã.

import { randomUUID } from 'node:crypto';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  EmergencyStopProvider,
  EmergencyStopActiveError,
  SimulationCrossTenantAccessForbiddenError,
  SimulationAuthorityViolationError,
  SimulationHandoffExpiredError,
  DuplicateSimulationHandoffError,
  SimulationHandoffId,
  asSimulationHandoffId,
  PolicySimulationEvidenceDossier,
  SimulationAdvisoryPackage,
  MAX_HANDOFF_TTL_MS,
} from './GovernedPolicySimulationTypes.js';

export interface HandoffDeliveryRecord {
  readonly handoffId: SimulationHandoffId;
  readonly dossierId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly handoffNonce: string;
  readonly deliveredAt: number;
}

export class PreRatificationSimulationAdvisoryBridge {
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly consumedNonces = new Set<string>();
  private readonly deliveryLog: HandoffDeliveryRecord[] = [];

  constructor(emergencyStopProvider?: EmergencyStopProvider) {
    this.emergencyStopProvider = emergencyStopProvider;
  }

  private assertEmergencyStopInactive(): void {
    if (!this.emergencyStopProvider) {
      throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
    }
    let active: unknown;
    try {
      active = this.emergencyStopProvider.isEmergencyStopActive();
    } catch (err) {
      throw new EmergencyStopActiveError(
        `Emergency stop provider threw error during simulation handoff: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (typeof active !== 'boolean' || active === true) {
      throw new EmergencyStopActiveError('Emergency stop is ACTIVE or non-boolean (fail-closed)');
    }
  }

  private sanitizeTenantId(tenantId: string): string {
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

  /**
   * Packages a simulation evidence dossier into a non-authoritative advisory package for MS-1.5.19.
   * SIMULATION != RATIFICATION: Delivers advisory evidence only; zero authority to ratify or activate.
   */
  public packageSimulationAdvisory(
    dossier: PolicySimulationEvidenceDossier,
    overrideNonce?: string
  ): SimulationAdvisoryPackage {
    this.assertEmergencyStopInactive();

    if (!dossier || !dossier.dossierId) {
      throw new SimulationAuthorityViolationError('Valid PolicySimulationEvidenceDossier required for handoff');
    }

    const cleanTenant = this.sanitizeTenantId(dossier.tenantId);
    const now = Date.now();

    // Check expiration
    if (dossier.expiresAt && dossier.expiresAt <= now) {
      throw new SimulationHandoffExpiredError(
        `Simulation dossier ${dossier.dossierId} has expired at ${dossier.expiresAt} (current: ${now})`
      );
    }

    const handoffNonce = overrideNonce ?? randomUUID();
    if (this.consumedNonces.has(handoffNonce)) {
      throw new DuplicateSimulationHandoffError(`Duplicate simulation handoff nonce detected: ${handoffNonce}`);
    }
    this.consumedNonces.add(handoffNonce);

    const handoffId = asSimulationHandoffId(`sim_handoff_${now}_${Math.random().toString(36).substring(2, 9)}`);
    const expiresAt = now + MAX_HANDOFF_TTL_MS;

    const advisoryPackage: SimulationAdvisoryPackage = Object.freeze({
      handoffId,
      dossierId: dossier.dossierId,
      tenantId: cleanTenant,
      policyDomain: dossier.policyDomain,
      candidatePolicyHash: dossier.candidatePolicyHash,
      basePolicyHash: dossier.basePolicyHash,
      overallVerdict: dossier.overallVerdict,
      assuranceDelta: dossier.assuranceProjection.assuranceDelta,
      falseRejectionRate: dossier.assuranceProjection.falsePositiveRejectionRate,
      isHighRegressionRisk: dossier.assuranceProjection.isHighRegressionRisk,
      dossierFingerprint: dossier.simulationDossierFingerprint,
      handoffNonce,
      packagedAt: now,
      expiresAt,
    });

    this.deliveryLog.push(
      Object.freeze({
        handoffId,
        dossierId: dossier.dossierId,
        tenantId: cleanTenant,
        policyDomain: dossier.policyDomain,
        handoffNonce,
        deliveredAt: now,
      })
    );

    return advisoryPackage;
  }

  public getDeliveryLog(): readonly HandoffDeliveryRecord[] {
    return Object.freeze([...this.deliveryLog]);
  }
}
