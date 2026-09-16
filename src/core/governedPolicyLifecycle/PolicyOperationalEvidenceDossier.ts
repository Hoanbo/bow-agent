// src/core/governedPolicyLifecycle/PolicyOperationalEvidenceDossier.ts
// Component 1183: PolicyOperationalEvidenceDossier (REAL)
//
// Operational evidence compiler creating deeply frozen, immutable proof dossiers.
// Certifies runtime health adherence, incident histories, lineage DAG fingerprints,
// and verified human authorizations. Enforces EVIDENCE != MUTATION_AUTHORITY.

import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  type PolicyOperationalEvidenceDossier,
  type PolicyHealthReport,
  type PolicyIncidentRecord,
  type PolicyLifecycleRecord,
  computeEvidenceDossierHash,
  deepFreeze,
  PolicyOperationalEvidenceError,
} from './GovernedPolicyLifecycleTypes.js';

export class PolicyOperationalEvidenceDossierEngine {
  private readonly dossiers = new Map<string, PolicyOperationalEvidenceDossier>();
  private dossierCounter = 0;

  /**
   * Compile an immutable operational evidence dossier.
   */
  public compileDossier(params: {
    tenantId: string;
    policyDomain: PolicyDomain;
    policyId: string;
    policyVersion: number;
    lifecycleRecord: PolicyLifecycleRecord;
    latestHealthReport: PolicyHealthReport;
    activeIncidents: readonly PolicyIncidentRecord[];
    lineageGraphFingerprint: string;
    humanAuthorizationsCount?: number;
  }): PolicyOperationalEvidenceDossier {
    if (!params.tenantId || !params.policyDomain || !params.policyId) {
      throw new PolicyOperationalEvidenceError('INVALID_DOSSIER_PARAMS: tenantId, policyDomain, and policyId are required.');
    }

    if (params.lifecycleRecord.policyId !== params.policyId) {
      throw new PolicyOperationalEvidenceError('POLICY_ID_MISMATCH: lifecycleRecord does not match requested policyId.');
    }

    this.dossierCounter++;
    const dossierId = `oed_${params.tenantId}_${params.policyDomain}_v${params.policyVersion}_${Date.now()}_${this.dossierCounter}`;

    // Sanitized incident records: strip any internal stack traces or raw keys
    const sanitizedIncidents = params.activeIncidents.map((inc) => ({
      incidentId: inc.incidentId,
      incidentType: inc.incidentType,
      severity: inc.severity,
      status: inc.status,
      description: inc.description,
      openedAt: inc.openedAt,
      resolvedAt: inc.resolvedAt,
      incidentHash: inc.incidentHash,
    }));

    const rawDossier: Omit<PolicyOperationalEvidenceDossier, 'dossierFingerprint'> = {
      dossierId,
      tenantId: params.tenantId,
      policyDomain: params.policyDomain,
      policyId: params.policyId,
      policyVersion: params.policyVersion,
      lifecycleState: params.lifecycleRecord.state,
      canonicalPolicyHash: params.lifecycleRecord.canonicalPolicyHash,
      latestHealthReport: params.latestHealthReport,
      activeIncidents: Object.freeze(sanitizedIncidents as any),
      lineageGraphFingerprint: params.lineageGraphFingerprint,
      humanAuthorizationsCount: params.humanAuthorizationsCount || (params.lifecycleRecord.authorizationRef ? 1 : 0),
      compiledAt: Date.now(),
    };

    const dossierFingerprint = computeEvidenceDossierHash(rawDossier);
    const frozenDossier: PolicyOperationalEvidenceDossier = deepFreeze({
      ...rawDossier,
      dossierFingerprint,
    });

    this.dossiers.set(dossierId, frozenDossier);
    return frozenDossier;
  }

  public getDossier(dossierId: string): PolicyOperationalEvidenceDossier | undefined {
    return this.dossiers.get(dossierId);
  }

  /**
   * Verify cryptographic fingerprint of a dossier.
   */
  public verifyDossierIntegrity(dossier: PolicyOperationalEvidenceDossier): boolean {
    const raw: Omit<PolicyOperationalEvidenceDossier, 'dossierFingerprint'> = {
      dossierId: dossier.dossierId,
      tenantId: dossier.tenantId,
      policyDomain: dossier.policyDomain,
      policyId: dossier.policyId,
      policyVersion: dossier.policyVersion,
      lifecycleState: dossier.lifecycleState,
      canonicalPolicyHash: dossier.canonicalPolicyHash,
      latestHealthReport: dossier.latestHealthReport,
      activeIncidents: dossier.activeIncidents,
      lineageGraphFingerprint: dossier.lineageGraphFingerprint,
      humanAuthorizationsCount: dossier.humanAuthorizationsCount,
      compiledAt: dossier.compiledAt,
    };

    const expectedFingerprint = computeEvidenceDossierHash(raw);
    return dossier.dossierFingerprint === expectedFingerprint;
  }
}
