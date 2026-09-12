// src/core/orchestration/evidenceVerificationEngine.ts
// BOWCON V4.0 — MS-1.3.46: EVIDENCE VERIFICATION ENGINE
//
// Governed cryptographic and epistemic verification of agent evidence records,
// artifact bindings, provenance integrity, and cross-agent contradiction detection.
//
// INVARIANTS:
// - EVIDENCE != AUTHORITY: Verification does not confer execution authority.
// - SUB_AGENT_RESULT != FACT: Sub-agent claims are speculative observations.
// - Never silently upgrade UNVERIFIED to VERIFIED.
// - Never fabricate missing evidence (mark INCOMPLETE).
// - Contradictions are preserved fail-visible; never resolved by majority voting.
// - Session isolation: Cross-session evidence fails closed.

import crypto from 'node:crypto';
import type {
  EvidenceRecord,
  EvidenceVerificationResult,
  EvidenceVerificationState,
  EvidenceIntegrityStatus,
  TaskArtifact,
  AgentTask,
  TaskContradiction,
  AgentTaskResult,
  TaskId,
  TaskGroupId,
} from './taskOrchestrationTypes.js';
import { ArtifactEvidenceEngine, globalArtifactEvidenceEngine } from './artifactEvidenceEngine.js';

export class EvidenceVerificationEngine {
  private readonly evidenceRecords = new Map<string, EvidenceRecord>();
  private readonly contradictions = new Map<string, TaskContradiction>();

  constructor(
    private readonly artifactEngine: ArtifactEvidenceEngine = globalArtifactEvidenceEngine
  ) {}

  /**
   * Registers a raw evidence record into the engine.
   */
  public registerEvidence(record: EvidenceRecord): EvidenceRecord {
    this.evidenceRecords.set(record.evidenceId, record);
    return record;
  }

