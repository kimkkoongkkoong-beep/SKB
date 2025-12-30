
import React, { useState, useMemo } from 'react';
import { 
  INTERNET_PLANS, 
  INTERNET_ADD_ONS,
  TV_PLANS, 
  STB_OPTIONS, 
  MOBILE_COMBINATION_DISCOUNTS 
} from './constants';
import { SelectionState } from './types';

// B tv 2 전용 요금제 맵 (사용자 요청: 이전 금액에서 각 2,200원 차감)
const B_TV_2_PRICES: Record<string, number> = {
  'tv_lite': 6050,      // 8250 - 2200
  'tv_standard': 7700,  // 9900 - 2200
  'tv_all': 9350,       // 11550 - 2200
  'tv_all_plus': 14850, // 17050 - 2200
  'tv_none': 0
};

// Reusable Components
const SectionHeader: React.FC<{ title: string; step: string | number; badge?: string; children?: React.ReactNode }> = ({ title, step, badge, children }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white font-bold text-sm">
        {step}
      </span>
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {badge && (
          <span className="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-md uppercase tracking-wider w-fit">
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
    className={`relative flex flex-col p-5 rounded-2xl border-2 transition-all text-left w-full h-full ${
      selected 
        ? 'border-red-600 bg-red-50 ring-1 ring-red-600' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
  >
    <div className="flex flex-col flex-grow">
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 flex-grow">{description}</p>
      {price !== undefined && (
        <div className="mt-auto">
          <span className="text-xl font-bold text-red-600">{price.toLocaleString()}</span>
          <span className="text-sm text-gray-600 ml-1">원/월</span>
        </div>
      )}
    </div>
    {selected && (
      <div className="absolute top-3 right-3 text-red-600">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
    )}
  </button>
);

const App: React.FC = () => {
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

  const { totalPrice, discountBreakdown, isTvSelected, isTv2Selected, currentAddOns } = useMemo(() => {
    let base = 0;
    const internet = INTERNET_PLANS.find(p => p.id === selections.internetId);
    const tv = TV_PLANS.find(p => p.id === selections.tvId);
    const stb = STB_OPTIONS.find(s => s.id === selections.stbId);

    const hasTv = !!tv && selections.tvId !== 'tv_none';
    const hasTv2 = selections.tv2Id !== null && selections.tv2Id !== 'tv_none';

    // 인터넷 가격 계산
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

    // 메인 TV 계산
    if (hasTv) {
      base += tv!.price;
      if (stb) base += stb.price;
    }

    // 두 번째 TV (B tv 2) 계산
    if (hasTv2 && selections.tv2Id) {
      const tv2Price = B_TV_2_PRICES[selections.tv2Id] || 0;
      base += tv2Price;
      base += 2200; // Smart 3 (50% 할인 적용)
    }

    // 부가서비스 계산
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

    // 메인 셋톱박스 할인 로직
    if (hasTv && stb) {
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

    // 기본 결합 할인 (요즘우리집결합)
    if (internet && (hasTv || hasTv2) && selections.mobileLineCount === 0 && !selections.isFamilyPlan) {
      if (internet.id === 'int_100m') {
        breakdown.bundle = 1100;
      } else if (internet.id === 'int_500m' || internet.id === 'int_1g') {
        breakdown.bundle = 5500;
      }
    }

    // 휴대폰 결합 할인
    if (selections.mobileLineCount > 0 && !selections.isFamilyPlan) {
      if (hasTv || hasTv2) {
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
      currentAddOns: selections.addOnIds.map(id => INTERNET_ADD_ONS.find(a => a.id === id)?.name).filter(Boolean)
    };
  }, [selections]);

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
      alert("패밀리요금제 선택중입니다");
      return;
    }
    setSelections(prev => ({ ...prev, mobileLineCount: 1 }));
  };

  const applyGiga1Package = () => {
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

  // 요청사항: 선납권 할인 1,100원~8,800원 (부가세 10% 포함)
  const prepaidAmounts = Array.from({ length: 8 }, (_, i) => (i + 1) * 1100);

  return (
    <div className="min-h-screen pb-48">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white font-black text-xs">SK</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-gray-800 flex flex-wrap items-center">
              SKB업셀 계산기
              <span className="ml-2 text-xs md:text-sm font-medium text-red-500">(지정된사용자만 사용, 유포금지)</span>
            </h1>
          </div>
          <div className="text-xs text-gray-400 font-medium">3년 약정 기준</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8">
        <div className="space-y-12">
          
          <section className="bg-gradient-to-br from-red-50 to-white p-6 rounded-3xl border border-red-100 shadow-sm">
            <SectionHeader title="업셀링 빠른선택" step="0" badge="Recommended">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-red-200 shadow-sm w-full md:w-auto">
                <label htmlFor="quote" className="text-sm font-bold text-gray-700 whitespace-nowrap">고객안내요금</label>
                <div className="relative flex-grow md:flex-grow-0">
                  <input 
                    type="number" 
                    id="quote"
                    placeholder="0"
                    value={customerQuotedFee || ''}
                    onChange={(e) => setCustomerQuotedFee(Number(e.target.value))}
                    className="w-full md:w-40 bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-right font-bold text-red-600 focus:outline-none focus:border-red-500 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">원</span>
                </div>
              </div>
            </SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PlanCard 
                selected={selections.internetId === 'int_500m' && selections.tvId === 'tv_all_plus' && !isTv2Selected}
                onClick={applyGira1Package}
                title="기라_1"
                description="500M + 안심 + 올플 (Smart3 자동 선택)"
                className="bg-white/80"
              />
              <PlanCard 
                selected={selections.internetId === 'int_500m' && selections.tvId === 'tv_all' && !isTv2Selected}
                onClick={applyGira2Package}
                title="기라_2"
                description="500M + 안심 + 올 (Smart3 자동 선택)"
                className="bg-white/80"
              />
              <PlanCard 
                selected={selections.internetId === 'int_1g' && selections.tvId === 'tv_all_plus' && !isTv2Selected}
                onClick={applyGiga1Package}
                title="기가_1"
                description="1G + 안심 + 올플 (Smart3 자동 선택)"
                className="bg-white/80"
              />
            </div>
          </section>

          <section>
            <SectionHeader title="인터넷 속도를 선택하세요" step={1}>
              <div className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-2 rounded-2xl hover:border-red-300 transition-colors shadow-sm">
                <span className="text-sm font-bold text-gray-700">패밀리 요금제</span>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </SectionHeader>
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
            <SectionHeader title="인터넷 부가서비스를 선택하세요" step="1-1" />
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
            <SectionHeader title="B tv 요금제를 선택하세요" step={2} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <PlanCard 
                selected={selections.tvId === 'tv_none'}
                onClick={() => setSelections(prev => ({ ...prev, tvId: 'tv_none' }))}
                title="선택 안함"
                price={0}
                description="메인 TV를 사용하지 않습니다."
              />
              {TV_PLANS.map((plan) => (
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
              <SectionHeader title="메인 TV 셋톱박스를 선택하세요" step="2-1" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {STB_OPTIONS.map((stb) => (
                  <PlanCard 
                    key={stb.id}
                    selected={selections.stbId === stb.id}
                    onClick={() => setSelections(prev => ({ ...prev, stbId: stb.id }))}
                    title={stb.name}
                    price={stb.price}
                    description={stb.description}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title="B tv 2 요금제를 선택하세요 (TV 2대 사용자)" step={3} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <PlanCard 
                selected={selections.tv2Id === 'tv_none'}
                onClick={() => setSelections(prev => ({ ...prev, tv2Id: 'tv_none' }))}
                title="선택 안함"
                price={0}
                description="추가 TV를 사용하지 않습니다."
              />
              {TV_PLANS.map((plan) => (
                <PlanCard 
                  key={plan.id}
                  selected={selections.tv2Id === plan.id}
                  onClick={() => setSelections(prev => ({ ...prev, tv2Id: plan.id }))}
                  title={plan.name}
                  price={B_TV_2_PRICES[plan.id]}
                  description="셋톱박스는 Smart 3로 고정됩니다."
                />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="휴대폰 결합 할인을 적용하세요" step={4} />
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">SKT 휴대폰 결합</h3>
                  <p className="text-sm text-gray-500">가족의 휴대폰 회선 결합 유무를 선택하세요. (요즘가족결합 기준)</p>
                  <p className="text-xs text-red-500 mt-1 font-bold">※ 패밀리 요금제와는 중복 적용이 불가능합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelections(prev => ({ ...prev, mobileLineCount: 0 }))}
                    className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${
                      selections.mobileLineCount === 0
                        ? 'bg-gray-100 border-gray-400 text-gray-800'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    결합 안함
                  </button>
                  <button
                    onClick={handleMobileBundleClick}
                    className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${
                      selections.mobileLineCount >= 1
                        ? 'bg-red-600 border-red-600 text-white shadow-md'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-red-400'
                    }`}
                  >
                    휴대폰 결합
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="pb-10">
            <SectionHeader title="선납권 할인을 선택하세요" step={5} />
            <div className="mb-6 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-sm text-blue-700 leading-relaxed">
                <span className="font-bold block mb-1">💡 선납권 할인 안내</span>
                인터넷 및 B tv 요금에서 추가 할인을 적용할 수 있는 권권입니다. 각 항목별로 중복 적용이 가능하며, 대구 및 서울 지역은 특별 혜택이 적용될 수 있습니다. (부가세 10% 포함된 금액이 노출됩니다.)
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <label className="block font-bold text-gray-700">인터넷 선납권</label>
                <select
                  value={selections.prepaidInternet}
                  onChange={(e) => setSelections(prev => ({ ...prev, prepaidInternet: Number(e.target.value) }))}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value={0}>할인 없음</option>
                  {prepaidAmounts.map(val => (
                    <option key={val} value={val}>-{val.toLocaleString()}원 할인</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <label className="block font-bold text-gray-700">B tv 1 선납권</label>
                <select
                  value={selections.prepaidTv1}
                  onChange={(e) => setSelections(prev => ({ ...prev, prepaidTv1: Number(e.target.value) }))}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value={0}>할인 없음</option>
                  {prepaidAmounts.map(val => (
                    <option key={val} value={val}>-{val.toLocaleString()}원 할인</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <label className="block font-bold text-gray-700">B tv 2 선납권</label>
                <select
                  value={selections.prepaidTv2}
                  onChange={(e) => setSelections(prev => ({ ...prev, prepaidTv2: Number(e.target.value) }))}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:border-red-500 transition-colors"
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

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            
            <div className="flex flex-col gap-1 w-full md:w-auto">
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded">{INTERNET_PLANS.find(p => p.id === selections.internetId)?.name}</span>
                {selections.isFamilyPlan && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-bold">패밀리</span>}
                {currentAddOns.map(name => (
                  <span key={name} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{name}</span>
                ))}
                {isTvSelected && (
                  <>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{TV_PLANS.find(p => p.id === selections.tvId)?.name}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{STB_OPTIONS.find(p => p.id === selections.stbId)?.name}</span>
                  </>
                )}
                {isTv2Selected && (
                  <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100 font-bold">TV 2대</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {discountBreakdown.bundle > 0 && (
                  <div className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">
                    요즘우리집결합 -{discountBreakdown.bundle.toLocaleString()}
                  </div>
                )}
                {discountBreakdown.family > 0 && (
                  <div className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    패밀리 -{discountBreakdown.family.toLocaleString()}
                  </div>
                )}
                {discountBreakdown.mobile > 0 && (
                  <div className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    휴대폰 -{discountBreakdown.mobile.toLocaleString()}
                  </div>
                )}
                {discountBreakdown.stb > 0 && (
                  <div className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                    STB할인 -{discountBreakdown.stb.toLocaleString()}
                  </div>
                )}
                {discountBreakdown.prepaid > 0 && (
                  <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    선납권 합계 -{discountBreakdown.prepaid.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 md:gap-10 w-full md:w-auto justify-between md:justify-end">
              {customerQuotedFee > 0 && (
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-indigo-500 font-black mb-0.5">선납권추천(고객요금-선택요금)>선납>선i
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-indigo-600">{recommendedPrepaid.toLocaleString()}</span>
                    <span className="text-sm font-bold text-indigo-600">원</span>
                  </div>
                  <div className="text-[10px] text-red-500 font-bold mt-1">
                    ※ 대구, 서울만 8,800원 사용가능
                  </div>
                </div>
              )}
              
              <div className="flex flex-col items-end border-l border-gray-100 pl-6 md:pl-10">
                <div className="text-[10px] text-gray-400 font-black mb-0.5">월 예상 납부액</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-red-600 tracking-tighter">{totalPrice.toLocaleString()}</span>
                  <span className="text-xl font-bold text-gray-900">원</span>
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
