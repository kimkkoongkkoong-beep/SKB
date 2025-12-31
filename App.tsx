
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

const CATV_STB_OPTIONS = [
  { id: 'stb_smart3_pop', name: 'Smart 3_POP', price: 2200, description: 'pop 전용 스마트 셋톱박스' },
  { id: 'stb_ai2_pop', name: 'AI2_POP', price: 4400, description: '누구(NUGU) 탑재 pop 전용 AI 셋톱박스' },
];

const B_TV_2_PRICES: Record<string, number> = {
  'tv_lite': 6050,
  'tv_standard': 7700,
  'tv_all': 9350,
  'tv_all_plus': 14850,
  'tv_none': 0
};

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '0405') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('비밀번호가 올바르지 않습니다.');
      setPassword('');
    }
  };

  useEffect(() => {
    if (tvType === 'CATV') {
      setSelections(prev => ({ ...prev, tvId: 'pop_100', tv2Id: 'tv_none', stbId: 'stb_smart3_pop' }));
    } else {
      setSelections(prev => ({ ...prev, tvId: 'tv_lite', tv2Id: 'tv_none', stbId: 'stb_smart3' }));
    }
  }, [tvType]);

  const { totalPrice, discountBreakdown, isTvSelected, isTv2Selected, currentAddOns } = useMemo(() => {
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
      base += 2200; 
    }

    const isWingsSelected = selections.addOnIds.includes('addon_wings');
    const isReliefSelected = selections.addOnIds.includes('addon_relief');
    let addOnPrice = 0;
    if (isWingsSelected && isReliefSelected) addOnPrice = 1100 + 2200;
    else {
      if (isWingsSelected) addOnPrice += 1650;
      if (isReliefSelected) addOnPrice += 2200;
    }
    base += addOnPrice;

    const totalPrepaid = selections.prepaidInternet + selections.prepaidTv1 + selections.prepaidTv2;
    const breakdown = { bundle: 0, mobile: 0, prepaid: totalPrepaid, stb: 0, stbName: '', family: familyDiscount };

    if (tvType === 'IPTV' && hasTv && stb) {
      if (stb.id === 'stb_ai2' && (tv!.id === 'tv_all' || tv!.id === 'tv_all_plus')) breakdown.stb = 2200;
      else if (stb.id === 'stb_ai4v') {
        if (tv!.id === 'tv_all') breakdown.stb = 2200;
        else if (tv!.id === 'tv_all_plus') breakdown.stb = 4400;
      }
    }

    if (internet && (hasTv || hasTv2) && selections.mobileLineCount === 0 && !selections.isFamilyPlan) {
      if (internet.id === 'int_100m') breakdown.bundle = 1100;
      else breakdown.bundle = 5500;
    }

    if (selections.mobileLineCount > 0 && !selections.isFamilyPlan) {
      if ((hasTv || hasTv2) && tvType !== 'CATV') breakdown.mobile += MOBILE_COMBINATION_DISCOUNTS.TV;
      if (internet) breakdown.mobile += (MOBILE_COMBINATION_DISCOUNTS.INTERNET as any)[internet.id] || 0;
    }

    return { 
      totalPrice: Math.max(0, base - breakdown.bundle - breakdown.mobile - breakdown.prepaid - breakdown.stb - breakdown.family), 
      discountBreakdown: breakdown,
      isTvSelected: hasTv,
      isTv2Selected: hasTv2,
      currentAddOns: selections.addOnIds.map(id => INTERNET_ADD_ONS.find(a => a.id === id)?.name).filter(Boolean) as string[]
    };
  }, [selections, tvType]);

  const recommendedPrepaid = useMemo(() => customerQuotedFee <= 0 ? 0 : Math.max(0, totalPrice - customerQuotedFee), [totalPrice, customerQuotedFee]);

  const toggleAddOn = (id: string) => {
    setSelections(prev => {
      const isSelected = prev.addOnIds.includes(id);
      return { ...prev, addOnIds: isSelected ? prev.addOnIds.filter(item => item !== id) : [...prev.addOnIds, id] };
    });
  };

  const shareSummaryText = useMemo(() => {
    const internet = INTERNET_PLANS.find(p => p.id === selections.internetId);
    const tv1 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tvId);
    const stb = (tvType === 'IPTV' ? STB_OPTIONS : CATV_STB_OPTIONS).find(s => s.id === selections.stbId);
    const tv2 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tv2Id);

    return `[SKB 업셀 내역서]
타입: ${tvType}
인터넷: ${internet?.name} (${internet?.speed})
TV 1: ${tv1 ? `${tv1.name} (${stb?.name})` : '없음'}
TV 2: ${tv2 ? `${tv2.name} (Smart 3)` : '없음'}
부가서비스: ${currentAddOns.length > 0 ? currentAddOns.join(', ') : '없음'}
결합상태: ${selections.isFamilyPlan ? '패밀리결합' : selections.mobileLineCount > 0 ? '휴대폰결합' : '없음'}
선납권 적용: ${discountBreakdown.prepaid.toLocaleString()}원

▶ 월 예상 납부액: ${totalPrice.toLocaleString()}원
▶ 선납권 추천: ${recommendedPrepaid.toLocaleString()}원`;
  }, [selections, tvType, currentAddOns, totalPrice, recommendedPrepaid, discountBreakdown]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareSummaryText);
    alert('설계 내역이 복사되었습니다.');
    setIsShareModalOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full animate-slide-up">
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-violet-600 p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-violet-600 font-black text-2xl">SK</span>
              </div>
              <h1 className="text-white text-2xl font-black tracking-tight">SKB 업셀 계산기</h1>
              <p className="text-violet-100 mt-2 text-sm font-medium">지정된 사용자만 사용 가능합니다.</p>
            </div>
            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">비밀번호 입력</label>
                <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                  className={`w-full bg-slate-50 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 transition-all outline-none text-center tracking-[0.5em] focus:bg-white ${loginError ? 'border-red-200 bg-red-50' : 'border-slate-100 focus:border-violet-500'}`}/>
                {loginError && <p className="text-red-500 text-xs font-bold text-center mt-2 animate-bounce">{loginError}</p>}
              </div>
              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-violet-200 transition-all active:scale-95 text-lg">접속하기</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-48 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded flex items-center justify-center shadow-sm"><span className="text-white font-black text-xs">SK</span></div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 flex flex-wrap items-center">SKB업셀 계산기<span className="ml-2 text-xs md:text-sm font-medium text-violet-500">(지정 사용자 전용)</span></h1>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">Logout</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8">
        <div className="space-y-12">
          {/* 업셀링 빠른선택 */}
          <section className="bg-gradient-to-br from-violet-50 to-white p-6 rounded-3xl border border-violet-100 shadow-sm">
            <SectionHeader title="업셀링 빠른선택" step="0" badge="Recommended">
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-violet-200 shadow-sm w-full md:w-auto">
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setTvType('IPTV')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${tvType === 'IPTV' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500'}`}>IPTV</button>
                  <button onClick={() => setTvType('CATV')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${tvType === 'CATV' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500'}`}>CATV</button>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto border-l sm:border-l border-slate-200 sm:pl-4">
                  <label htmlFor="quote" className="text-sm font-bold text-slate-700 whitespace-nowrap">고객안내요금</label>
                  <div className="relative flex-grow sm:flex-grow-0">
                    <input type="number" id="quote" placeholder="0" value={customerQuotedFee || ''} onChange={(e) => setCustomerQuotedFee(Number(e.target.value))} className="w-full md:w-40 bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-1.5 text-right font-bold text-violet-600 focus:outline-none focus:border-violet-500 transition-all"/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">원</span>
                  </div>
                </div>
              </div>
            </SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PlanCard selected={selections.internetId === 'int_500m' && selections.tvId === 'tv_all_plus' && tvType === 'IPTV'} onClick={() => { setTvType('IPTV'); setSelections(prev => ({ ...prev, internetId: 'int_500m', tvId: 'tv_all_plus', tv2Id: 'tv_none', stbId: 'stb_smart3', addOnIds: ['addon_relief'], isFamilyPlan: false, mobileLineCount: 0 })); }} title="기라_1" description="500M + 안심 + 올플 (IPTV)" className="bg-white/80"/>
              <PlanCard selected={selections.internetId === 'int_500m' && selections.tvId === 'tv_all' && tvType === 'IPTV'} onClick={() => { setTvType('IPTV'); setSelections(prev => ({ ...prev, internetId: 'int_500m', tvId: 'tv_all', tv2Id: 'tv_none', stbId: 'stb_smart3', addOnIds: ['addon_relief'], isFamilyPlan: false, mobileLineCount: 0 })); }} title="기라_2" description="500M + 안심 + 올 (IPTV)" className="bg-white/80"/>
              <PlanCard selected={selections.internetId === 'int_1g' && selections.tvId === 'tv_all_plus' && tvType === 'IPTV'} onClick={() => { setTvType('IPTV'); setSelections(prev => ({ ...prev, internetId: 'int_1g', tvId: 'tv_all_plus', tv2Id: 'tv_none', stbId: 'stb_smart3', addOnIds: ['addon_relief'], isFamilyPlan: false, mobileLineCount: 0 })); }} title="기가_1" description="1G + 안심 + 올플 (IPTV)" className="bg-white/80"/>
            </div>
          </section>

          {/* 인터넷 속도 */}
          <section>
            <SectionHeader title="인터넷 속도" step={1}>
              <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl hover:border-violet-300 transition-colors shadow-sm">
                <span className="text-sm font-bold text-slate-700">패밀리 요금제</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={selections.isFamilyPlan} onChange={(e) => setSelections(prev => ({ ...prev, isFamilyPlan: e.target.checked, mobileLineCount: e.target.checked ? 0 : prev.mobileLineCount }))}/>
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>
            </SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {INTERNET_PLANS.map((plan) => (
                <PlanCard key={plan.id} selected={selections.internetId === plan.id} onClick={() => setSelections(prev => ({ ...prev, internetId: plan.id }))} title={`${plan.name} (${plan.speed})`} price={plan.price} description={plan.description}/>
              ))}
            </div>
          </section>

          {/* 부가서비스 */}
          <section>
            <SectionHeader title="인터넷 부가서비스" step="1-1" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INTERNET_ADD_ONS.map((addon) => (
                <PlanCard key={addon.id} selected={selections.addOnIds.includes(addon.id)} onClick={() => toggleAddOn(addon.id)} title={addon.name} price={addon.price} description={addon.description}/>
              ))}
            </div>
          </section>

          {/* TV 요금제 */}
          <section>
            <SectionHeader title={`${tvType} 요금제`} step={2} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <PlanCard selected={selections.tvId === 'tv_none'} onClick={() => setSelections(prev => ({ ...prev, tvId: 'tv_none' }))} title="선택 안함" price={0} description="메인 TV를 신청하지 않습니다."/>
              {(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).map((plan) => (
                <PlanCard key={plan.id} selected={selections.tvId === plan.id} onClick={() => setSelections(prev => ({ ...prev, tvId: plan.id }))} title={`${plan.name} (${plan.channels}채널)`} price={plan.price} description={plan.description}/>
              ))}
            </div>
          </section>

          {isTvSelected && (
            <section className="animate-slide-up">
              <SectionHeader title="셋톱박스" step="2-1" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(tvType === 'IPTV' ? STB_OPTIONS : CATV_STB_OPTIONS).map((stb) => {
                  let dPrice = stb.price;
                  if (tvType === 'CATV') {
                    if (stb.id === 'stb_ai2_pop') dPrice = selections.tvId === 'pop_230' ? 0 : selections.tvId === 'pop_180' ? 1100 : 2200;
                    else if (stb.id === 'stb_smart3_pop') dPrice = selections.tvId === 'pop_230' ? 2200 : 3300;
                  }
                  return <PlanCard key={stb.id} selected={selections.stbId === stb.id} onClick={() => setSelections(prev => ({ ...prev, stbId: stb.id }))} title={stb.name} price={dPrice} description={stb.description}/>;
                })}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title="휴대폰 결합" step={3} />
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div><h3 className="text-lg font-bold mb-2 text-slate-800">SKT 휴대폰 결합</h3><p className="text-sm text-slate-500">가족 휴대폰 회선 결합 유무 (요즘가족결합 기준)</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelections(prev => ({ ...prev, mobileLineCount: 0 }))} className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${selections.mobileLineCount === 0 ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:border-violet-200'}`}>결합 안함</button>
                <button onClick={() => { if (selections.isFamilyPlan) { alert("패밀리요금제는 휴대폰 결합이 불가능합니다."); return; } setSelections(prev => ({ ...prev, mobileLineCount: 1 })); }} className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${selections.mobileLineCount >= 1 ? 'bg-violet-600 border-violet-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-violet-400'}`}>휴대폰 결합</button>
              </div>
            </div>
          </section>

          {/* 선납권 할인 */}
          <section className="pb-10">
            <SectionHeader title="선납권 할인" step={4} />
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
              {['prepaidInternet', 'prepaidTv1', 'prepaidTv2'].map((key, idx) => (
                <div key={key} className="space-y-4">
                  <label className="block font-bold text-slate-700 text-sm">{idx === 0 ? '인터넷' : `B tv ${idx}`} 선납권</label>
                  <select value={(selections as any)[key]} onChange={(e) => setSelections(prev => ({ ...prev, [key]: Number(e.target.value) }))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-violet-500 cursor-pointer">
                    <option value={0}>할인 없음</option>
                    {Array.from({ length: 12 }, (_, i) => (i + 1) * 1100).map(val => <option key={val} value={val}>-{val.toLocaleString()}원 할인</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* 하단 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-12px_40px_rgba(0,0,0,0.08)] z-40 backdrop-blur-md bg-white/95">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">{INTERNET_PLANS.find(p => p.id === selections.internetId)?.name}</span>
                {selections.isFamilyPlan && <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-100 font-bold">패밀리</span>}
                {isTvSelected && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">{(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tvId)?.name}</span>}
                <span className="bg-violet-600 text-white px-2 py-0.5 rounded font-black text-[10px] uppercase">{tvType}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {discountBreakdown.bundle > 0 && <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">결합할인 -{discountBreakdown.bundle.toLocaleString()}</div>}
                {discountBreakdown.mobile > 0 && <div className="text-[10px] text-violet-600 font-bold bg-violet-100 px-2 py-0.5 rounded">휴대폰 -{discountBreakdown.mobile.toLocaleString()}</div>}
                {discountBreakdown.prepaid > 0 && <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">선납권 -{discountBreakdown.prepaid.toLocaleString()}</div>}
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-6">
                {customerQuotedFee > 0 && (
                  <div className="flex flex-col items-end">
                    <div className="text-[10px] text-fuchsia-500 font-black mb-0.5 uppercase tracking-wider">선납권 추천</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-fuchsia-600 tracking-tighter">{recommendedPrepaid.toLocaleString()}</span>
                      <span className="text-sm font-bold text-fuchsia-600">원</span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col items-end border-l border-slate-100 pl-6">
                  <div className="text-[10px] text-slate-400 font-black mb-0.5 uppercase tracking-wider">월 예상 납부액</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-violet-600 tracking-tighter">{totalPrice.toLocaleString()}</span>
                    <span className="text-xl font-bold text-slate-900">원</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0"
                title="상담 내역 복사"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 복사 미리보기 모달 */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative overflow-hidden animate-slide-up">
            <div className="bg-violet-600 p-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              </div>
              <h3 className="text-white font-black text-xl">상담 내역 확인</h3>
              <p className="text-violet-100 text-xs font-bold mt-1">설계 내용을 복사하여 전송하세요.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{shareSummaryText}</pre>
              </div>
              <button onClick={handleCopyText} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-violet-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                텍스트 복사하기
              </button>
              <button onClick={() => setIsShareModalOpen(false)} className="w-full py-3 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
