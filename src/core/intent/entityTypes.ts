// EN:
// Entity types describe values mentioned by the user. They are data only and never
// carry authority to execute an action.
//
// VI:
// Entity types mô tả các giá trị được người dùng nhắc tới. Chúng chỉ là dữ liệu và không
// bao giờ mang quyền thực thi hành động.

export type EntityType =
  | 'product' | 'user' | 'order' | 'account' | 'category' | 'file' | 'service'
  | 'tool' | 'setting' | 'date' | 'time' | 'amount' | 'currency' | 'identifier'
  | 'location' | 'topic';

export interface SemanticEntity {
  type: EntityType;
  value: string;
  normalizedValue: string;
  source: string;
  confidence: number;
}
