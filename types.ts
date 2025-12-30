
export interface PlanOption {
  id: string;
  name: string;
  price: number;
  description: string;
  details?: string[];
}

export interface InternetPlan extends PlanOption {
  speed: string;
}

export interface TVPlan extends PlanOption {
  channels: number;
}

export interface STBOption extends PlanOption {}

export interface MobileBundle {
  id: string;
  name: string;
  discountAmount: number;
  description: string;
}

export interface SelectionState {
  internetId: string | null;
  tvId: string | null;
  stbId: string | null;
  mobileLineCount: number;
  prepaidDiscount: number;
  addOnIds: string[]; // 추가된 필드: 선택된 부가서비스 ID 목록
}
