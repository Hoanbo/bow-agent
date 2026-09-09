// src/core/partnership/personalOperatingModel.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Sections 8 & 17: Personal Operating Model & Context Reconstruction
// Reconstructs compact "Current World Model" across sessions and restarts:
// CURRENT_STATE + ACTIVE_GOALS + ACTIVE_TASKS + RELEVANT_MEMORY + RECENT_DECISIONS +
// UNRESOLVED_PROBLEMS + KNOWN_CONSTRAINTS + CURRENT_CAPABILITIES
//
// Invariant: This model must be completely reconstructable after restart.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  PersonalOperatingModel,
  MASTER_OWNER_ID,
} from './partnershipTypes';
import { PersonalMemoryStore } from './personalMemoryStore';
import { PersonalKnowledgeGraph } from './personalKnowledgeGraph';
import { ContradictionEngine } from './contradictionEngine';

export class PersonalOperatingModelManager {
  private currentModel?: PersonalOperatingModel;
  private readonly storageFilePath?: string;

  constructor(storageFilePath?: string) {
    if (storageFilePath) {
      const normalized = path.resolve(storageFilePath);
      if (normalized.toLowerCase().includes('shopofbow')) {
        throw new Error('[PROTECTED_WORKSPACE_VIOLATION] Cannot store operating model in C:\\BOW\\shopofbow');
      }
      this.storageFilePath = normalized;
    }
  }

  /**
   * Reconstruct the operating model from underlying stores.
   */
  public reconstructModel(context: {
    memoryStore: PersonalMemoryStore;
    knowledgeGraph: PersonalKnowledgeGraph;
    contradictionEngine: ContradictionEngine;
    availableCapabilities?: string[];
    pendingAuthorizations?: number;
    currentObjective?: string;
    currentTask?: string;
    lastVerifiedOutcome?: string;
  }): PersonalOperatingModel {
    // 1. Projects and Goals from Knowledge Graph
    const activeProjects = context.knowledgeGraph.getNodesByType('PROJECT').map((n) => n.label);
    const activeGoals = context.knowledgeGraph.getNodesByType('GOAL').map((n) => n.label);

    // 2. Unresolved problems from Knowledge Graph & Memory
    const unresolvedProblems = context.knowledgeGraph.getUnresolvedProblems().map((n) => n.label);
    const memoryProblems = context.memoryStore.query({ category: 'PROBLEM', status: 'ACTIVE' });
    for (const mp of memoryProblems) {
      if (!unresolvedProblems.includes(mp.content)) {
        unresolvedProblems.push(mp.content);
      }
    }

    // 3. Known constraints from Memory
    const constraintMemories = context.memoryStore.query({ category: 'CONSTRAINT', status: 'ACTIVE' });
    const knownConstraints = constraintMemories.map((m) => m.content);

    // 4. Recent decisions from Memory
    const decisionMemories = context.memoryStore.query({ category: 'DECISION' });
    const recentDecisions = decisionMemories.slice(-5).map((m) => m.content);

    // 5. Contradictions
    const contradictions = context.contradictionEngine.getUnresolvedContradictions().map(
      (c) => `[${c.type}] ${c.previousBelief} vs ${c.currentEvidence}`
    );

    // 6. Host State
    const currentHostState: Record<string, any> = {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptimeSeconds: Math.floor(os.uptime()),
      freeMemoryBytes: os.freemem(),
      nodeVersion: process.version,
    };

    // 7. Derive latest outcome if not explicitly provided
    const latestOutcomeMem = context.memoryStore.query({ category: 'OUTCOME' }).pop();
    const lastVerifiedOutcome =
      context.lastVerifiedOutcome ?? latestOutcomeMem?.content ?? this.currentModel?.lastVerifiedOutcome;

    const currentObjective =
      context.currentObjective ?? this.currentModel?.currentObjective ?? 'Maintain durable personal intelligence and challenge alignment.';
    const currentTask =
      context.currentTask ?? this.currentModel?.currentTask ?? 'Monitoring runtime & memory synchronization';

    // 8. Confidence computation
    let confidence = 0.95;
    if (contradictions.length > 0) confidence -= 0.2;
    if (unresolvedProblems.length > 0) confidence -= 0.1;
    confidence = Math.max(0.2, Math.min(1.0, confidence));

    const model: PersonalOperatingModel = {
      ownerId: MASTER_OWNER_ID,
      activeProjects: activeProjects.length > 0 ? activeProjects : ['BOWCON Core Development'],
      activeGoals: activeGoals.length > 0 ? activeGoals : ['Achieve MS-1.3.39 Cognitive Partnership'],
      currentObjective,
      currentTask,
      knownConstraints: knownConstraints.length > 0 ? knownConstraints : ['Protected workspace C:\\BOW\\shopofbow isolated'],
      knownRisks: contradictions.length > 0 ? ['Unresolved state contradictions present'] : ['Standard operational risks'],
      recentDecisions: recentDecisions.length > 0 ? recentDecisions : ['Initialized MS-1.3.39 Partnership Runtime'],
      unresolvedProblems,
      currentHostState,
      availableCapabilities: context.availableCapabilities ?? ['capability_read', 'capability_verify', 'capability_learn'],
      pendingAuthorizations: context.pendingAuthorizations ?? 0,
      lastVerifiedOutcome,
      currentConfidence: Number(confidence.toFixed(2)),
      contradictions,
      timestamp: Date.now(),
    };

    this.currentModel = model;
    this.saveToDisk();

    return model;
  }

