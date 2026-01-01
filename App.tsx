
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
  'tv_all_plus': 14850
};

const B_TV_2_POP_PRICES: Record<string, number> = {
  'pop_100': 3850,
  'pop_180': 5500,
  'pop_230': 6600
};

const SectionHeader: React.FC<{ title: string; step: string | number; badge?: string; children?: React.ReactNode }> = ({ title, step, badge, children }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white font-bold text-sm shadow-sm shrink-0">
        {step}
      </span>
      <div className="flex flex-col md:flex-row md:items-center gap-2 min-w-0">
        <h2 className="text-xl font-bold text-slate-800 truncate">{title}</h2>
        {badge && (
          <span className="inline-block px-2 py-0.5 bg-violet-100 text-violet-600 text-[10px] font-bold rounded-md uppercase tracking-wider w-fit shrink-0">
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
    className={`relative flex flex-col p-5 rounded-2xl border-2 transition-all text-left w-full h-full shadow-sm group ${
      selected 
        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' 
        : 'border-slate-100 bg-white hover:border-violet-200 hover:shadow-md'
    } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
  >
    <div className="flex flex-col flex-grow w-full min-w-0">
      <h3 className={`text-lg font-bold mb-1 truncate ${selected ? 'text-violet-900' : 'text-slate-800'}`}>{title}</h3>
      <p className="text-xs text-slate-500 mb-4 flex-grow leading-snug line-clamp-2">{description}</p>
      {price !== undefined && (
        <div className="mt-auto">
          <span className={`text-xl font-bold ${selected ? 'text-violet-600' : 'text-slate-900'}`}>{price.toLocaleString()}</span>
          <span className="text-sm text-slate-500 ml-1 font-medium">원/월</span>
        </div>
      )}
    </div>
    {selected && (
      <div className="absolute top-3 right-3 text-violet-600">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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

  const { totalPrice, discountBreakdown, isTvSelected, currentAddOns } = useMemo(() => {
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
        else familyDiscount = 11000;
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
        else currentEffectiveStbPrice = 3300;
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

    let addOnPrice = 0;
    const isWings = selections.addOnIds.includes('addon_wings');
    const isRelief = selections.addOnIds.includes('addon_relief');
    if (isWings && isRelief) addOnPrice = 3300;
    else {
      if (isWings) addOnPrice += 1650;
      if (isRelief) addOnPrice += 2200;
    }
    base += addOnPrice;

    const totalPrepaid = (selections.prepaidInternet || 0) + (selections.prepaidTv1 || 0) + (selections.prepaidTv2 || 0);
    const breakdown = { bundle: 0, mobile: 0, prepaid: totalPrepaid, stb: 0, family: familyDiscount };

    if (tvType === 'IPTV' && hasTv && stb) {
      if (stb.id === 'stb_ai2' && (tv!.id === 'tv_all' || tv!.id === 'tv_all_plus')) breakdown.stb = 2200;
      else if (stb.id === 'stb_ai4v') {
        if (tv!.id === 'tv_all') breakdown.stb = 2200;
        else if (tv!.id === 'tv_all_plus') breakdown.stb = 4400;
      }
    }

    if (internet && (hasTv || hasTv2) && selections.mobileLineCount === 0 && !selections.isFamilyPlan) {
      breakdown.bundle = (internet.id === 'int_100m' ? 1100 : 5500);
    }

    if (selections.mobileLineCount > 0 && !selections.isFamilyPlan) {
      if (hasTv && tvType !== 'CATV') breakdown.mobile += 1100;
      if (internet) breakdown.mobile += (MOBILE_COMBINATION_DISCOUNTS.INTERNET as any)[internet.id] || 0;
    }

    return { 
      totalPrice: Math.max(0, base - breakdown.bundle - breakdown.mobile - breakdown.prepaid - breakdown.stb - breakdown.family), 
      discountBreakdown: breakdown,
      isTvSelected: hasTv,
      currentAddOns: selections.addOnIds.map(id => INTERNET_ADD_ONS.find(a => a.id === id)?.name).filter(Boolean) as string[]
    };
  }, [selections, tvType]);

  const quotedPriceAnalysis = useMemo(() => {
    if (customerQuotedFee <= 0) return null;
    const diff = totalPrice - customerQuotedFee;
    let statusText = `안내요금 차액 ${Math.abs(diff).toLocaleString()}원 ${diff > 0 ? '' : '낮음'}`;
    const hasTv1 = selections.tvId !== 'tv_none';
    const hasTv2 = selections.tv2Id !== 'tv_none';
    let totalLimit = 7700;
    if (hasTv1) totalLimit += 7700;
    if (hasTv2) totalLimit += 7700;
    if (diff > totalLimit) return { text: statusText, status: 'impossible', recs: null };
    let remaining = Math.ceil(diff / 1100) * 1100;
    const internetRec = Math.min(remaining, 7700);
    remaining -= internetRec;
    const tv1Rec = hasTv1 ? Math.min(remaining, 7700) : 0;
    remaining -= tv1Rec;
    const tv2Rec = hasTv2 ? Math.min(remaining, 7700) : 0;
    return { 
      text: statusText, 
      status: diff > 0 ? 'possible' : 'ok',
      recs: { internet: internetRec, tv1: tv1Rec, tv2: tv2Rec }
    };
  }, [totalPrice, customerQuotedFee, selections.tvId, selections.tv2Id]);

  const selectedPlanSummary = useMemo(() => {
    const internet = INTERNET_PLANS.find(p => p.id === selections.internetId);
    const tv1 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tvId);
    const tv2 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tv2Id);
    return {
      internet: internet?.speed || "",
      tv1: tv1?.name || "",
      tv2: tv2?.name || ""
    };
  }, [selections, tvType]);

  const shareSummaryText = useMemo(() => {
    const internet = INTERNET_PLANS.find(p => p.id === selections.internetId);
    const tv1 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tvId);
    const tv2 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tv2Id);
    let recsText = '';
    if (quotedPriceAnalysis?.recs) {
      const { internet: i, tv1: t1, tv2: t2 } = quotedPriceAnalysis.recs;
      const parts = [];
      if (i > 0) parts.push(`인 :${i.toLocaleString()}원`);
      if (t1 > 0) parts.push(`T1 :${t1.toLocaleString()}원`);
      if (t2 > 0) parts.push(`T2 :${t2.toLocaleString()}원`);
      recsText = parts.length > 0 ? `[선납추천] ${parts.join(' / ')}` : '';
    }
    return `[SKB 설계내역]
- 타입: ${tvType}
- 인터넷: ${internet?.name} (${internet?.speed})
- TV 1: ${tv1?.name || '없음'}
- TV 2: ${tv2?.name || '없음'}
- 부가서비스: ${currentAddOns.join(', ') || '없음'}
- 결합: ${selections.isFamilyPlan ? '패밀리' : selections.mobileLineCount > 0 ? '휴대폰결합' : '기본'}
- ${quotedPriceAnalysis?.text || '안내요금 정보없음'}
${recsText ? `- ${recsText}` : ''}
- 최종 월 요금: ${totalPrice.toLocaleString()}원`;
  }, [selections, tvType, currentAddOns, totalPrice, quotedPriceAnalysis]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full animate-slide-up">
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-violet-600 p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-violet-600 font-black text-2xl">SK</span>
              </div>
              <h1 className="text-white text-2xl font-black tracking-tight">SKB 업셀 계산기</h1>
            </div>
            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••"
                className="w-full bg-slate-50 border-4 border-slate-50 rounded-2xl px-5 py-4 font-black text-slate-800 text-center text-2xl tracking-[0.8em] focus:bg-white focus:border-violet-100 outline-none"/>
              <button type="submit" className="w-full bg-violet-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg hover:bg-violet-700 transition-all">접속하기</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-64 bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded flex items-center justify-center shadow-sm"><span className="text-white font-black text-xs">SK</span></div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">SKB 업셀 계산기</h1>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-[10px] font-bold text-slate-400">Logout</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8 space-y-12">
        {/* 업셀링 빠른선택 */}
        <section className="bg-white p-6 rounded-3xl border shadow-sm">
          <SectionHeader title="업셀링 & 안내요금" step="0">
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-2xl border w-full md:w-auto">
              <div className="flex bg-white p-1 rounded-xl shadow-sm border">
                <button onClick={() => setTvType('IPTV')} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${tvType === 'IPTV' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>IPTV</button>
                <button onClick={() => setTvType('CATV')} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${tvType === 'CATV' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>CATV</button>
              </div>
              <input type="number" placeholder="안내 요금 입력" value={customerQuotedFee || ''} onChange={(e) => setCustomerQuotedFee(Number(e.target.value))} className="w-full md:w-40 bg-white border-2 border-slate-100 rounded-xl px-4 py-2 font-black text-violet-600 outline-none focus:border-violet-300"/>
            </div>
          </SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <PlanCard selected={selections.internetId === 'int_500m' && selections.tvId === 'tv_all_plus' && tvType === 'IPTV'} onClick={() => setSelections(prev => ({ ...prev, internetId: 'int_500m', tvId: 'tv_all_plus', tv2Id: 'tv_none', stbId: 'stb_smart3', addOnIds: ['addon_relief'], isFamilyPlan: false, mobileLineCount: 0 }))} title="기라_1 세트" description="500M + 안심 + B tv All+"/>
            <PlanCard selected={selections.internetId === 'int_500m' && selections.tvId === 'tv_all' && tvType === 'IPTV'} onClick={() => setSelections(prev => ({ ...prev, internetId: 'int_500m', tvId: 'tv_all', tv2Id: 'tv_none', stbId: 'stb_smart3', addOnIds: ['addon_relief'], isFamilyPlan: false, mobileLineCount: 0 }))} title="기라_2 세트" description="500M + 안심 + B tv All"/>
            <PlanCard selected={selections.internetId === 'int_1g' && selections.tvId === 'tv_all_plus' && tvType === 'IPTV'} onClick={() => setSelections(prev => ({ ...prev, internetId: 'int_1g', tvId: 'tv_all_plus', tv2Id: 'tv_none', stbId: 'stb_smart3', addOnIds: ['addon_relief'], isFamilyPlan: false, mobileLineCount: 0 }))} title="기가_1 세트" description="1G + 안심 + B tv All+"/>
          </div>
        </section>

        <section>
          <SectionHeader title="인터넷 속도" step={1}>
            <button onClick={() => setSelections(prev => ({ ...prev, isFamilyPlan: !prev.isFamilyPlan, mobileLineCount: 0 }))} className={`px-4 py-2 rounded-xl border-2 font-black text-xs transition-all ${selections.isFamilyPlan ? 'bg-violet-600 text-white' : 'bg-white text-slate-500'}`}>패밀리 결합</button>
          </SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INTERNET_PLANS.map(p => <PlanCard key={p.id} selected={selections.internetId === p.id} onClick={() => setSelections(prev => ({ ...prev, internetId: p.id }))} title={p.name} price={p.price} description={p.speed}/>)}
          </div>
        </section>

        <section>
          <SectionHeader title="부가서비스" step="1-1" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTERNET_ADD_ONS.map(addon => (
              <PlanCard key={addon.id} selected={selections.addOnIds.includes(addon.id)} onClick={() => {
                const isSelected = selections.addOnIds.includes(addon.id);
                setSelections(prev => ({ ...prev, addOnIds: isSelected ? prev.addOnIds.filter(id => id !== addon.id) : [...prev.addOnIds, addon.id] }));
              }} title={addon.name} price={addon.price} description={addon.description}/>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title={`${tvType} 요금제`} step={2} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <PlanCard selected={selections.tvId === 'tv_none'} onClick={() => setSelections(prev => ({ ...prev, tvId: 'tv_none', tv2Id: 'tv_none' }))} title="가입 안함" price={0} description="단독 요금"/>
            {(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).map(p => <PlanCard key={p.id} selected={selections.tvId === p.id} onClick={() => setSelections(prev => ({ ...prev, tvId: p.id }))} title={p.name} price={p.price} description={`${p.channels}ch`}/>)}
          </div>
        </section>

        {isTvSelected && (
          <>
            <section className="animate-fade-in"><SectionHeader title="셋톱박스" step="2-1" /><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{(tvType === 'IPTV' ? STB_OPTIONS : CATV_STB_OPTIONS).map(stb => <PlanCard key={stb.id} selected={selections.stbId === stb.id} onClick={() => setSelections(prev => ({ ...prev, stbId: stb.id }))} title={stb.name} price={stb.price} description={stb.description}/>)}</div></section>
            
            <section className="animate-fade-in">
              <SectionHeader title="추가 TV (TV 2)" step="2-2" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <PlanCard selected={selections.tv2Id === 'tv_none'} onClick={() => setSelections(prev => ({ ...prev, tv2Id: 'tv_none' }))} title="안함" price={0} description="단일 회선"/>
                {Object.entries(tvType === 'IPTV' ? B_TV_2_PRICES : B_TV_2_POP_PRICES).map(([id, price]) => {
                  const info = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === id);
                  return <PlanCard key={id} selected={selections.tv2Id === id} onClick={() => setSelections(prev => ({ ...prev, tv2Id: id }))} title={info?.name || id} price={price} description="추가 할인"/>;
                })}
              </div>
            </section>
          </>
        )}

        <section>
          <SectionHeader title="결합 및 할인" step={3} />
          <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <h3 className="text-lg font-black text-slate-800">SKT 휴대폰 결합</h3>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl border">
              <button onClick={() => setSelections(prev => ({ ...prev, mobileLineCount: 0 }))} className={`px-8 py-3 rounded-xl font-black text-xs ${selections.mobileLineCount === 0 ? 'bg-white shadow-sm border' : 'text-slate-400'}`}>미결합</button>
              <button onClick={() => { if (!selections.isFamilyPlan) setSelections(prev => ({ ...prev, mobileLineCount: 1 })); }} className={`px-8 py-3 rounded-xl font-black text-xs ${selections.mobileLineCount >= 1 ? 'bg-violet-600 text-white' : 'text-slate-400'}`}>결합</button>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <SectionHeader title="선납권 수동 할인" step={4} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['prepaidInternet', 'prepaidTv1', 'prepaidTv2'].map((key, i) => (
              <select key={key} value={(selections as any)[key]} onChange={(e) => setSelections(prev => ({ ...prev, [key]: Number(e.target.value) }))} className="w-full bg-white border-2 border-slate-100 rounded-xl p-4 font-black text-slate-800 outline-none">
                <option value={0}>{i === 0 ? '인터넷' : `TV${i}`} 할인 없음</option>
                {[1100, 2200, 3300, 4400, 5500, 6600, 7700, 8800].map(v => <option key={v} value={v}>-{v.toLocaleString()}원 할인</option>)}
              </select>
            ))}
          </div>
        </section>
      </main>

      {/* 하단 고정 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200 p-4 md:p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-6">
          {/* 설계 복사 아이콘 버튼 */}
          <button 
            onClick={() => setIsShareModalOpen(true)} 
            className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg shrink-0"
            aria-label="설계 복사"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 11l3 3m0 0l-3 3m3-3H9" />
            </svg>
          </button>
          
          <div className="flex flex-col items-end w-full min-w-0">
            {/* 선택 요약 */}
            <div className="flex gap-1.5 mb-1.5 opacity-60 text-[10px] font-black text-slate-600 uppercase truncate max-w-full">
              {selectedPlanSummary.internet}
              {selectedPlanSummary.tv1 && ` / ${selectedPlanSummary.tv1}`}
              {selectedPlanSummary.tv2 && ` / ${selectedPlanSummary.tv2}`}
            </div>

            {/* 차액 및 추천 */}
            <div className="flex flex-wrap justify-end gap-1.5 mb-2 w-full">
              {quotedPriceAnalysis && (
                <div className="flex flex-wrap gap-1.5 items-center justify-end">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border ${quotedPriceAnalysis.status === 'impossible' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {quotedPriceAnalysis.text}
                  </span>
                  {quotedPriceAnalysis.recs && (
                    <div className="flex gap-1">
                      {quotedPriceAnalysis.recs.internet > 0 && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-md font-black border border-amber-100 animate-pulse">인 :{quotedPriceAnalysis.recs.internet.toLocaleString()}원</span>}
                      {quotedPriceAnalysis.recs.tv1 > 0 && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-black border border-orange-100">T1 :{quotedPriceAnalysis.recs.tv1.toLocaleString()}원</span>}
                      {quotedPriceAnalysis.recs.tv2 > 0 && <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded-md font-black border border-rose-100">T2 :{quotedPriceAnalysis.recs.tv2.toLocaleString()}원</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 최종 요금 */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl md:text-6xl font-black text-violet-600 tracking-tighter leading-none">{totalPrice.toLocaleString()}</span>
              <span className="text-xl font-black text-slate-800">원</span>
            </div>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl animate-slide-up">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white"><h2 className="font-black">설계 내역</h2><button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="p-6">
              <pre className="bg-slate-50 p-5 rounded-xl text-sm font-bold whitespace-pre-wrap mb-8 max-h-[40vh] overflow-y-auto border border-slate-100">{shareSummaryText}</pre>
              <button onClick={() => { navigator.clipboard.writeText(shareSummaryText); alert("복사되었습니다."); setIsShareModalOpen(false); }} className="w-full bg-violet-600 text-white py-5 rounded-xl font-black shadow-lg hover:bg-violet-700 transition-all flex items-center justify-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" /></svg>
                클립보드 복사
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
