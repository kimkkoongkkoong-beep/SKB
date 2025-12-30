
import React, { useState, useMemo } from 'react';
import { 
  INTERNET_PLANS, 
  INTERNET_ADD_ONS,
  TV_PLANS, 
  STB_OPTIONS, 
  BASE_BUNDLE_DISCOUNT, 
  MOBILE_COMBINATION_DISCOUNTS 
} from './constants';
import { SelectionState } from './types';

// Reusable Components
const SectionHeader: React.FC<{ title: string; step: string | number; badge?: string; children?: React.ReactNode }> = ({ title, step, badge, children }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white font-bold text-sm">
        {step}
      </span>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {badge && (
          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-md uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
    </div>
    {children}
  </div>
);

const PlanCard: React.FC<{ 
  selected: boolean; 
  onClick: () => void; 
  title: string; 
  price?: number; 
  description: string;
  className?: string;
}> = ({ selected, onClick, title, price, description, className = "" }) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col p-5 rounded-2xl border-2 transition-all text-left w-full h-full ${
      selected 
        ? 'border-red-600 bg-red-50 ring-1 ring-red-600' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    } ${className}`}
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
    stbId: 'stb_smart3',
    mobileLineCount: 0,
    prepaidDiscount: 0,
    addOnIds: []
  });

  const [customerQuotedFee, setCustomerQuotedFee] = useState<number>(0);

  const { totalPrice, discountBreakdown, isTvSelected, currentAddOns } = useMemo(() => {
    let base = 0;
    const internet = INTERNET_PLANS.find(p => p.id === selections.internetId);
    const tv = TV_PLANS.find(p => p.id === selections.tvId);
    const stb = STB_OPTIONS.find(s => s.id === selections.stbId);

    const hasTv = !!tv && selections.tvId !== 'tv_none';

    if (internet) base += internet.price;
    if (hasTv) {
      base += tv!.price;
      if (stb) base += stb.price;
    }

    // 부가서비스 계산
    const isWingsSelected = selections.addOnIds.includes('addon_wings');
    const isReliefSelected = selections.addOnIds.includes('addon_relief');
    
    let addOnPrice = 0;
    if (isWingsSelected && isReliefSelected) {
      // 둘 다 선택 시 윙즈 1,100원 + 안심서비스 2,200원
      addOnPrice = 1100 + 2200;
    } else {
      if (isWingsSelected) addOnPrice += 1650;
      if (isReliefSelected) addOnPrice += 2200;
    }
    base += addOnPrice;

    const breakdown = {
      bundle: 0,
      mobile: 0,
      prepaid: selections.prepaidDiscount,
      stb: 0,
      stbName: ''
    };

    // 셋톱박스 할인 로직
    if (hasTv && stb) {
      if (stb.id === 'stb_ai2') {
        // AI 2: B tv All 이상 선택 시 2,200원 할인
        if (tv!.id === 'tv_all' || tv!.id === 'tv_all_plus') {
          breakdown.stb = 2200;
          breakdown.stbName = 'AI 2';
        }
      } else if (stb.id === 'stb_ai4v') {
        // AI 4 VISION: All 2,200원, All+ 4,400원 할인
        if (tv!.id === 'tv_all') {
          breakdown.stb = 2200;
          breakdown.stbName = 'AI 4 VISION';
        } else if (tv!.id === 'tv_all_plus') {
          breakdown.stb = 4400;
          breakdown.stbName = 'AI 4 VISION';
        }
      }
    }

    // 기본 결합 할인 (요즘우리집결합) - 휴대폰 결합 미적용 시에만 적용
    if (internet && hasTv && selections.mobileLineCount === 0) {
      if (internet.id === 'int_100m') {
        // 광랜(100M) + TV 선택 시 인터넷 요금 1,100원 할인
        breakdown.bundle = 1100;
      } else if (internet.id === 'int_500m' || internet.id === 'int_1g') {
        // 기가라이트(500M) 이상 + TV 선택 시 인터넷 요금 5,500원 할인
        breakdown.bundle = 5500;
      }
    }

    // 휴대폰 결합 할인 (1회선 이상일 때 적용)
    if (selections.mobileLineCount > 0) {
      if (hasTv) {
        breakdown.mobile += MOBILE_COMBINATION_DISCOUNTS.TV;
      }
      if (internet) {
        const internetDiscount = (MOBILE_COMBINATION_DISCOUNTS.INTERNET as any)[internet.id] || 0;
        breakdown.mobile += internetDiscount;
      }
    }

    const finalPrice = Math.max(0, base - breakdown.bundle - breakdown.mobile - breakdown.prepaid - breakdown.stb);

    return { 
      totalPrice: finalPrice, 
      discountBreakdown: breakdown,
      isTvSelected: hasTv,
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

  const applyGiga1Package = () => {
    setSelections(prev => ({
      ...prev,
      internetId: 'int_1g',
      tvId: 'tv_all_plus',
      stbId: 'stb_smart3',
      addOnIds: ['addon_relief']
    }));
  };

  const applyGira1Package = () => {
    setSelections(prev => ({
      ...prev,
      internetId: 'int_500m',
      tvId: 'tv_all_plus',
      stbId: 'stb_smart3',
      addOnIds: ['addon_relief']
    }));
  };

  const applyGira2Package = () => {
    setSelections(prev => ({
      ...prev,
      internetId: 'int_500m',
      tvId: 'tv_all',
      stbId: 'stb_smart3',
      addOnIds: ['addon_relief']
    }));
  };

  // 현재 패키지 상태 확인
  const isGiga1Selected = 
    selections.internetId === 'int_1g' && 
    selections.tvId === 'tv_all_plus' && 
    selections.stbId === 'stb_smart3' && 
    selections.addOnIds.length === 1 && 
    selections.addOnIds.includes('addon_relief');

  const isGira1Selected = 
    selections.internetId === 'int_500m' && 
    selections.tvId === 'tv_all_plus' && 
    selections.stbId === 'stb_smart3' && 
    selections.addOnIds.length === 1 && 
    selections.addOnIds.includes('addon_relief');

  const isGira2Selected = 
    selections.internetId === 'int_500m' && 
    selections.tvId === 'tv_all' && 
    selections.stbId === 'stb_smart3' && 
    selections.addOnIds.length === 1 &&
    selections.addOnIds.includes('addon_relief');

  const prepaidOptions = Array.from({ length: 16 }, (_, i) => (i + 1) * 1000);

  return (
    <div className="min-h-screen pb-48">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white font-black text-xs">SK</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-gray-800">SKB업셀 계산기( 지정사용자외 사용,유포금지)</h1>
          </div>
          <div className="text-xs text-gray-400 font-medium">3년 약정 기준</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8">
        <div className="space-y-12">
          
          {/* Quick Select Section */}
          <section className="bg-gradient-to-br from-red-50 to-white p-6 rounded-3xl border border-red-100 shadow-sm">
            <SectionHeader title="업셀링 빠른선택" step="0" badge="Recommended">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-red-200 shadow-sm">
                <label htmlFor="quote" className="text-sm font-bold text-gray-700 whitespace-nowrap">고객안내요금</label>
                <div className="relative">
                  <input 
                    type="number" 
                    id="quote"
                    placeholder="0"
                    value={customerQuotedFee || ''}
                    onChange={(e) => setCustomerQuotedFee(Number(e.target.value))}
                    className="w-32 md:w-40 bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-right font-bold text-red-600 focus:outline-none focus:border-red-500 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">원</span>
                </div>
              </div>
            </SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PlanCard 
                selected={isGira1Selected}
                onClick={applyGira1Package}
                title="기라_1"
                description="500M + 안심 + 올플 (Smart3 자동 선택)"
                className={isGira1Selected ? 'bg-red-50' : 'bg-white/80'}
              />
              <PlanCard 
                selected={isGira2Selected}
                onClick={applyGira2Package}
                title="기라_2"
                description="500M + 안심 + 올 (Smart3 자동 선택)"
                className={isGira2Selected ? 'bg-red-50' : 'bg-white/80'}
              />
              <PlanCard 
                selected={isGiga1Selected}
                onClick={applyGiga1Package}
                title="기가_1"
                description="1G + 안심 + 올플 (Smart3 자동 선택)"
                className={isGiga1Selected ? 'bg-red-50' : 'bg-white/80'}
              />
            </div>
          </section>

          {/* Step 1: Internet */}
          <section>
            <SectionHeader title="인터넷 속도를 선택하세요" step={1} />
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

          {/* Step 1-1: Internet Add-ons */}
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
            {selections.addOnIds.includes('addon_wings') && selections.addOnIds.includes('addon_relief') && (
              <p className="mt-3 text-sm text-blue-600 font-medium bg-blue-50 p-3 rounded-lg border border-blue-100">
                ✨ 윙즈와 안심서비스를 함께 이용하시면 윙즈 요금이 550원 할인됩니다. (1,100원 적용)
              </p>
            )}
          </section>

          {/* Step 2: TV */}
          <section>
            <SectionHeader title="B tv 요금제를 선택하세요" step={2} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <PlanCard 
                selected={selections.tvId === 'tv_none'}
                onClick={() => setSelections(prev => ({ ...prev, tvId: 'tv_none' }))}
                title="선택 안함"
                price={0}
                description="인터넷만 단독으로 사용합니다."
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

          {/* Step 3: Set-top Box */}
          {isTvSelected && (
            <section className="animate-slide-up">
              <SectionHeader title="셋톱박스를 선택하세요" step={3} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Step 4: Mobile Bundle */}
          <section>
            <SectionHeader title="휴대폰 결합 할인을 적용하세요" step={4} />
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">SKT 휴대폰 결합</h3>
                  <p className="text-sm text-gray-500">결합하는 가족의 휴대폰 회선 유무를 선택하세요. (요즘가족결합 기준)</p>
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
                    onClick={() => setSelections(prev => ({ ...prev, mobileLineCount: 1 }))}
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
              {selections.mobileLineCount > 0 && (
                <div className="mt-6 space-y-2 animate-slide-up">
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-bold">결합 할인 혜택 적용 중</p>
                      <p className="text-xs opacity-80 mt-1">휴대폰 결합 시 요즘우리집결합(인터넷+TV) 기본 할인은 휴대폰 결합 할인으로 대체됩니다.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Step 5: Prepaid Discount */}
          <section className="pb-10">
            <SectionHeader title="선납권 할인을 선택하세요" step={5} />
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">선납권 할인</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">인터넷 추가 할인액을 선택해 주세요. (1,000원 ~ 16,000원)</p>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                      <p className="text-xs md:text-sm text-blue-700 font-bold leading-relaxed">
                        💡 업셀은 하단 선납권 추천금액을 이용해주시고, <br className="hidden md:block" />
                        요금계산시 선납권 금액을 선택하여 월예상납부액을 확인하면됩니다.
                      </p>
                    </div>
                    <p className="text-xs font-bold text-red-600 bg-red-50 inline-block px-2 py-0.5 rounded border border-red-100 mt-1">
                      ※ 대구골든, 레드만 선납권 16,000원 가능합니다
                    </p>
                  </div>
                </div>
                <div className="w-full md:w-64">
                  <select
                    value={selections.prepaidDiscount}
                    onChange={(e) => setSelections(prev => ({ ...prev, prepaidDiscount: Number(e.target.value) }))}
                    className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value={0}>할인 없음</option>
                    {prepaidOptions.map(val => (
                      <option key={val} value={val}>-{val.toLocaleString()}원 할인</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] z-50 animate-slide-up">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            
            <div className="flex flex-col gap-1 w-full md:w-auto">
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded">{INTERNET_PLANS.find(p => p.id === selections.internetId)?.name}</span>
                {currentAddOns.map(name => (
                  <span key={name} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{name}</span>
                ))}
                {isTvSelected && (
                  <>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{TV_PLANS.find(p => p.id === selections.tvId)?.name}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{STB_OPTIONS.find(p => p.id === selections.stbId)?.name}</span>
                  </>
                )}
                {!isTvSelected && <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-400">TV 미선택</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {discountBreakdown.bundle > 0 && (
                  <div className="text-[10px] md:text-xs text-green-600 font-bold flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    결합 -{discountBreakdown.bundle.toLocaleString()}
                  </div>
                )}
                {discountBreakdown.mobile > 0 && (
                  <div className="text-[10px] md:text-xs text-red-600 font-bold flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    휴대폰 -{discountBreakdown.mobile.toLocaleString()}
                  </div>
                )}
                {discountBreakdown.stb > 0 && (
                  <div className="text-[10px] md:text-xs text-orange-600 font-bold flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    STB할인 -{discountBreakdown.stb.toLocaleString()}
                  </div>
                )}
                {discountBreakdown.prepaid > 0 && (
                  <div className="text-[10px] md:text-xs text-indigo-600 font-bold flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    선납권 -{discountBreakdown.prepaid.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 md:gap-10 w-full md:w-auto justify-between md:justify-end">
              {customerQuotedFee > 0 && (
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-indigo-500 font-black uppercase tracking-tight mb-0.5">선납권 추천 금액</div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-indigo-600">{recommendedPrepaid.toLocaleString()}</span>
                      <span className="text-sm font-bold text-indigo-600">원</span>
                    </div>
                    {recommendedPrepaid > 14100 && (
                      <div className="text-[10px] text-red-600 font-bold mt-0.5 animate-pulse whitespace-nowrap">
                        14000초과는 16000원까지 대구,서울만 가능합니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col items-end border-l border-gray-100 pl-6 md:pl-10">
                <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-0.5">월 예상 납부액</div>
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
