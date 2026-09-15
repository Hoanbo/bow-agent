// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1165: PolicyMutationFirewall
// Runtime Isolation Barrier Against Autonomous Mutation, Lease Expansion & PDP Bypass
// ============================================================================

import {
  PdpPolicyHandoffPackage,
  StrategicPolicyDeliberationDossier,
  PolicyMutationViolationError,
  computeDeliberationDossierHash,
} from './GovernedStrategicPolicyEvolutionTypes.js';

export class PolicyMutationFirewall {
  constructor() {}

  // EN: Asserts that an attempt to commit a policy or handoff strictly adheres to firewall rules.
  // VI: Khẳng định rằng mọi nỗ lực cam kết chính sách hoặc bàn giao đều tuân thủ nghiêm ngặt tường lửa.
  public verifyPdpHandoff(
    handoffPackage: PdpPolicyHandoffPackage,
    dossier: StrategicPolicyDeliberationDossier
  ): void {
    // EN: Rule 1: Must be explicitly non-authoritative. Only PDP evaluates authoritatively.
    // VI: Quy tắc 1: Bắt buộc không mang tính quyền lực. Chỉ PDP mới có thẩm quyền đánh giá.
    if (handoffPackage.isAuthoritativePolicy !== false) {
      throw new PolicyMutationViolationError(
        'Firewall violation: MS-1.5.19 handoff package cannot claim authoritative policy status'
      );
    }

    // EN: Rule 2: Must be certified with human approval. Machine self-approval is forbidden.
    // VI: Quy tắc 2: Phải được chứng thực bằng sự chấp thuận của con người. Tự phê duyệt bị cấm tuyệt đối.
    if (!handoffPackage.humanApprovalCertified) {
      throw new PolicyMutationViolationError(
        'Firewall violation: Cannot hand off to PDP without explicit human approval certification'
      );
    }

    // EN: Rule 3: Dossier provenance hash in handoff must match actual dossier hash.
    // VI: Quy tắc 3: Băm nguồn gốc hồ sơ trong gói bàn giao phải khớp chính xác với hồ sơ thực tế.
    const recomputedHash = computeDeliberationDossierHash(dossier);
    if (handoffPackage.dossierProvenanceHash !== recomputedHash) {
      throw new PolicyMutationViolationError(
        'Firewall violation: Dossier provenance hash mismatch between handoff and deliberation record'
      );
    }

    // EN: Rule 4: Human decision in dossier must be APPROVE.
    // VI: Quy tắc 4: Quyết định của con người trong hồ sơ phải là APPROVE.
    if (!dossier.humanDecision || dossier.humanDecision.decision !== 'APPROVE') {
      throw new PolicyMutationViolationError(
        'Firewall violation: Cannot construct PDP handoff for unapproved or rejected proposal'
      );
    }
  }

  // EN: Intercepts and blocks any attempt to directly mutate production policy from MS-1.5.19.
  // VI: Chặn đứng và ngăn chặn mọi nỗ lực trực tiếp thay đổi chính sách sản xuất từ MS-1.5.19.
  public assertNoDirectPolicyMutation(targetPath: string): void {
    const normalized = targetPath.replace(/\\/g, '/').toLowerCase();
    if (!normalized.includes('data/partitions_governed_policy_deliberation')) {
      throw new PolicyMutationViolationError(
        `Firewall violation: MS-1.5.19 is strictly prohibited from writing to production policy path '${targetPath}'`
      );
    }
  }

  // EN: Asserts that MS-1.5.19 cannot create or expand autonomy leases.
  // VI: Khẳng định MS-1.5.19 không thể tạo mới hoặc mở rộng các lease tự chủ.
  public assertNoLeaseCreationOrExpansion(): void {
    throw new PolicyMutationViolationError(
      'Firewall violation: MS-1.5.19 does not possess AutonomyLeaseEngine privileges to create or expand leases'
    );
  }
}
