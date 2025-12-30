
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
  tv2Id: string | null;
  stbId: string | null;
  mobileLineCount: number;
  prepaidInternet: number; // 인터넷 선납권
  prepaidTv1: number;      // B tv 1 선납권
  prepaidTv2: number;      // B tv 2 선납권
  addOnIds: string[];
  isFamilyPlan: boolean;
}
