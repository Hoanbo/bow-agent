// src/core/capability/capabilityPlanner.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Capability Planner: prepares execution plans and enforces dry-run zero-mutation guarantees.
//
// INVARIANTS:
// PLAN != EXECUTION
// Dry-run produces ZERO physical mutation.

import crypto from 'node:crypto';
import type { CapabilityDescriptor, CapabilityExecutionRequest } from './capabilityTypes.js';
import { validateCapabilityParameters } from './capabilityDescriptor.js';
import { globalCapabilityRisk } from './capabilityRisk.js';
import { requiresAuthorizationToken, requiresExplicitConfirmation } from './capabilityPermission.js';
import { CapabilityError } from './capabilityFailure.js';

export interface PreparedCapabilityPlan {
  readonly planId: string;
  readonly descriptor: CapabilityDescriptor;
  readonly target?: string;
  readonly normalizedParameters: Record<string, any>;
  readonly riskLevel: string;
  readonly permissionLevel: string;
  readonly requiresAuthorization: boolean;
  readonly requiresConfirmation: boolean;
  readonly isDryRun: boolean;
  readonly plannedAt: number;
}

export class CapabilityPlanner {
  public plan(descriptor: CapabilityDescriptor, request: CapabilityExecutionRequest): PreparedCapabilityPlan {
    // 1. Validate parameters
    validateCapabilityParameters(descriptor, request.parameters || {});

    // 2. Dynamic risk & permission assessment
    const { riskLevel, permissionLevel } = globalCapabilityRisk.assessCapabilityRisk(
      descriptor,
      request.target,
      request.parameters
    );

    const requiresAuth = requiresAuthorizationToken(permissionLevel);
    const requiresConfirm = requiresExplicitConfirmation(permissionLevel);

    const planId = `cplan_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    return {
      planId,
      descriptor,
      target: request.target,
      normalizedParameters: request.parameters || {},
      riskLevel,
      permissionLevel,
      requiresAuthorization: requiresAuth,
      requiresConfirmation: requiresConfirm,
      isDryRun: request.isDryRun === true,
      plannedAt: Date.now(),
    };
  }
}

export const globalCapabilityPlanner = new CapabilityPlanner();
