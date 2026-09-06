import type { SemanticIntent } from '../intent/intentTypes.js';
import type { PlanRiskLevel } from './planningTypes.js';

// EN: Risk is derived from semantics and does not confer permission.
// VI: Risk được suy ra từ ngữ nghĩa và không cấp quyền.
export function classifyPlanRisk(intent: SemanticIntent): PlanRiskLevel {
  if (intent.intentType === 'DELETE_REQUEST' || intent.intentType === 'REVOKE_REQUEST') return 'CRITICAL';
  if (intent.intentType === 'CANCEL_REQUEST' || intent.intentType === 'CREATE_REQUEST' || intent.intentType === 'UPDATE_REQUEST' || intent.intentType === 'CONFIGURATION_REQUEST') return 'HIGH';
  if (intent.actionability === 'ACTIONABLE') return 'MEDIUM';
  return 'LOW';
}