  /**
   * Format the current world model as structured text (Section 17).
   */
  public formatWorldModel(model: PersonalOperatingModel = this.currentModel!): string {
    if (!model) {
      return 'BOWCON CURRENT WORLD MODEL: Not reconstructed yet.';
    }

    return [
      '==============================================================================',
      'BOWCON CURRENT WORLD MODEL',
      '==============================================================================',
      `Owner:                 ${model.ownerId}`,
      `Active Projects:       ${model.activeProjects.join(', ')}`,
      `Active Goals:          ${model.activeGoals.join(', ')}`,
      `Current Objective:     ${model.currentObjective ?? 'None'}`,
      `Current Task:          ${model.currentTask ?? 'None'}`,
      `Known Constraints:     ${model.knownConstraints.join('; ')}`,
      `Known Risks:           ${model.knownRisks.join('; ')}`,
      `Recent Decisions:      ${model.recentDecisions.join('; ')}`,
      `Unresolved Problems:   ${model.unresolvedProblems.length > 0 ? model.unresolvedProblems.join('; ') : 'None'}`,
      `Current Host State:    ${model.currentHostState.platform} ${model.currentHostState.arch} (Node ${model.currentHostState.nodeVersion})`,
      `Available Capabilities:${model.availableCapabilities.join(', ')}`,
      `Pending Authorizations:${model.pendingAuthorizations}`,
      `Last Verified Outcome: ${model.lastVerifiedOutcome ?? 'None'}`,
      `Current Confidence:    ${(model.currentConfidence * 100).toFixed(0)}%`,
      `Contradictions:        ${model.contradictions.length > 0 ? model.contradictions.join('; ') : 'None'}`,
      '==============================================================================',
    ].join('\n');
  }

  /**
   * Save model to disk.
   */
  public saveToDisk(): void {
    if (!this.storageFilePath || !this.currentModel) return;
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storageFilePath, JSON.stringify(this.currentModel, null, 2), 'utf8');
    } catch {
      // Disk errors handled gracefully
    }
  }

  /**
   * Load model from disk after restart.
   */
  public loadFromDisk(): PersonalOperatingModel | null {
    if (!this.storageFilePath || !fs.existsSync(this.storageFilePath)) return null;
    try {
      const raw = fs.readFileSync(this.storageFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.currentModel = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Retrieve current model in memory.
   */
  public getCurrentModel(): PersonalOperatingModel | undefined {
    return this.currentModel;
  }
}
