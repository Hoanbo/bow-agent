import { PdpPolicyHandoffPackage, StrategicPolicyDeliberationDossier } from './GovernedStrategicPolicyEvolutionTypes.js';
export declare class PolicyMutationFirewall {
    constructor();
    verifyPdpHandoff(handoffPackage: PdpPolicyHandoffPackage, dossier: StrategicPolicyDeliberationDossier): void;
    assertNoDirectPolicyMutation(targetPath: string): void;
    assertNoLeaseCreationOrExpansion(): void;
}
