export type EntityType = 'product' | 'user' | 'order' | 'account' | 'category' | 'file' | 'service' | 'tool' | 'setting' | 'date' | 'time' | 'amount' | 'currency' | 'identifier' | 'location' | 'topic';
export interface SemanticEntity {
    type: EntityType;
    value: string;
    normalizedValue: string;
    source: string;
    confidence: number;
}
