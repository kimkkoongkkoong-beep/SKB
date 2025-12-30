
import { InternetPlan, TVPlan, STBOption, MobileBundle, PlanOption } from './types';

export const INTERNET_PLANS: InternetPlan[] = [
  {
    id: 'int_100m',
    name: '광랜 +WIFI',
    speed: '100M',
    price: 23100,
    description: '웹서핑 및 일반적인 사용에 적합',
    details: ['최대 100Mbps 속도', 'WIFI 포함']
  },
  {
    id: 'int_500m',
    name: '인터넷 Giga Lite +WIFI',
    speed: '500M',
    price: 34100,
    description: '고화질 영상 스트리밍과 게임에 최적',
    details: ['최대 500Mbps 속도', 'WIFI 포함']
  },
  {
    id: 'int_1g',
    name: '인터넷 Giga +WIFI',
    speed: '1G',
    price: 39600,
    description: '가장 빠른 속도와 안정적인 연결',
    details: ['최대 1Gbps 속도', 'WIFI 포함']
  }
];

export const INTERNET_ADD_ONS: PlanOption[] = [
  {
    id: 'addon_wings',
    name: '윙즈',
    price: 1650,
    description: '끊김 없는 와이파이 확장을 위한 윙즈'
  },
  {
    id: 'addon_relief',
    name: '안심서비스',
    price: 2200,
    description: '유해사이트 차단 및 PC/모바일 안심 이용'
  }
];

export const TV_PLANS: TVPlan[] = [
  {
    id: 'tv_lite',
    name: 'B tv 이코노미',
    channels: 184,
    price: 14300,
    description: '필수 채널 중심의 실속형 요금제'
  },
  {
    id: 'tv_standard',
    name: 'B tv 스탠다드',
    channels: 235,
    price: 13200,
    description: '인기 채널이 모두 포함된 대표 요금제'
  },
  {
    id: 'tv_all',
    name: 'B tv All',
    channels: 258,
    price: 16500,
    description: 'B tv의 모든 실시간 채널 시청'
  },
  {
    id: 'tv_all_plus',
    name: 'B tv All+',
    channels: 258,
    price: 22000,
    description: 'VOD 무제한 시청'
  }
];

export const STB_OPTIONS: STBOption[] = [
  {
    id: 'stb_smart3',
    name: 'Smart 3',
    price: 4400,
    description: '작지만 강력한 성능의 기본 셋톱박스'
  },
  {
    id: 'stb_ai4v',
    name: 'AI 4 VISION',
    price: 8800,
    description: '업계 최초 온디바이스 AI 탑재로 화질과 사운드를 실시간 최적화'
  },
  {
    id: 'stb_ai2',
    name: 'AI 2 (NUGU)',
    price: 6600,
    description: '인공지능 스피커 기능이 탑재된 셋톱박스'
  },
  {
    id: 'stb_apple',
    name: 'Apple TV 4K',
    price: 6600,
    description: '애플의 생태계와 고화질 영상을 동시에'
  }
];

export const BASE_BUNDLE_DISCOUNT = 1100; // 기본 인터넷+TV 결합 할인

// 휴대폰 결합 시 상품별 할인액
export const MOBILE_COMBINATION_DISCOUNTS = {
  INTERNET: {
    'int_100m': 4400,
    'int_500m': 11000,
    'int_1g': 13200
  },
  TV: 1100
};
