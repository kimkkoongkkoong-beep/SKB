
import React, { useState, useMemo, useEffect } from 'react';
import { 
  INTERNET_PLANS, 
  INTERNET_ADD_ONS,
  TV_PLANS, 
  STB_OPTIONS, 
  MOBILE_COMBINATION_DISCOUNTS 
} from './constants';
import { SelectionState } from './types';

// B tv pop (CATV) 전용 요금제 데이터
const CATV_TV_PLANS = [
  { id: 'pop_100', name: 'B tv pop 100', price: 7700, channels: 100, description: '가성비 중심의 실속 케이블 방송' },
  { id: 'pop_180', name: 'B tv pop 180', price: 7700, channels: 180, description: '다양한 채널을 즐기는 합리적 선택' },
  { id: 'pop_230', name: 'B tv pop 230', price: 9900, channels: 230, description: '전 채널을 시청하는 프리미엄 케이블' },
];

// CATV 전용 셋톱박스 데이터 (기본 임대료)
const CATV_STB_OPTIONS = [
  { id: 'stb_smart3_pop', name: 'Smart 3_POP', price: 2200, description: 'pop 전용 스마트 셋톱박스' },
  { id: 'stb_ai2_pop', name: 'AI2_POP', price: 4400, description: '누구(NUGU) 탑재 pop 전용 AI 셋톱박스' },
];

// B tv 2 전용 요금제 맵 (IPTV용)
const B_TV_2_PRICES: Record<string, number> = {
  'tv_lite': 6050,
  'tv_standard': 7700,
  'tv_all': 9350,
  'tv_all_plus': 14850,
  'tv_none': 0
};

// B tv 2 전용 요금제 맵 (CATV/pop용) - 요청에 따른 가격 수정
const B_TV_2_POP_PRICES: Record<string, number> = {
  'pop_100': 3850,
  'pop_180': 5500,
  'pop_230': 6600,
  'tv_none': 0
};