  /**
   * Creates an evidence record from an artifact.
   */
  public createEvidenceFromArtifact(
    artifact: TaskArtifact,
    isSpeculative = true,
    notes?: string
  ): EvidenceRecord {
    const evidenceId = `evi_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const evidence: EvidenceRecord = {
      evidenceId,
      taskId: artifact.taskId,
      artifactId: artifact.artifactId,
      agentId: artifact.agentId,
      deviceId: artifact.deviceId,
      sessionId: artifact.sessionId,
      observedAt: Date.now(),
      integrityStatus: 'INTACT',
      verificationState: 'OBSERVED',
      rawHash: artifact.contentHash,
      provenance: [...artifact.provenance, `evidence_registered`],
      isSpeculative,
      notes,
    };
    this.evidenceRecords.set(evidenceId, evidence);
    return evidence;
  }

  /**
   * Verifies an individual evidence record against task context and artifact integrity.
   */
  public verifyEvidenceRecord(
    evidence: EvidenceRecord,
    task: AgentTask,
    rawContent?: string
  ): EvidenceVerificationResult {
    const errors: string[] = [];

    // 1. Session Isolation
    if (evidence.sessionId !== task.sessionId) {
      return {
        verified: false,
        status: 'REJECTED',
        integrityStatus: 'CORRUPTED',
        errors: [`Cross-session evidence mismatch: evidence session ${evidence.sessionId} != task session ${task.sessionId}`],
      };
    }

    // 2. Task Binding
    if (evidence.taskId !== task.taskId) {
      errors.push(`Task binding mismatch: evidence taskId ${evidence.taskId} != task.taskId ${task.taskId}`);
    }

    // 3. Agent Binding
    if (task.assignment && task.assignment.agentId !== evidence.agentId) {
      errors.push(`Agent binding mismatch: evidence agentId ${evidence.agentId} != task assigned agentId ${task.assignment.agentId}`);
    }

    // 4. Provenance Check
    if (!evidence.provenance || evidence.provenance.length === 0) {
      errors.push('Evidence provenance chain is empty or invalid.');
    }

    // 5. Artifact Cryptographic Hash Verification (if artifact bound)
    let integrityStatus: EvidenceIntegrityStatus = evidence.integrityStatus;
    if (evidence.artifactId) {
      const artifact = this.artifactEngine.getArtifact(evidence.artifactId);
      if (!artifact) {
        return {
          verified: false,
          status: 'INCOMPLETE',
          integrityStatus: 'MISSING_METADATA',
          errors: [`Referenced artifact ${evidence.artifactId} is missing.`],
        };
      }

      const integrityCheck = this.artifactEngine.verifyArtifactIntegrity(artifact, rawContent);
      if (!integrityCheck.intact) {
        integrityStatus = 'HASH_MISMATCH';
        errors.push(integrityCheck.error || 'Artifact hash mismatch detected.');
      } else if (evidence.rawHash !== artifact.contentHash) {
        integrityStatus = 'HASH_MISMATCH';
        errors.push(`Evidence rawHash ${evidence.rawHash} does not match artifact contentHash ${artifact.contentHash}.`);
      }
    }

    if (errors.length > 0) {
      return {
        verified: false,
        status: 'REJECTED',
        integrityStatus,
        errors,
      };
    }

    return {
      verified: true,
      status: 'VERIFIED',
      integrityStatus: 'INTACT',
      errors: [],
    };
  }

  /**
   * Evaluates two or more agent results for the same task/group to detect contradictions.
   * INVARIANT: Preserves contradiction records with full provenance; never auto-resolves.
   */
  public detectContradictions(
    results: readonly AgentTaskResult[],
    taskGroupId: TaskGroupId
  ): readonly TaskContradiction[] {
    const newContradictions: TaskContradiction[] = [];

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const rA = results[i];
        const rB = results[j];

        // Only compare within same session and task
        if (rA.sessionId !== rB.sessionId || rA.taskId !== rB.taskId) {
          continue;
        }

        const outcomeA = rA.outcome.status;
        const outcomeB = rB.outcome.status;

        // Check for contradicting outcome statuses (e.g. SUCCESS vs FAILURE)
        const isStatusContradiction =
          (outcomeA === 'SUCCESS' && outcomeB === 'FAILURE') ||
          (outcomeA === 'FAILURE' && outcomeB === 'SUCCESS');

        // Check for contradicting claims in outputData if available
        let isDataContradiction = false;
        let dataDiscrepancy = '';
        if (rA.outcome.outputData && rB.outcome.outputData) {
          for (const key of Object.keys(rA.outcome.outputData)) {
            if (key in rB.outcome.outputData) {
              const valA = JSON.stringify(rA.outcome.outputData[key]);
              const valB = JSON.stringify(rB.outcome.outputData[key]);
              if (valA !== valB) {
                isDataContradiction = true;
                dataDiscrepancy = `Conflicting field "${key}": Agent ${rA.agentId} claims ${valA}, but Agent ${rB.agentId} claims ${valB}`;
                break;
              }
            }
          }
        }

        if (isStatusContradiction || isDataContradiction) {
          const contradictionId = `contra_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const discrepancySummary = isStatusContradiction
            ? `Outcome status contradiction: Agent ${rA.agentId} reported ${outcomeA}, whereas Agent ${rB.agentId} reported ${outcomeB}.`
            : dataDiscrepancy;

          const contradiction: TaskContradiction = {
            contradictionId,
            taskId: rA.taskId,
            taskGroupId,
            sessionId: rA.sessionId,
            sourceA: {
              agentId: rA.agentId,
              resultId: rA.resultId,
              claim: rA.outcome.summary,
              outcome: outcomeA,
            },
            sourceB: {
              agentId: rB.agentId,
              resultId: rB.resultId,
              claim: rB.outcome.summary,
              outcome: outcomeB,
            },
            detectedAt: Date.now(),
            discrepancySummary,
            resolved: false,
          };

          this.contradictions.set(contradictionId, contradiction);
          newContradictions.push(contradiction);
        }
      }
    }

    return newContradictions;
  }

  public getEvidence(evidenceId: string): EvidenceRecord | undefined {
    return this.evidenceRecords.get(evidenceId);
  }

  public getEvidenceByTask(taskId: TaskId): readonly EvidenceRecord[] {
    return Array.from(this.evidenceRecords.values()).filter((e) => e.taskId === taskId);
  }

  public getContradictionsByTask(taskId: TaskId): readonly TaskContradiction[] {
    return Array.from(this.contradictions.values()).filter((c) => c.taskId === taskId);
  }

  public getAllContradictions(): readonly TaskContradiction[] {
    return Array.from(this.contradictions.values());
  }

  public clear(): void {
    this.evidenceRecords.clear();
    this.contradictions.clear();
  }
}

export const globalEvidenceVerificationEngine = new EvidenceVerificationEngine();
