import React, { useState, useMemo, useEffect } from 'react';
import { 
  INTERNET_PLANS, 
  INTERNET_ADD_ONS,
  TV_PLANS, 
  STB_OPTIONS, 
  MOBILE_COMBINATION_DISCOUNTS 
} from './constants';
import { SelectionState } from './types';
import { db, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from './firebase';
import { QuerySnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

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

interface Promotion {
  id: string;
  title: string;
  category: string;
  description: string;
  startDate: string;
  endDate: string;
  createdAt: any;
}

const SectionHeader: React.FC<{ title: string; step: string | number; badge?: string; children?: React.ReactNode }> = ({ title, step, badge, children }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-pastel-300 to-pastel-500 text-white font-extrabold text-sm shadow-md shadow-pastel-200 shrink-0">
        {step}
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{title}</h2>
          {badge && (
            <span className="px-2 py-0.5 bg-pastel-50 text-pastel-500 text-[10px] font-bold rounded-full border border-pastel-100 uppercase tracking-widest shrink-0">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
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
    className={`group relative flex flex-col p-6 rounded-3xl border-2 transition-all duration-300 text-left w-full h-full ${
      selected 
        ? 'border-pastel-400 bg-white shadow-xl shadow-pastel-100/50 scale-[1.02] z-10' 
        : 'border-white bg-white hover:border-pastel-100 hover:shadow-lg shadow-sm'
    } ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${className}`}
  >
    <div className="flex flex-col flex-grow w-full min-w-0">
      <div className="flex justify-between items-start mb-2">
        <h3 className={`text-lg font-extrabold tracking-tight transition-colors ${selected ? 'text-pastel-900' : 'text-slate-800 group-hover:text-pastel-600'}`}>
          {title}
        </h3>
        {selected && (
          <div className="w-6 h-6 bg-pastel-500 rounded-full flex items-center justify-center text-white shadow-sm animate-fade-in-up">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed line-clamp-2">{description}</p>
      
      {price !== undefined && (
        <div className="mt-auto flex items-baseline gap-1">
          <span className={`text-2xl font-black ${selected ? 'text-pastel-600' : 'text-slate-900'}`}>
            {price.toLocaleString()}
          </span>
          <span className="text-sm text-slate-400 font-bold">원</span>
        </div>
      )}
    </div>
  </button>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'calculator' | 'promotion'>('calculator');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState<boolean>(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  // Firebase Promotions State
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [newPromo, setNewPromo] = useState({
    title: '',
    category: '전체',
    description: '',
    startDate: '',
    endDate: ''
  });

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

  useEffect(() => {
    // Real-time listener for promotions
    const q = query(collection(db, "promotions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const promoList = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data()
      })) as Promotion[];
      setPromotions(promoList);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmitPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromoId) {
        // Update
        const promoRef = doc(db, "promotions", editingPromoId);
        await updateDoc(promoRef, {
          ...newPromo,
          updatedAt: new Date()
        });
      } else {
        // Add
        await addDoc(collection(db, "promotions"), {
          ...newPromo,
          createdAt: new Date()
        });
      }
      setIsPromoModalOpen(false);
      setEditingPromoId(null);
      setNewPromo({ title: '', category: '전체', description: '', startDate: '', endDate: '' });
    } catch (error) {
      console.error("Error submitting promotion: ", error);
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const handleDeletePromotion = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("정말로 이 프로모션을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "promotions", id));
      alert("삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting promotion: ", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleEditPromotionClick = (e: React.MouseEvent, promo: Promotion) => {
    e.stopPropagation();
    setEditingPromoId(promo.id);
    setNewPromo({
      title: promo.title,
      category: promo.category,
      description: promo.description,
      startDate: promo.startDate,
      endDate: promo.endDate
    });
    setIsPromoModalOpen(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '0405') {
      setIsAuthenticated(true);
    } else {
      setPassword('');
    }
  };

  useEffect(() => {
    if (tvType === 'CATV') {
      setSelections(prev => ({ ...prev, internetId: prev.internetId, tvId: 'pop_100', tv2Id: 'tv_none', stbId: 'stb_smart3_pop', addOnIds: prev.addOnIds, mobileLineCount: prev.mobileLineCount, prepaidInternet: prev.prepaidInternet, prepaidTv1: prev.prepaidTv1, prepaidTv2: prev.prepaidTv2, isFamilyPlan: prev.isFamilyPlan }));
    } else {
      setSelections(prev => ({ ...prev, internetId: prev.internetId, tvId: 'tv_lite', tv2Id: 'tv_none', stbId: 'stb_smart3', addOnIds: prev.addOnIds, mobileLineCount: prev.mobileLineCount, prepaidInternet: prev.prepaidInternet, prepaidTv1: prev.prepaidTv1, prepaidTv2: prev.prepaidTv2, isFamilyPlan: prev.isFamilyPlan }));
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
      currentAddOns: selections.addOnIds.map(id => INTERNET_ADD_ONS.find(a => id === a.id)?.name).filter(Boolean) as string[]
    };
  }, [selections, tvType]);

  const quotedPriceAnalysis = useMemo(() => {
    if (customerQuotedFee <= 0) return null;
    const diff = totalPrice - customerQuotedFee;
    
    const hasTv1 = selections.tvId !== 'tv_none' && selections.tvId !== null;
    const hasTv2 = selections.tv2Id !== 'tv_none' && selections.tv2Id !== null;

    let totalLimit = 0;
    if (!hasTv1) {
      totalLimit = 7700;
    } else if (!hasTv2) {
      totalLimit = 15400;
    } else {
      totalLimit = 23100;
    }

    const prefix = `상담가 : ${customerQuotedFee.toLocaleString()}원 / `;
    let statusText = `${prefix}차액 ${Math.abs(diff).toLocaleString()}원 ${diff > 0 ? '높음' : '낮음'}`;
    let statusColor = diff > 0 ? 'possible' : 'ok';
    let recs = null;

    if (diff > totalLimit) {
      statusColor = 'impossible';
      statusText = `${prefix}업셀 불가 (${Math.abs(diff).toLocaleString()}원 차이)`;
      recs = null;
    } else if (diff <= 0) {
      statusColor = 'ok';
      recs = null;
    } else {
      let remaining = Math.ceil(diff / 1100) * 1100;
      const internetRec = Math.min(remaining, 7700);
      remaining -= internetRec;
      const tv1Rec = hasTv1 ? Math.min(remaining, 7700) : 0;
      remaining -= tv1Rec;
      const tv2Rec = hasTv2 ? Math.min(remaining, 7700) : 0;
      recs = { internet: internetRec, tv1: tv1Rec, tv2: tv2Rec };
    }

    return { 
      text: statusText, 
      status: statusColor,
      recs: recs
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

  const activeDiscounts = useMemo(() => {
    const list = [];
    if (discountBreakdown.bundle > 0) list.push({ name: '요즘우리집결합', amount: discountBreakdown.bundle });
    if (discountBreakdown.mobile > 0) list.push({ name: '요즘가족결합', amount: discountBreakdown.mobile });
    if (discountBreakdown.prepaid > 0) list.push({ name: '선납권', amount: discountBreakdown.prepaid });
    if (discountBreakdown.stb > 0) list.push({ name: '프로모션', amount: discountBreakdown.stb });
    if (discountBreakdown.family > 0) list.push({ name: '패밀리', amount: discountBreakdown.family });
    return list;
  }, [discountBreakdown]);

  const shareSummaryText = useMemo(() => {
    const internet = INTERNET_PLANS.find(p => p.id === selections.internetId);
    const tv1 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tvId);
    const tv2 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tv2Id);
    let recsText = '';
    if (quotedPriceAnalysis?.recs) {
      const { internet: i, tv1: t1, tv2: t2 } = quotedPriceAnalysis.recs;
      const parts = [];
      if (i > 0) parts.push(`인터넷 :${i.toLocaleString()}원`);
      if (t1 > 0) parts.push(`B tv 1 :${t1.toLocaleString()}원`);
      if (t2 > 0) parts.push(`B tv 2 :${t2.toLocaleString()}원`);
      recsText = parts.length > 0 ? `[추천 선납권 구성]\n- ${parts.join('\n- ')}` : '';
    }
    return `[SKB 설계내역]
- 타입: ${tvType}
- 속도: ${internet?.name} (${internet?.speed})
- B tv 1: ${tv1?.name || '없음'}
- B tv 2: ${tv2?.name || '없음'}
- 부가서비스: ${currentAddOns.join(', ') || '없음'}
- 결합: ${selections.isFamilyPlan ? '패밀리' : selections.mobileLineCount > 0 ? '요즘가족결합' : '기본'}
- ${quotedPriceAnalysis?.text || '안내요금 정보없음'}

${recsText}

- 최종 월 요금: ${totalPrice.toLocaleString()}원`;
  }, [selections, tvType, currentAddOns, totalPrice, quotedPriceAnalysis]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-pastel-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pastel-200/40 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pastel-300/30 blur-[120px] rounded-full"></div>
        
        <div className="max-w-md w-full animate-fade-in-up relative z-10">
          <div className="bg-white/70 glass rounded-5xl shadow-2xl overflow-hidden border border-white">
            <div className="p-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pastel-400 to-pastel-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-pastel-200 animate-float">
                <span className="text-white font-black text-3xl italic tracking-tighter">SK</span>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">업셀 마스터</h1>
              <p className="text-slate-400 font-medium mb-10">스마트한 SKB 요금 설계를 시작하세요</p>
              
              <form onSubmit={handleLogin} className="w-full space-y-4">
                <div className="relative">
                  <input 
                    autoFocus 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="비밀번호 입력"
                    className="w-full bg-white border-2 border-slate-50 rounded-2xl px-6 py-5 font-black text-slate-800 text-center text-2xl tracking-[0.4em] focus:border-pastel-200 focus:ring-4 focus:ring-pastel-100/50 outline-none transition-all placeholder:tracking-normal placeholder:text-slate-200"
                  />
                </div>
                <button type="submit" className="w-full bg-pastel-500 hover:bg-pastel-600 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-pastel-100 transition-all active:scale-95">
                  입장하기
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-72 bg-pastel-50/30 selection:bg-pastel-100">
      <header className="glass border-b border-pastel-100/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between relative">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-pastel-400 to-pastel-600 rounded-xl flex items-center justify-center shadow-lg shadow-pastel-100">
              <span className="text-white font-black text-[10px] italic">SK</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 hidden sm:block">
              업셀 마스터 <span className="text-pastel-400 font-medium ml-1">Pro</span>
            </h1>
          </div>
          
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
            <button 
              onClick={() => setActiveTab('calculator')}
              className={`px-4 sm:px-8 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'calculator' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              요금계산기
            </button>
            <button 
              onClick={() => setActiveTab('promotion')}
              className={`px-4 sm:px-8 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'promotion' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              프로모션
            </button>
          </nav>

          <div className="shrink-0">
            <button 
              onClick={() => setIsAuthenticated(false)} 
              className="text-[10px] font-bold text-slate-400 hover:text-pastel-500 transition-colors uppercase tracking-widest px-2"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        {activeTab === 'calculator' ? (
          <div className="space-y-16">
            <section className="bg-white/80 glass p-8 rounded-4xl border border-white shadow-xl shadow-pastel-100/30">
              <SectionHeader title="퀵 업셀 설계" step="0">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                    <button onClick={() => setTvType('IPTV')} className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${tvType === 'IPTV' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>IPTV</button>
                    <button onClick={() => setTvType('CATV')} className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${tvType === 'CATV' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>CATV</button>
                  </div>
                  <div className="relative w-full md:w-48 group">
                    <input 
                      type="number" 
                      placeholder="안내요금 입력" 
                      value={customerQuotedFee || ''} 
                      onChange={(e) => setCustomerQuotedFee(Number(e.target.value))} 
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-4 pr-10 py-3 font-extrabold text-pastel-600 outline-none focus:border-pastel-300 focus:ring-4 focus:ring-pastel-100/30 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">원</span>
                  </div>
                </div>
              </SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { title: "기가라이트 1", desc: "500M + B tv All + 안심", params: { internetId: 'int_500m', tvId: 'tv_all', addOnIds: ['addon_relief'] } },
                  { title: "기가라이트 2", desc: "500M + B tv All+ + 안심", params: { internetId: 'int_500m', tvId: 'tv_all_plus', addOnIds: ['addon_relief'] } },
                  { title: "기가 3", desc: "1G + B tv All+ + 안심", params: { internetId: 'int_1g', tvId: 'tv_all_plus', addOnIds: ['addon_relief'] } }
                ].map((pack, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelections(prev => ({ ...prev, ...pack.params, tv2Id: 'tv_none', stbId: 'stb_smart3', isFamilyPlan: false, mobileLineCount: 0 }))}
                    className="flex flex-col p-6 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-pastel-200 hover:shadow-lg transition-all text-left"
                  >
                    <span className="text-xs font-black text-pastel-400 uppercase tracking-widest mb-1">Set {idx + 1}</span>
                    <span className="text-2xl font-black text-slate-800 mb-1">{pack.title}</span>
                    <span className="text-xs font-medium text-slate-400">{pack.desc}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="animate-fade-in-up">
              <SectionHeader title="속도 선택" step={1}>
                <button 
                  onClick={() => setSelections(prev => ({ ...prev, isFamilyPlan: !prev.isFamilyPlan, mobileLineCount: 0 }))} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 font-black text-sm transition-all ${selections.isFamilyPlan ? 'bg-pastel-500 border-pastel-500 text-white shadow-lg shadow-pastel-100' : 'bg-white border-slate-100 text-slate-400 hover:border-pastel-200'}`}
                >
                  {selections.isFamilyPlan && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13zM7 13a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg>}
                  패밀리 결합
                </button>
              </SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {INTERNET_PLANS.map(p => (
                  <PlanCard 
                    key={p.id} 
                    selected={selections.internetId === p.id} 
                    onClick={() => setSelections(prev => ({ ...prev, internetId: p.id }))} 
                    title={p.name} 
                    price={p.price} 
                    description={p.speed}
                  />
                ))}
              </div>
              
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                {INTERNET_ADD_ONS.map(addon => (
                  <button 
                    key={addon.id} 
                    onClick={() => {
                      const isSelected = selections.addOnIds.includes(addon.id);
                      setSelections(prev => ({ ...prev, addOnIds: isSelected ? prev.addOnIds.filter(id => id !== addon.id) : [...prev.addOnIds, addon.id] }));
                    }}
                    className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${selections.addOnIds.includes(addon.id) ? 'bg-pastel-50 border-pastel-300' : 'bg-white border-slate-50 hover:border-slate-100'}`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black text-slate-800">{addon.name}</span>
                      <span className="text-xs text-slate-400 font-medium">{addon.description}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-pastel-500">+{addon.price.toLocaleString()}원</span>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selections.addOnIds.includes(addon.id) ? 'bg-pastel-500 border-pastel-500 text-white' : 'bg-slate-50 border-slate-100 text-transparent'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="animate-fade-in-up">
              <SectionHeader title="B tv 1" step={2} />
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <PlanCard 
                  selected={selections.tvId === 'tv_none'} 
                  onClick={() => setSelections(prev => ({ ...prev, tvId: 'tv_none', tv2Id: 'tv_none' }))} 
                  title="미가입" 
                  price={0} 
                  description="인터넷 단독"
                />
                {(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).map(p => (
                  <PlanCard 
                    key={p.id} 
                    selected={selections.tvId === p.id} 
                    onClick={() => setSelections(prev => ({ ...prev, tvId: p.id }))} 
                    title={p.name} 
                    price={p.price} 
                    description={`${p.channels}개 채널`}
                  />
                ))}
              </div>
            </section>

            {isTvSelected && (
              <div className="space-y-16">
                <section className="animate-fade-in-up">
                  <SectionHeader title="셋톱박스" step="2-1" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(tvType === 'IPTV' ? STB_OPTIONS : CATV_STB_OPTIONS).map(stb => (
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
                
                <section className="animate-fade-in-up">
                  <SectionHeader title="B tv 2" step="2-2" />
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <PlanCard 
                      selected={selections.tv2Id === 'tv_none'} 
                      onClick={() => setSelections(prev => ({ ...prev, tv2Id: 'tv_none' }))} 
                      title="신청 안함" 
                      price={0} 
                      description="기본 1회선"
                    />
                    {Object.entries(tvType === 'IPTV' ? B_TV_2_PRICES : B_TV_2_POP_PRICES).map(([id, price]) => {
                      const info = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === id);
                      return (
                        <PlanCard 
                          key={id} 
                          selected={selections.tv2Id === id} 
                          onClick={() => setSelections(prev => ({ ...prev, tv2Id: id }))} 
                          title={info?.name || id} 
                          price={price} 
                          description="다회선 할인 적용"
                        />
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            <section className="animate-fade-in-up">
              <SectionHeader title="요즘가족결합" step={3} />
              <div className="bg-white p-10 rounded-4xl border border-white shadow-xl shadow-pastel-100/20 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-extrabold text-slate-800">SKT 휴대폰 결합</h3>
                  <p className="text-sm text-slate-400 font-medium italic">요즘가족결합 기준 할인 혜택</p>
                </div>
                <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <button 
                    onClick={() => setSelections(prev => ({ ...prev, mobileLineCount: 0 }))} 
                    className={`px-10 py-4 rounded-xl font-black text-sm transition-all ${selections.mobileLineCount === 0 ? 'bg-white text-pastel-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    미결합
                  </button>
                  <button 
                    onClick={() => { if (!selections.isFamilyPlan) setSelections(prev => ({ ...prev, mobileLineCount: 1 })); }} 
                    className={`px-10 py-4 rounded-xl font-black text-sm transition-all ${selections.mobileLineCount >= 1 ? 'bg-pastel-500 text-white shadow-xl shadow-pastel-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    요즘가족결합
                  </button>
                </div>
              </div>
            </section>

            <section className="animate-fade-in-up">
              <SectionHeader title="선납권 적용" step={4} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "인터넷 선납권", key: "prepaidInternet" },
                  { label: "B tv 1 선납권", key: "prepaidTv1" },
                  { label: "B tv 2 선납권", key: "prepaidTv2" }
                ].map((item) => (
                  <div key={item.key} className="flex flex-col gap-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">{item.label}</label>
                    <select 
                      value={(selections as any)[item.key]} 
                      onChange={(e) => setSelections(prev => ({ ...prev, [item.key]: Number(e.target.value) }))} 
                      className="w-full bg-white border-2 border-slate-100 rounded-3xl p-5 font-black text-slate-700 outline-none focus:border-pastel-200 focus:ring-4 focus:ring-pastel-50 transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.5rem center', backgroundSize: '1.2rem' }}
                    >
                      <option value={0}>할인 미적용</option>
                      {[1100, 2200, 3300, 4400, 5500, 6600, 7700, 8800].map(v => <option key={v} value={v}>월 -{v.toLocaleString()}원</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="animate-fade-in-up space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">현재 진행중인 프로모션</h2>
              <button 
                onClick={() => {
                  setEditingPromoId(null);
                  setNewPromo({ title: '', category: '전체', description: '', startDate: '', endDate: '' });
                  setIsPromoModalOpen(true);
                }}
                className="bg-pastel-500 hover:bg-pastel-600 text-white font-black px-6 py-3 rounded-2xl shadow-xl shadow-pastel-100 transition-all flex items-center gap-2 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                프로모션 등록
              </button>
            </div>

            {promotions.length === 0 ? (
              <div className="bg-white/50 glass p-20 rounded-4xl flex flex-col items-center text-center border border-white">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4v4h4" /></svg>
                </div>
                <p className="text-slate-400 font-bold">등록된 프로모션이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {promotions.map((promo) => (
                  <div key={promo.id} className="bg-white glass rounded-4xl border border-white shadow-xl shadow-pastel-100/20 overflow-hidden group hover:shadow-2xl transition-all duration-300 relative">
                    {/* 수정/삭제 버튼 그룹 */}
                    <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleEditPromotionClick(e, promo)}
                        className="p-2 bg-white/90 rounded-lg text-slate-400 hover:text-pastel-500 hover:bg-white shadow-sm transition-colors"
                        title="수정"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={(e) => handleDeletePromotion(e, promo.id)}
                        className="p-2 bg-white/90 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white shadow-sm transition-colors"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>

                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-pastel-50 text-pastel-500 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-pastel-100">
                          {promo.category}
                        </span>
                        <span className="text-xs text-slate-300 font-bold italic mr-12">PROMO</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-pastel-600 transition-colors">{promo.title}</h3>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6 line-clamp-3">{promo.description}</p>
                      <div className="pt-6 border-t border-slate-50 flex items-center gap-2 text-xs font-bold text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {promo.startDate} ~ {promo.endDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {activeTab === 'calculator' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50">
          <div className="glass border border-white/40 shadow-[0_30px_60px_-15px_rgba(139,92,246,0.3)] rounded-4xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center md:items-start gap-3 shrink-0">
              {activeDiscounts.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-x-2 gap-y-0.5 py-1.5 px-3 bg-rose-50/40 rounded-2xl border border-rose-100/50 animate-fade-in-up">
                  {activeDiscounts.map((disc, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter">{disc.name}</span>
                      <span className="text-[10px] font-black text-rose-500">-{disc.amount.toLocaleString()}원</span>
                      {idx < activeDiscounts.length - 1 && <span className="w-0.5 h-0.5 rounded-full bg-rose-100 hidden md:block ml-1"></span>}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedPlanSummary.internet}</span>
                {selectedPlanSummary.tv1 && <span className="bg-pastel-50 text-pastel-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedPlanSummary.tv1}</span>}
                {selectedPlanSummary.tv2 && <span className="bg-pastel-50 text-pastel-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedPlanSummary.tv2}</span>}
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end w-full text-center md:text-right">
              <div className="flex flex-col items-center md:items-end gap-2 mb-4 w-full">
                {quotedPriceAnalysis && (
                  <div className="flex flex-col md:flex-row flex-wrap justify-center md:justify-end gap-3 items-center w-full">
                    <span className={`text-[10px] px-3 py-1.5 rounded-full font-black border transition-all ${
                      quotedPriceAnalysis.status === 'impossible' ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 
                      quotedPriceAnalysis.status === 'possible' ? 'bg-amber-400 text-white border-amber-500' : 'bg-emerald-500 text-white border-emerald-600'
                    }`}>
                      {quotedPriceAnalysis.text}
                    </span>
                    
                    {quotedPriceAnalysis.recs && (
                      <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-2xl border border-indigo-100">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mr-1">선납권 추천:</span>
                        <div className="flex gap-2">
                          {quotedPriceAnalysis.recs.internet > 0 && (
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-slate-400 font-bold">인터넷</span>
                              <span className="text-[10px] text-indigo-600 font-black">{quotedPriceAnalysis.recs.internet.toLocaleString()}</span>
                            </div>
                          )}
                          {quotedPriceAnalysis.recs.tv1 > 0 && (
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-slate-400 font-bold">TV 1</span>
                              <span className="text-[10px] text-indigo-600 font-black">{quotedPriceAnalysis.recs.tv1.toLocaleString()}</span>
                            </div>
                          )}
                          {quotedPriceAnalysis.recs.tv2 > 0 && (
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-slate-400 font-bold">TV 2</span>
                              <span className="text-[10px] text-indigo-600 font-black">{quotedPriceAnalysis.recs.tv2.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-end gap-3 md:gap-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs md:text-sm font-bold text-slate-400 mr-1">최종 월 납부액</span>
                  <span className="text-3xl md:text-5xl font-black text-pastel-600 tracking-tighter tabular-nums">{totalPrice.toLocaleString()}</span>
                  <span className="text-lg font-black text-slate-800">원</span>
                </div>
                
                <button 
                  onClick={() => setIsShareModalOpen(true)} 
                  className="group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-2xl text-white shadow-xl hover:bg-black transition-all active:scale-95 shrink-0"
                  title="설계 내역 복사"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3M12 11l3 3m0 0l-3 3m3-3H9" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-5xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up border border-white">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-pastel-500 rounded-lg flex items-center justify-center"><span className="text-[10px] font-black italic">SK</span></div>
                <h2 className="font-extrabold text-lg tracking-tight">설계 리포트</h2>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8">
              <div className="bg-slate-50 p-6 rounded-3xl text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap mb-8 max-h-[45vh] overflow-y-auto border border-slate-100/50">
                {shareSummaryText}
              </div>
              <button 
                onClick={() => { 
                  navigator.clipboard.writeText(shareSummaryText); 
                  alert("클립보드에 복사되었습니다."); 
                  setIsShareModalOpen(false); 
                }} 
                className="w-full bg-pastel-500 hover:bg-pastel-600 text-white py-6 rounded-3xl font-black shadow-xl shadow-pastel-100 transition-all flex items-center justify-center gap-4 active:scale-95"
              >
                복사하여 전달하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isPromoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-5xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up border border-white">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-pastel-500 rounded-lg flex items-center justify-center"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464a1 1 0 10-1.414-1.414l.707-.707a1 1 0 001.414 1.414l-.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM16 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1z" /></svg></div>
                <h2 className="font-extrabold text-lg tracking-tight">{editingPromoId ? '프로모션 수정' : '프로모션 등록'}</h2>
              </div>
              <button onClick={() => { setIsPromoModalOpen(false); setEditingPromoId(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitPromotion} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">프로모션 제목</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="예: 500M 신규 가입 혜택" 
                    value={newPromo.title} 
                    onChange={e => setNewPromo({...newPromo, title: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-pastel-200 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">카테고리</label>
                  <select 
                    value={newPromo.category} 
                    onChange={e => setNewPromo({...newPromo, category: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-pastel-200 focus:bg-white transition-all appearance-none"
                  >
                    <option value="전체">전체</option>
                    <option value="인터넷">인터넷</option>
                    <option value="B tv">B tv</option>
                    <option value="결합">결합</option>
                    <option value="셋톱박스">셋톱박스</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">설명</label>
                  <textarea 
                    required 
                    rows={3} 
                    placeholder="프로모션 상세 내용을 입력하세요." 
                    value={newPromo.description} 
                    onChange={e => setNewPromo({...newPromo, description: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-pastel-200 focus:bg-white transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">시작일</label>
                    <input 
                      required 
                      type="date" 
                      value={newPromo.startDate} 
                      onChange={e => setNewPromo({...newPromo, startDate: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-pastel-200 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1 block">종료일</label>
                    <input 
                      required 
                      type="date" 
                      value={newPromo.endDate} 
                      onChange={e => setNewPromo({...newPromo, endDate: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-pastel-200 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-pastel-500 hover:bg-pastel-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-pastel-100 transition-all active:scale-95"
              >
                {editingPromoId ? '수정 완료' : '등록하기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