const SectionHeader: React.FC<{ title: string; step: string | number; badge?: string; children?: React.ReactNode }> = ({ title, step, badge, children }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white font-bold text-sm shadow-sm">
        {step}
      </span>
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {badge && (
          <span className="inline-block px-2 py-0.5 bg-violet-100 text-violet-600 text-[10px] font-bold rounded-md uppercase tracking-wider w-fit">
            {badge}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-4">
      {children}
    </div>
  </div>
);

const PlanCard: React.FC<{ 
  selected: boolean; 
  onClick: () => void; 
  title: string; 
  price?: number; 
  description: string;
  className?: string;
  disabled?: boolean;
}> = ({ selected, onClick, title, price, description, className = "", disabled = false }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`relative flex flex-col p-5 rounded-2xl border-2 transition-all text-left w-full h-full shadow-sm ${
      selected 
        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' 
        : 'border-slate-100 bg-white hover:border-violet-200 hover:shadow-md'
    } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
  >
    <div className="flex flex-col flex-grow">
      <h3 className={`text-lg font-bold mb-1 ${selected ? 'text-violet-900' : 'text-slate-800'}`}>{title}</h3>
      <p className="text-sm text-slate-500 mb-4 flex-grow leading-snug">{description}</p>
      {price !== undefined && (
        <div className="mt-auto">
          <span className={`text-xl font-bold ${selected ? 'text-violet-600' : 'text-slate-900'}`}>{price.toLocaleString()}</span>
          <span className="text-sm text-slate-500 ml-1">원/월</span>
        </div>
      )}
    </div>
    {selected && (
      <div className="absolute top-3 right-3 text-violet-600">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
    )}
  </button>
);

const App: React.FC = () => {
  const [tvType, setTvType] = useState<'IPTV' | 'CATV'>('IPTV');
  const [selections, setSelections] = useState<SelectionState>({
    internetId: 'int_500m', 
    tvId: 'tv_lite',
    tv2Id: 'tv_none',
    stbId: 'stb_smart3',
    mobileLineCount: 0,
    prepaidInternet: 0,
    prepaidTv1: 0,
    prepaidTv2: 0,
    addOnIds: [],
    isFamilyPlan: false
  });

  const [customerQuotedFee, setCustomerQuotedFee] = useState<number>(0);

  // TV 타입 변경 시 요금제 및 셋톱박스 초기화
  useEffect(() => {
    if (tvType === 'CATV') {
      setSelections(prev => ({
        ...prev,
        tvId: 'pop_100',
        tv2Id: 'tv_none',
        stbId: 'stb_smart3_pop'
      }));
    } else {
      setSelections(prev => ({
        ...prev,
        tvId: 'tv_lite',
        tv2Id: 'tv_none',
        stbId: 'stb_smart3'
      }));
    }
  }, [tvType]);

  const { totalPrice, discountBreakdown, isTvSelected, isTv2Selected, currentAddOns, effectiveStbPrice } = useMemo(() => {
    let base = 0;
    const internet = INTERNET_PLANS.find(p => p.id === selections.internetId);
    
    const currentTvPlans = tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS;
    const currentStbOptions = tvType === 'IPTV' ? STB_OPTIONS : CATV_STB_OPTIONS;
    const currentBtv2Prices = tvType === 'IPTV' ? B_TV_2_PRICES : B_TV_2_POP_PRICES;

    const tv = currentTvPlans.find(p => p.id === selections.tvId);
    const stb = currentStbOptions.find(s => s.id === selections.stbId);

    const hasTv = !!tv && selections.tvId !== 'tv_none';
    const hasTv2 = selections.tv2Id !== null && selections.tv2Id !== 'tv_none';

    let internetPrice = 0;
    let familyDiscount = 0;

    if (internet) {
      internetPrice = internet.price;
      if (selections.isFamilyPlan) {
        if (internet.id === 'int_100m') familyDiscount = 5500;
        else if (internet.id === 'int_500m') familyDiscount = 11000;
        else if (internet.id === 'int_1g') familyDiscount = 11000;
      }
    }
    
    base += internetPrice;

    // STB 임대료 계산 (AI2_POP 및 Smart 3_POP 가변 로직)
    let currentEffectiveStbPrice = stb ? stb.price : 0;
    if (tvType === 'CATV') {
      if (selections.stbId === 'stb_ai2_pop') {
        if (selections.tvId === 'pop_230') currentEffectiveStbPrice = 0;
        else if (selections.tvId === 'pop_180') currentEffectiveStbPrice = 1100;
        else if (selections.tvId === 'pop_100') currentEffectiveStbPrice = 2200;
      } else if (selections.stbId === 'stb_smart3_pop') {
        if (selections.tvId === 'pop_230') currentEffectiveStbPrice = 2200;
        else if (selections.tvId === 'pop_180') currentEffectiveStbPrice = 3300;
        else if (selections.tvId === 'pop_100') currentEffectiveStbPrice = 3300;
      }
    }

    if (hasTv) {
      base += tv!.price;
      base += currentEffectiveStbPrice;
    }

    if (hasTv2 && selections.tv2Id) {
      const tv2Price = currentBtv2Prices[selections.tv2Id] || 0;
      base += tv2Price;
      // CATV2(pop 2nd) 임대료는 모든 요금제 2200원 고정 적용 (IPTV Smart 3 2nd와 동일하게 2200원 설정)
      base += 2200; 
    }

    const isWingsSelected = selections.addOnIds.includes('addon_wings');
    const isReliefSelected = selections.addOnIds.includes('addon_relief');
    
    let addOnPrice = 0;
    if (isWingsSelected && isReliefSelected) {
      addOnPrice = 1100 + 2200;
    } else {
      if (isWingsSelected) addOnPrice += 1650;
      if (isReliefSelected) addOnPrice += 2200;
    }
    base += addOnPrice;

    const totalPrepaid = selections.prepaidInternet + selections.prepaidTv1 + selections.prepaidTv2;

    const breakdown = {
      bundle: 0,
      mobile: 0,
      prepaid: totalPrepaid,
      stb: 0,
      stbName: '',
      family: familyDiscount
    };

    // IPTV 전용 STB 프로모션 할인
    if (tvType === 'IPTV' && hasTv && stb) {
      if (stb.id === 'stb_ai2') {
        if (tv!.id === 'tv_all' || tv!.id === 'tv_all_plus') {
          breakdown.stb = 2200;
          breakdown.stbName = 'AI 2';
        }
      } else if (stb.id === 'stb_ai4v') {
        if (tv!.id === 'tv_all') {
          breakdown.stb = 2200;
          breakdown.stbName = 'AI 4 VISION';
        } else if (tv!.id === 'tv_all_plus') {
          breakdown.stb = 4400;
          breakdown.stbName = 'AI 4 VISION';
        }
      }
    }

    if (internet && (hasTv || hasTv2) && selections.mobileLineCount === 0 && !selections.isFamilyPlan) {
      if (internet.id === 'int_100m') {
        breakdown.bundle = 1100;
      } else if (internet.id === 'int_500m' || internet.id === 'int_1g') {
        breakdown.bundle = 5500;
      }
    }

    if (selections.mobileLineCount > 0 && !selections.isFamilyPlan) {
      // CATV(pop)은 휴대폰 결합 시 TV 할인(1,100원)이 적용되지 않음
      if ((hasTv || hasTv2) && tvType !== 'CATV') {
        breakdown.mobile += MOBILE_COMBINATION_DISCOUNTS.TV;
      }
      if (internet) {
        const internetDiscount = (MOBILE_COMBINATION_DISCOUNTS.INTERNET as any)[internet.id] || 0;
        breakdown.mobile += internetDiscount;
      }
    }

    const finalPrice = Math.max(0, base - breakdown.bundle - breakdown.mobile - breakdown.prepaid - breakdown.stb - breakdown.family);

    return { 
      totalPrice: finalPrice, 
      discountBreakdown: breakdown,
      isTvSelected: hasTv,
      isTv2Selected: hasTv2,
      currentAddOns: selections.addOnIds.map(id => INTERNET_ADD_ONS.find(a => a.id === id)?.name).filter(Boolean),
      effectiveStbPrice: currentEffectiveStbPrice
    };
  }, [selections, tvType]);

  const recommendedPrepaid = useMemo(() => {
    if (customerQuotedFee <= 0) return 0;
    return Math.max(0, totalPrice - customerQuotedFee);
  }, [totalPrice, customerQuotedFee]);

  const toggleAddOn = (id: string) => {
    setSelections(prev => {
      const isSelected = prev.addOnIds.includes(id);
      return {
        ...prev,
        addOnIds: isSelected 
          ? prev.addOnIds.filter(item => item !== id)
          : [...prev.addOnIds, id]
      };
    });
  };

  const handleMobileBundleClick = () => {
    if (selections.isFamilyPlan) {
      alert("패밀리요금제 선택중입니다. 패밀리 요금제는 휴대폰 결합과 중복 적용이 불가능합니다.");
      return;
    }
    setSelections(prev => ({ ...prev, mobileLineCount: 1 }));
  };

  const applyGiga1Package = () => {
    setTvType('IPTV');
    setSelections(prev => ({
      ...prev,
      internetId: 'int_1g',
      tvId: 'tv_all_plus',
      tv2Id: 'tv_none',
      stbId: 'stb_smart3',
      addOnIds: ['addon_relief'],
      isFamilyPlan: false,
      mobileLineCount: 0
    }));
  };

  const applyGira1Package = () => {
    setTvType('IPTV');
    setSelections(prev => ({
      ...prev,
      internetId: 'int_500m',
      tvId: 'tv_all_plus',
      tv2Id: 'tv_none',
      stbId: 'stb_smart3',
      addOnIds: ['addon_relief'],
      isFamilyPlan: false,
      mobileLineCount: 0
    }));
  };

  const applyGira2Package = () => {
    setTvType('IPTV');
    setSelections(prev => ({
      ...prev,
      internetId: 'int_500m',
      tvId: 'tv_all',
      tv2Id: 'tv_none',
      stbId: 'stb_smart3',
      addOnIds: ['addon_relief'],
      isFamilyPlan: false,
      mobileLineCount: 0
    }));
  };

  const prepaidAmounts = Array.from({ length: 8 }, (_, i) => (i + 1) * 1100);
  const showWingsDiscountInfo = selections.addOnIds.includes('addon_wings') && selections.addOnIds.includes('addon_relief');

  return (
    <div className="min-h-screen pb-48 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-xs">SK</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 flex flex-wrap items-center">
              SKB업셀 계산기
              <span className="ml-2 text-xs md:text-sm font-medium text-violet-500">(지정 사용자 전용)</span>
            </h1>
          </div>
          <div className="text-xs text-slate-400 font-medium">3년 약정 기준</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8">
        <div className="space-y-12">
          
          <section className="bg-gradient-to-br from-violet-50 to-white p-6 rounded-3xl border border-violet-100 shadow-sm">
            <SectionHeader title="업셀링 빠른선택" step="0" badge="Recommended">
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-violet-200 shadow-sm w-full md:w-auto">
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setTvType('IPTV')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                      tvType === 'IPTV' 
                        ? 'bg-violet-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    IPTV
                  </button>
                  <button
                    onClick={() => setTvType('CATV')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                      tvType === 'CATV' 
                        ? 'bg-violet-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    CATV
                  </button>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto border-l sm:border-l border-slate-200 sm:pl-4">
                  <label htmlFor="quote" className="text-sm font-bold text-slate-700 whitespace-nowrap">고객안내요금</label>
                  <div className="relative flex-grow sm:flex-grow-0">
                    <input 
                      type="number" 
                      id="quote"
                      placeholder="0"
                      value={customerQuotedFee || ''}
                      onChange={(e) => setCustomerQuotedFee(Number(e.target.value))}
                      className="w-full md:w-40 bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-1.5 text-right font-bold text-violet-600 focus:outline-none focus:border-violet-500 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">원</span>
                  </div>
                </div>
              </div>
            </SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PlanCard 
                selected={selections.internetId === 'int_500m' && selections.tvId === 'tv_all_plus' && tvType === 'IPTV'}
                onClick={applyGira1Package}
                title="기라_1"
                description="500M + 안심 + 올플 (IPTV)"
                className="bg-white/80"
              />
              <PlanCard 
                selected={selections.internetId === 'int_500m' && selections.tvId === 'tv_all' && tvType === 'IPTV'}
                onClick={applyGira2Package}
                title="기라_2"
                description="500M + 안심 + 올 (IPTV)"
                className="bg-white/80"
              />
              <PlanCard 
                selected={selections.internetId === 'int_1g' && selections.tvId === 'tv_all_plus' && tvType === 'IPTV'}
                onClick={applyGiga1Package}
                title="기가_1"
                description="1G + 안심 + 올플 (IPTV)"
                className="bg-white/80"
              />
            </div>
          </section>

          <section>
            <SectionHeader title="인터넷 속도를 선택하세요" step={1}>
              <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl hover:border-violet-300 transition-colors shadow-sm">
                <span className="text-sm font-bold text-slate-700">패밀리 요금제</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={selections.isFamilyPlan}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setSelections(prev => ({ 
                        ...prev, 
                        isFamilyPlan: isChecked,
                        mobileLineCount: isChecked ? 0 : prev.mobileLineCount
                      }));
                    }}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>
            </SectionHeader>

            {selections.isFamilyPlan && (
              <div className="mb-6 bg-violet-50 border border-violet-100 p-4 rounded-2xl animate-slide-up shadow-sm">
                <h4 className="text-violet-800 font-bold text-sm mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  패밀리 요금제 가입 안내 (공식 기준)
                </h4>
                <ul className="text-xs text-violet-700 space-y-2 ml-7 list-disc font-medium leading-relaxed">
                  <li>타지역에 SK브로드밴드 인터넷을 사용 중인 가족(본인/배우자/직계존비속)이 있는 경우 가입 가능합니다.</li>
                  <li>가입 시 가족관계를 증명할 수 있는 서류(가족관계증명서 등) 제출이 필수입니다.</li>
                  <li className="font-bold text-violet-900 bg-violet-100/50 px-1 rounded">휴대폰 결합 할인과 중복 적용이 불가능합니다.</li>
                  <li>기존 고객이 패밀리로 변경 시 혜택이 상이할 수 있으니 센터 확인이 필요합니다.</li>
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {INTERNET_PLANS.map((plan) => (
                <PlanCard 
                  key={plan.id}
                  selected={selections.internetId === plan.id}
                  onClick={() => setSelections(prev => ({ ...prev, internetId: plan.id }))}
                  title={`${plan.name} (${plan.speed})`}
                  price={plan.price}
                  description={plan.description}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="인터넷 부가서비스" step="1-1" />
            {showWingsDiscountInfo && (
              <div className="mb-6 bg-fuchsia-50 border border-fuchsia-100 p-4 rounded-2xl animate-slide-up flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-fuchsia-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm text-fuchsia-800 font-medium">
                  <span className="font-bold">패키지 할인:</span> 윙즈+안심서비스 동시 선택 시 윙즈 요금이 <span className="text-fuchsia-900 font-bold">1,100원</span>으로 할인됩니다.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INTERNET_ADD_ONS.map((addon) => (
                <PlanCard 
                  key={addon.id}
                  selected={selections.addOnIds.includes(addon.id)}
                  onClick={() => toggleAddOn(addon.id)}
                  title={addon.name}
                  price={addon.price}
                  description={addon.description}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title={`${tvType} 요금제`} step={2} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <PlanCard 
                selected={selections.tvId === 'tv_none'}
                onClick={() => setSelections(prev => ({ ...prev, tvId: 'tv_none' }))}
                title="선택 안함"
                price={0}
                description="메인 TV를 신청하지 않습니다."
              />
              {(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).map((plan) => (
                <PlanCard 
                  key={plan.id}
                  selected={selections.tvId === plan.id}
                  onClick={() => setSelections(prev => ({ ...prev, tvId: plan.id }))}
                  title={`${plan.name} (${plan.channels}채널)`}
                  price={plan.price}
                  description={plan.description}
                />
              ))}
            </div>
          </section>

          {isTvSelected && (
            <section className="animate-slide-up">
              <SectionHeader title={`메인 TV ${tvType} 셋톱박스`} step="2-1" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(tvType === 'IPTV' ? STB_OPTIONS : CATV_STB_OPTIONS).map((stb) => {
                  // 실시간으로 변동되는 STB 임대료 계산 (UI 표시용)
                  let displayPrice = stb.price;
                  if (tvType === 'CATV') {
                    if (stb.id === 'stb_ai2_pop') {
                      if (selections.tvId === 'pop_230') displayPrice = 0;
                      else if (selections.tvId === 'pop_180') displayPrice = 1100;
                      else if (selections.tvId === 'pop_100') displayPrice = 2200;
                    } else if (stb.id === 'stb_smart3_pop') {
                      if (selections.tvId === 'pop_230') displayPrice = 2200;
                      else if (selections.tvId === 'pop_180') displayPrice = 3300;
                      else if (selections.tvId === 'pop_100') displayPrice = 3300;
                    }
                  }

                  return (
                    <PlanCard 
                      key={stb.id}
                      selected={selections.stbId === stb.id}
                      onClick={() => setSelections(prev => ({ ...prev, stbId: stb.id }))}
                      title={stb.name}
                      price={displayPrice}
                      description={stb.description}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title={`${tvType} 2 요금제 (추가 TV)`} step={3} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <PlanCard 
                selected={selections.tv2Id === 'tv_none'}
                onClick={() => setSelections(prev => ({ ...prev, tv2Id: 'tv_none' }))}
                title="선택 안함"
                price={0}
                description="추가 TV를 사용하지 않습니다."
              />
              {(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).map((plan) => (
                <PlanCard 
                  key={plan.id}
                  selected={selections.tv2Id === plan.id}
                  onClick={() => setSelections(prev => ({ ...prev, tv2Id: plan.id }))}
                  title={plan.name}
                  price={(tvType === 'IPTV' ? B_TV_2_PRICES : B_TV_2_POP_PRICES)[plan.id]}
                  description={tvType === 'IPTV' ? "Smart 3 고정" : "Smart 3_POP 고정"}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="휴대폰 결합" step={4} />
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-2 text-slate-800">SKT 휴대폰 결합</h3>
                  <p className="text-sm text-slate-500">가족의 휴대폰 회선 결합 유무를 선택하세요. (요즘가족결합 기준)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelections(prev => ({ ...prev, mobileLineCount: 0 }))}
                    className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${
                      selections.mobileLineCount === 0
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-violet-200'
                    }`}
                  >
                    결합 안함
                  </button>
                  <button
                    onClick={handleMobileBundleClick}
                    className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${
                      selections.mobileLineCount >= 1
                        ? 'bg-violet-600 border-violet-600 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-violet-400'
                    }`}
                  >
                    휴대폰 결합
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="pb-10">
            <SectionHeader title="선납권 할인" step={5} />
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <label className="block font-bold text-slate-700 text-sm">인터넷 선납권</label>
                <select
                  value={selections.prepaidInternet}
                  onChange={(e) => setSelections(prev => ({ ...prev, prepaidInternet: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value={0}>할인 없음</option>
                  {prepaidAmounts.map(val => (
                    <option key={val} value={val}>-{val.toLocaleString()}원 할인</option>
                  ))}
                </select>
              </div>
              <div className="space-y-4">
                <label className="block font-bold text-slate-700 text-sm">B tv 1 선납권</label>
                <select
                  value={selections.prepaidTv1}
                  onChange={(e) => setSelections(prev => ({ ...prev, prepaidTv1: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value={0}>할인 없음</option>
                  {prepaidAmounts.map(val => (
                    <option key={val} value={val}>-{val.toLocaleString()}원 할인</option>
                  ))}
                </select>
              </div>
              <div className="space-y-4">
                <label className="block font-bold text-slate-700 text-sm">B tv 2 선납권</label>
                <select
                  value={selections.prepaidTv2}
                  onChange={(e) => setSelections(prev => ({ ...prev, prepaidTv2: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value={0}>할인 없음</option>
                  {prepaidAmounts.map(val => (
                    <option key={val} value={val}>-{val.toLocaleString()}원 할인</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky Summary Bar (Purple Theme) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-12px_40px_rgba(0,0,0,0.08)] z-50 backdrop-blur-md bg-white/95">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1 w-full md:w-auto">
               <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">{INTERNET_PLANS.find(p => p.id === selections.internetId)?.name}</span>
                {selections.isFamilyPlan && <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-100 font-bold">패밀리</span>}
                {currentAddOns.map(name => (
                  <span key={name} className="bg-fuchsia-50 text-fuchsia-700 px-2 py-0.5 rounded border border-fuchsia-100">{name}</span>
                ))}
                {isTvSelected && (
                  <>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">{(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tvId)?.name}</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">{(tvType === 'IPTV' ? STB_OPTIONS : CATV_STB_OPTIONS).find(p => p.id === selections.stbId)?.name}</span>
                  </>
                )}
                {isTv2Selected && (
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-bold">
                    {(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tv2Id)?.name} (2nd)
                  </span>
                )}
                <span className="bg-violet-600 text-white px-2 py-0.5 rounded font-black text-[10px] tracking-tighter uppercase">{tvType}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {discountBreakdown.bundle > 0 && <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">결합할인 -{discountBreakdown.bundle.toLocaleString()}</div>}
                {discountBreakdown.family > 0 && <div className="text-[10px] text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded border border-violet-100">패밀리 -{discountBreakdown.family.toLocaleString()}</div>}
                {discountBreakdown.mobile > 0 && <div className="text-[10px] text-violet-600 font-bold bg-violet-100 px-2 py-0.5 rounded border border-violet-200">휴대폰 -{discountBreakdown.mobile.toLocaleString()}</div>}
                {discountBreakdown.stb > 0 && <div className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">STB할인 -{discountBreakdown.stb.toLocaleString()}</div>}
                {discountBreakdown.prepaid > 0 && <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">선납권 -{discountBreakdown.prepaid.toLocaleString()}</div>}
              </div>
            </div>

            <div className="flex items-center gap-6 md:gap-10 w-full md:w-auto justify-between md:justify-end">
              {customerQuotedFee > 0 && (
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-fuchsia-500 font-black mb-0.5">선납권 추천액</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-fuchsia-600">{recommendedPrepaid.toLocaleString()}</span>
                    <span className="text-sm font-bold text-fuchsia-600">원</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-end border-l border-slate-100 pl-6 md:pl-10">
                <div className="text-[10px] text-slate-400 font-black mb-0.5 uppercase tracking-wider">월 예상 납부액</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-violet-600 tracking-tighter">{totalPrice.toLocaleString()}</span>
                  <span className="text-xl font-bold text-slate-900">원</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
