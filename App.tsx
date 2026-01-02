
import React, { useState, useMemo, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { 
  INTERNET_PLANS, 
  INTERNET_ADD_ONS,
  TV_PLANS, 
  STB_OPTIONS, 
  MOBILE_COMBINATION_DISCOUNTS 
} from './constants';
import { SelectionState } from './types';
import { db, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, where } from './firebase';
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

interface Manual {
  id: string;
  title: string;
  category: string;
  description: string;
  processMethod: string;
  createdAt: any;
  updatedAt?: any;
}

interface ManualRevision {
  id: string;
  manualId: string;
  editedAt: any;
  editorName: string;
  previousState: {
    title: string;
    category: string;
    description: string;
    processMethod: string;
  };
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

const JotForm: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://form.jotform.com/jsform/253587505466063";
    script.type = "text/javascript";
    script.async = true;
    const container = document.getElementById('jotform-container');
    if (container) {
      container.appendChild(script);
    }
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-4xl p-4 md:p-8 shadow-xl shadow-pastel-100/20 min-h-[800px] overflow-hidden">
      <div id="jotform-container" className="w-full"></div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'calculator' | 'promotion' | 'manual' | 'application'>('calculator');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isManualDetailOpen, setIsManualDetailOpen] = useState<boolean>(false);
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  
  const [revisionHistory, setRevisionHistory] = useState<ManualRevision[]>([]);
  const [viewingRevision, setViewingRevision] = useState<ManualRevision | null>(null);

  // Firebase State
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);
  
  const [newPromo, setNewPromo] = useState({
    title: '',
    category: '전체',
    description: '',
    startDate: '',
    endDate: ''
  });

  const [newManual, setNewManual] = useState({
    title: '',
    category: '일반',
    description: '',
    processMethod: '',
    editorName: '' 
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
    const qPromo = query(collection(db, "promotions"), orderBy("createdAt", "desc"));
    const unsubscribePromo = onSnapshot(qPromo, (snapshot: QuerySnapshot<DocumentData>) => {
      const promoList = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data()
      })) as Promotion[];
      setPromotions(promoList);
    });

    // Real-time listener for manuals
    const qManual = query(collection(db, "manuals"), orderBy("createdAt", "desc"));
    const unsubscribeManual = onSnapshot(qManual, (snapshot: QuerySnapshot<DocumentData>) => {
      const manualList = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data()
      })) as Manual[];
      setManuals(manualList);
    });

    return () => {
      unsubscribePromo();
      unsubscribeManual();
    };
  }, []);

  useEffect(() => {
    if (!isManualDetailOpen || !selectedManual) {
        setRevisionHistory([]);
        return;
    }

    const q = query(
        collection(db, "manual_revisions"),
        where("manualId", "==", selectedManual.id),
        orderBy("editedAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ManualRevision[];
        setRevisionHistory(history);
    });

    return () => unsubscribe();
  }, [isManualDetailOpen, selectedManual]);

  const handleSubmitPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromoId) {
        await updateDoc(doc(db, "promotions", editingPromoId), {
          ...newPromo,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, "promotions"), {
          ...newPromo,
          createdAt: new Date()
        });
      }
      setIsPromoModalOpen(false);
      setEditingPromoId(null);
      setNewPromo({ title: '', category: '전체', description: '', startDate: '', endDate: '' });
    } catch (error) {
      console.error(error);
      alert("오류가 발생했습니다.");
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (editingManualId) {
            if (!newManual.editorName?.trim()) {
                alert("수정자 이름을 입력해주세요.");
                return;
            }

            const manualRef = doc(db, "manuals", editingManualId);
            const manualSnap = await getDoc(manualRef);

            if (manualSnap.exists()) {
                const currentData = manualSnap.data();
                await addDoc(collection(db, "manual_revisions"), {
                    manualId: editingManualId,
                    editedAt: new Date(),
                    editorName: newManual.editorName,
                    previousState: {
                        title: currentData.title,
                        category: currentData.category,
                        description: currentData.description,
                        processMethod: currentData.processMethod,
                    }
                });
            } else {
                console.error("수정 이력을 생성할 원본 문서를 찾을 수 없습니다.");
                alert("오류가 발생했습니다: 원본 문서를 찾을 수 없습니다.");
                return;
            }

            const { editorName, ...manualData } = newManual;
            await updateDoc(manualRef, {
                ...manualData,
                updatedAt: new Date()
            });
        } else {
            const { editorName, ...manualData } = newManual;
            await addDoc(collection(db, "manuals"), {
                ...manualData,
                createdAt: new Date()
            });
        }
        setIsManualModalOpen(false);
        setEditingManualId(null);
        setNewManual({ title: '', category: '일반', description: '', processMethod: '', editorName: '' });
    } catch (error) {
        console.error("메뉴얼 저장 오류:", error);
        alert("오류가 발생했습니다.");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '0405') setIsAuthenticated(true);
    else setPassword('');
  };

  useEffect(() => {
    if (tvType === 'CATV') {
      setSelections(prev => ({ ...prev, tvId: 'pop_100', tv2Id: 'tv_none', stbId: 'stb_smart3_pop' }));
    } else {
      setSelections(prev => ({ ...prev, tvId: 'tv_lite', tv2Id: 'tv_none', stbId: 'stb_smart3' }));
    }
  }, [tvType]);

  const { totalPrice, discountBreakdown, isTvSelected, currentAddOns, currentEffectiveStbPrice } = useMemo(() => {
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

    let effectiveStbFee = stb ? stb.price : 0;
    if (tvType === 'CATV') {
      if (selections.stbId === 'stb_ai2_pop') {
        if (selections.tvId === 'pop_230') effectiveStbFee = 0;
        else if (selections.tvId === 'pop_180') effectiveStbFee = 1100;
        else if (selections.tvId === 'pop_100') effectiveStbFee = 2200;
      } else if (selections.stbId === 'stb_smart3_pop') {
        if (selections.tvId === 'pop_230') effectiveStbFee = 2200;
        else effectiveStbFee = 3300;
      }
    }

    if (hasTv) {
      base += tv!.price;
      base += effectiveStbFee;
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
      currentAddOns: selections.addOnIds.map(id => INTERNET_ADD_ONS.find(a => id === a.id)?.name).filter(Boolean) as string[],
      currentEffectiveStbPrice: effectiveStbFee
    };
  }, [selections, tvType]);

  const activeDiscounts = useMemo(() => {
    const list = [];
    if (discountBreakdown.bundle > 0) list.push({ name: '결합할인', amount: discountBreakdown.bundle });
    if (discountBreakdown.mobile > 0) list.push({ name: '휴대폰결합', amount: discountBreakdown.mobile });
    if (discountBreakdown.family > 0) list.push({ name: '패밀리할인', amount: discountBreakdown.family });
    if (discountBreakdown.stb > 0) list.push({ name: '셋톱할인', amount: discountBreakdown.stb });
    if (discountBreakdown.prepaid > 0) list.push({ name: '선납권', amount: discountBreakdown.prepaid });
    return list;
  }, [discountBreakdown]);

  const quotedPriceAnalysis = useMemo(() => {
    if (customerQuotedFee <= 0) return null;
    const diff = totalPrice - customerQuotedFee;
    const hasTv1 = selections.tvId !== 'tv_none' && selections.tvId !== null;
    const hasTv2 = selections.tv2Id !== 'tv_none' && selections.tv2Id !== null;
    let totalLimit = !hasTv1 ? 7700 : !hasTv2 ? 15400 : 23100;
    const prefix = `상담가 : ${customerQuotedFee.toLocaleString()}원 / `;
    let statusText = `${prefix}차액 ${Math.abs(diff).toLocaleString()}원 ${diff > 0 ? '높음' : '낮음'}`;
    let statusColor = diff > 0 ? 'possible' : 'ok';
    let recs = null;
    if (diff > totalLimit) {
      statusColor = 'impossible';
      statusText = `${prefix}업셀 불가 (${Math.abs(diff).toLocaleString()}원 차이)`;
    } else if (diff <= 0) {
      statusColor = 'ok';
    } else {
      let remaining = Math.ceil(diff / 1100) * 1100;
      const internetRec = Math.min(remaining, 7700);
      remaining -= internetRec;
      const tv1Rec = hasTv1 ? Math.min(remaining, 7700) : 0;
      remaining -= tv1Rec;
      const tv2Rec = hasTv2 ? Math.min(remaining, 7700) : 0;
      recs = { internet: internetRec, tv1: tv1Rec, tv2: tv2Rec };
    }
    return { text: statusText, status: statusColor, recs: recs };
  }, [totalPrice, customerQuotedFee, selections.tvId, selections.tv2Id]);

  const { shareSummaryText, selectedPlanSummary } = useMemo(() => {
    const internet = INTERNET_PLANS.find(p => p.id === selections.internetId);
    const tv1 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === selections.tvId);
    const tv2Id = selections.tv2Id;
    const currentBtv2Prices = tvType === 'IPTV' ? B_TV_2_PRICES : B_TV_2_POP_PRICES;
    const tv2 = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === tv2Id);
    const hasTv1 = selections.tvId !== 'tv_none' && !!tv1;
    const hasTv2 = tv2Id !== 'tv_none' && !!tv2;
    let addOnTotal = 0;
    const isWings = selections.addOnIds.includes('addon_wings');
    const isRelief = selections.addOnIds.includes('addon_relief');
    if (isWings && isRelief) addOnTotal = 3300;
    else {
      if (isWings) addOnTotal += 1650;
      if (isRelief) addOnTotal += 2200;
    }
    const iMobileDisc = (discountBreakdown.mobile > 0 && internet) ? (MOBILE_COMBINATION_DISCOUNTS.INTERNET as any)[internet.id] || 0 : 0;
    const iNetPrice = Math.max(0, (internet?.price || 0) + addOnTotal - discountBreakdown.family - discountBreakdown.bundle - iMobileDisc - selections.prepaidInternet);
    const t1MobileDisc = (discountBreakdown.mobile > 0 && tvType === 'IPTV' && hasTv1) ? 1100 : 0;
    const t1NetPrice = Math.max(0, (tv1?.price || 0) + currentEffectiveStbPrice - t1MobileDisc - discountBreakdown.stb - selections.prepaidTv1);
    const t2NetPrice = Math.max(0, (hasTv2 ? currentBtv2Prices[tv2Id as string] : 0) + (hasTv2 ? 2200 : 0) - selections.prepaidTv2);
    let recsText = '';
    if (quotedPriceAnalysis?.recs) {
      const { internet: i, tv1: t1, tv2: t2 } = quotedPriceAnalysis.recs;
      const parts = [];
      if (i > 0) parts.push(`인터넷 :${i.toLocaleString()}원`);
      if (t1 > 0) parts.push(`B tv 1 :${t1.toLocaleString()}원`);
      if (t2 > 0) parts.push(`B tv 2 :${t2.toLocaleString()}원`);
      recsText = parts.length > 0 ? `[추천 선납권 구성]\n- ${parts.join('\n- ')}` : '';
    }
    const summaryText = `[SKB 설계내역]
- 속도: ${internet?.name} (${internet?.speed}) [${iNetPrice.toLocaleString()}원]
- B tv 1: ${hasTv1 ? tv1.name : '없음'} [${t1NetPrice.toLocaleString()}원]
- B tv 2: ${hasTv2 ? tv2.name : '없음'} [${t2NetPrice.toLocaleString()}원]
- 부가서비스: ${currentAddOns.join(', ') || '없음'}
- 결합: ${selections.isFamilyPlan ? '패밀리' : selections.mobileLineCount > 0 ? '요즘가족결합' : '기본'}
- ${quotedPriceAnalysis?.text || '안내요금 정보없음'}

${recsText}

- 최종 월 요금: ${totalPrice.toLocaleString()}원`;
    return {
      shareSummaryText: summaryText,
      selectedPlanSummary: {
        internet: `${internet?.speed} [${iNetPrice.toLocaleString()}원]`,
        tv1: hasTv1 ? `${tv1.name} [${t1NetPrice.toLocaleString()}원]` : "",
        tv2: hasTv2 ? `${tv2.name} [${t2NetPrice.toLocaleString()}원]` : ""
      }
    };
  }, [selections, tvType, currentAddOns, totalPrice, quotedPriceAnalysis, discountBreakdown, currentEffectiveStbPrice]);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline','strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['table'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link',
    'table'
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-pastel-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pastel-200/40 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pastel-300/30 blur-[120px] rounded-full"></div>
        <div className="max-w-md w-full animate-fade-in-up relative z-10">
          <div className="bg-white/70 glass rounded-5xl shadow-2xl overflow-hidden border border-white p-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pastel-400 to-pastel-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-pastel-200 animate-float"><span className="text-white font-black text-3xl italic tracking-tighter">SK</span></div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">업셀 마스터</h1>
            <p className="text-slate-400 font-medium mb-10">스마트한 SKB 요금 설계를 시작하세요</p>
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 입력" className="w-full bg-white border-2 border-slate-50 rounded-2xl px-6 py-5 font-black text-slate-800 text-center text-2xl tracking-[0.4em] focus:border-pastel-200 focus:ring-4 focus:ring-pastel-100/50 outline-none transition-all placeholder:tracking-normal placeholder:text-slate-200" />
              <button type="submit" className="w-full bg-pastel-500 hover:bg-pastel-600 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-pastel-100 transition-all active:scale-95">입장하기</button>
            </form>
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
            <div className="w-9 h-9 bg-gradient-to-br from-pastel-400 to-pastel-600 rounded-xl flex items-center justify-center shadow-lg shadow-pastel-100"><span className="text-white font-black text-[10px] italic">SK</span></div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 hidden sm:block">업셀 마스터 <span className="text-pastel-400 font-medium ml-1">Pro</span></h1>
          </div>
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 overflow-x-auto max-w-[calc(100vw-180px)] no-scrollbar">
            <button onClick={() => setActiveTab('calculator')} className={`whitespace-nowrap px-3 sm:px-4 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'calculator' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>요금계산기</button>
            <button onClick={() => setActiveTab('promotion')} className={`whitespace-nowrap px-3 sm:px-4 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'promotion' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>프로모션</button>
            <button onClick={() => setActiveTab('manual')} className={`whitespace-nowrap px-3 sm:px-4 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'manual' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>업무메뉴얼</button>
            <button onClick={() => setActiveTab('application')} className={`whitespace-nowrap px-3 sm:px-4 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'application' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>신청서</button>
          </nav>
          <div className="shrink-0"><button onClick={() => setIsAuthenticated(false)} className="text-[10px] font-bold text-slate-400 hover:text-pastel-500 transition-colors uppercase tracking-widest px-2">Logout</button></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        {activeTab === 'calculator' && (
          <div className="space-y-16">
            <section className="bg-white/80 glass p-8 rounded-4xl border border-white shadow-xl shadow-pastel-100/30">
              <SectionHeader title="퀵 업셀 설계" step="0">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                    <button onClick={() => setTvType('IPTV')} className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${tvType === 'IPTV' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>IPTV</button>
                    <button onClick={() => setTvType('CATV')} className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${tvType === 'CATV' ? 'bg-white text-pastel-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>CATV</button>
                  </div>
                  <div className="relative w-full md:w-48 group">
                    <input type="number" placeholder="안내요금 입력" value={customerQuotedFee || ''} onChange={(e) => setCustomerQuotedFee(Number(e.target.value))} className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-4 pr-10 py-3 font-extrabold text-pastel-600 outline-none focus:border-pastel-300 focus:ring-4 focus:ring-pastel-100/30 transition-all" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">원</span>
                  </div>
                </div>
              </SectionHeader>
              <div className="flex flex-wrap gap-2 mb-8 -mt-4 animate-fade-in-up">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-full mb-1 ml-1">빠른 입력</span>
                {[39600, 46200, 49500, 52800, 56100].map(fee => (
                  <button key={fee} onClick={() => setCustomerQuotedFee(fee)} className="px-4 py-2 bg-pastel-50 hover:bg-pastel-500 text-pastel-600 hover:text-white rounded-2xl text-xs font-black transition-all border border-pastel-100 shadow-sm active:scale-95">{fee.toLocaleString()}</button>
                ))}
                <button onClick={() => setCustomerQuotedFee(0)} className="px-4 py-2 bg-slate-50 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-2xl text-xs font-black transition-all border border-slate-100 shadow-sm active:scale-95">초기화</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { title: "기가라이트 1", desc: "500M + B tv All + 안심", params: { internetId: 'int_500m', tvId: 'tv_all', addOnIds: ['addon_relief'] } },
                  { title: "기가라이트 2", desc: "500M + B tv All+ + 안심", params: { internetId: 'int_500m', tvId: 'tv_all_plus', addOnIds: ['addon_relief'] } },
                  { title: "기가 3", desc: "1G + B tv All+ + 안심", params: { internetId: 'int_1g', tvId: 'tv_all_plus', addOnIds: ['addon_relief'] } }
                ].map((pack, idx) => (
                  <button key={idx} onClick={() => setSelections(prev => ({ ...prev, ...pack.params, tv2Id: 'tv_none', stbId: 'stb_smart3', isFamilyPlan: false, mobileLineCount: 0 }))} className="flex flex-col p-6 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-pastel-200 hover:shadow-lg transition-all text-left">
                    <span className="text-xs font-black text-pastel-400 uppercase tracking-widest mb-1">Set {idx + 1}</span>
                    <span className="text-2xl font-black text-slate-800 mb-1">{pack.title}</span>
                    <span className="text-xs font-medium text-slate-400">{pack.desc}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="animate-fade-in-up">
              <SectionHeader title="속도 선택" step={1}>
                <button onClick={() => setSelections(prev => ({ ...prev, isFamilyPlan: !prev.isFamilyPlan, mobileLineCount: 0 }))} className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 font-black text-sm transition-all ${selections.isFamilyPlan ? 'bg-pastel-500 border-pastel-500 text-white shadow-lg shadow-pastel-100' : 'bg-white border-slate-100 text-slate-400 hover:border-pastel-200'}`}>패밀리 결합</button>
              </SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{INTERNET_PLANS.map(p => (<PlanCard key={p.id} selected={selections.internetId === p.id} onClick={() => setSelections(prev => ({ ...prev, internetId: p.id }))} title={p.name} price={p.price} description={p.speed}/>))}</div>
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">{INTERNET_ADD_ONS.map(addon => (<button key={addon.id} onClick={() => { const isSelected = selections.addOnIds.includes(addon.id); setSelections(prev => ({ ...prev, addOnIds: isSelected ? prev.addOnIds.filter(id => id !== addon.id) : [...prev.addOnIds, addon.id] })); }} className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${selections.addOnIds.includes(addon.id) ? 'bg-pastel-50 border-pastel-300' : 'bg-white border-slate-50 hover:border-slate-100'}`}><div className="flex flex-col text-left"><span className="text-sm font-black text-slate-800">{addon.name}</span><span className="text-xs text-slate-400 font-medium">{addon.description}</span></div><div className="flex items-center gap-3"><span className="text-sm font-extrabold text-pastel-500">+{addon.price.toLocaleString()}원</span><div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selections.addOnIds.includes(addon.id) ? 'bg-pastel-500 border-pastel-500 text-white' : 'bg-slate-50 border-slate-100 text-transparent'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div></div></button>))}</div>
            </section>
            <section className="animate-fade-in-up">
              <SectionHeader title="B tv 1" step={2} />
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <PlanCard selected={selections.tvId === 'tv_none'} onClick={() => setSelections(prev => ({ ...prev, tvId: 'tv_none', tv2Id: 'tv_none' }))} title="미가입" price={0} description="인터넷 단독"/>
                {(tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).map(p => (<PlanCard key={p.id} selected={selections.tvId === p.id} onClick={() => setSelections(prev => ({ ...prev, tvId: p.id }))} title={p.name} price={p.price} description={`${p.channels}개 채널`}/>))}
              </div>
            </section>
            {isTvSelected && (
              <div className="space-y-16">
                <section className="animate-fade-in-up">
                  <SectionHeader title="셋톱박스" step="2-1" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{(tvType === 'IPTV' ? STB_OPTIONS : CATV_STB_OPTIONS).map(stb => (<PlanCard key={stb.id} selected={selections.stbId === stb.id} onClick={() => setSelections(prev => ({ ...prev, stbId: stb.id }))} title={stb.name} price={stb.price} description={stb.description}/>))}</div>
                </section>
                <section className="animate-fade-in-up">
                  <SectionHeader title="B tv 2" step="2-2" />
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <PlanCard selected={selections.tv2Id === 'tv_none'} onClick={() => setSelections(prev => ({ ...prev, tv2Id: 'tv_none' }))} title="신청 안함" price={0} description="기본 1회선"/>
                    {Object.entries(tvType === 'IPTV' ? B_TV_2_PRICES : B_TV_2_POP_PRICES).map(([id, price]) => {
                      const info = (tvType === 'IPTV' ? TV_PLANS : CATV_TV_PLANS).find(p => p.id === id);
                      return (<PlanCard key={id} selected={selections.tv2Id === id} onClick={() => setSelections(prev => ({ ...prev, tv2Id: id }))} title={info?.name || id} price={price} description="다회선 할인 적용"/>);
                    })}
                  </div>
                </section>
              </div>
            )}
            <section className="animate-fade-in-up">
              <SectionHeader title="요즘가족결합" step={3} />
              <div className="bg-white p-10 rounded-4xl border border-white shadow-xl shadow-pastel-100/20 flex flex-col md:flex-row justify-between items-center gap-8"><div className="flex flex-col gap-1"><h3 className="text-xl font-extrabold text-slate-800">SKT 휴대폰 결합</h3><p className="text-sm text-slate-400 font-medium italic">요즘가족결합 기준 할인 혜택</p></div><div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100"><button onClick={() => setSelections(prev => ({ ...prev, mobileLineCount: 0 }))} className={`px-10 py-4 rounded-xl font-black text-sm transition-all ${selections.mobileLineCount === 0 ? 'bg-white text-pastel-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>미결합</button><button onClick={() => { if (!selections.isFamilyPlan) setSelections(prev => ({ ...prev, mobileLineCount: 1 })); }} className={`px-10 py-4 rounded-xl font-black text-sm transition-all ${selections.mobileLineCount >= 1 ? 'bg-pastel-500 text-white shadow-xl shadow-pastel-200' : 'text-slate-400 hover:text-slate-600'}`}>요즘가족결합</button></div></div>
            </section>
            <section className="animate-fade-in-up">
              <SectionHeader title="선납권 적용" step={4} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[{ label: "인터넷 선납권", key: "prepaidInternet" }, { label: "B tv 1 선납권", key: "prepaidTv1" }, { label: "B tv 2 선납권", key: "prepaidTv2" }].map((item) => (<div key={item.key} className="flex flex-col gap-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">{item.label}</label><select value={(selections as any)[item.key]} onChange={(e) => setSelections(prev => ({ ...prev, [item.key]: Number(e.target.value) }))} className="w-full bg-white border-2 border-slate-100 rounded-3xl p-5 font-black text-slate-700 outline-none focus:border-pastel-200 focus:ring-4 focus:ring-pastel-50 transition-all appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.5rem center', backgroundSize: '1.2rem' }}><option value={0}>할인 미적용</option>{[1100, 2200, 3300, 4400, 5500, 6600, 7700, 8800].map(v => <option key={v} value={v}>월 -{v.toLocaleString()}원</option>)}</select></div>))}</div>
            </section>
          </div>
        )}

        {activeTab === 'promotion' && (
          <div className="animate-fade-in-up space-y-10">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800 tracking-tight">진행중인 프로모션</h2><button onClick={() => { setEditingPromoId(null); setNewPromo({ title: '', category: '전체', description: '', startDate: '', endDate: '' }); setIsPromoModalOpen(true); }} className="bg-pastel-500 hover:bg-pastel-600 text-white font-black px-6 py-3 rounded-2xl shadow-xl shadow-pastel-100 transition-all flex items-center gap-2 active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>프로모션 등록</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{promotions.map((promo) => (<div key={promo.id} className="bg-white glass rounded-4xl border border-white shadow-xl shadow-pastel-100/20 overflow-hidden group hover:shadow-2xl transition-all relative"><div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingPromoId(promo.id); setNewPromo(promo); setIsPromoModalOpen(true); }} className="p-2 bg-white/90 rounded-lg text-slate-400 hover:text-pastel-500 shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button><button onClick={async () => { if(confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "promotions", promo.id)); }} className="p-2 bg-white/90 rounded-lg text-slate-400 hover:text-rose-500 shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div><div className="p-8"><div className="flex justify-between items-start mb-4"><span className="bg-pastel-50 text-pastel-500 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-pastel-100">{promo.category}</span></div><h3 className="text-xl font-black text-slate-800 mb-2">{promo.title}</h3><p className="text-sm text-slate-400 font-medium leading-relaxed mb-6 line-clamp-3">{promo.description}</p><div className="pt-6 border-t border-slate-50 flex items-center gap-2 text-xs font-bold text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{promo.startDate} ~ {promo.endDate}</div></div></div>))}</div>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="animate-fade-in-up space-y-10">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800 tracking-tight">업무 메뉴얼 게시판</h2><button onClick={() => { setEditingManualId(null); setNewManual({ title: '', category: '일반', description: '', processMethod: '', editorName: '' }); setIsManualModalOpen(true); }} className="bg-indigo-500 hover:bg-indigo-600 text-white font-black px-6 py-3 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>메뉴얼 작성</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {manuals.map((manual) => (
                <div key={manual.id} onClick={() => { setSelectedManual(manual); setIsManualDetailOpen(true); }} className="bg-white glass rounded-4xl border border-white shadow-xl shadow-pastel-100/20 overflow-hidden group hover:shadow-2xl transition-all cursor-pointer relative">
                  <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingManualId(manual.id); setNewManual({ ...manual, editorName: '' }); setIsManualModalOpen(true); }} className="p-2 bg-white/90 rounded-lg text-slate-400 hover:text-indigo-500 shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onClick={async (e) => { e.stopPropagation(); if(confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, "manuals", manual.id)); }} className="p-2 bg-white/90 rounded-lg text-slate-400 hover:text-rose-500 shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${manual.category === '전산' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>{manual.category}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{manual.title}</h3>
                    <div className="text-sm text-slate-400 font-medium leading-relaxed mb-6 line-clamp-3 manual-content" dangerouslySetInnerHTML={{ __html: manual.description }}></div>
                    <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>자세히 보려면 클릭하세요</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'application' && (
          <div className="animate-fade-in-up space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">서비스 신청서</h2>
            </div>
            <JotForm />
          </div>
        )}
      </main>

      {/* Revision Detail Modal */}
      {viewingRevision && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
              <div className="bg-white rounded-5xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up border border-white">
                  <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                      <div>
                          <h2 className="font-extrabold text-lg tracking-tight">수정 이력 상세 (이전 버전)</h2>
                          <p className="text-sm text-slate-400">{viewingRevision.editorName} 님의 수정 ({viewingRevision.editedAt.toDate().toLocaleString('ko-KR')})</p>
                      </div>
                      <button onClick={() => setViewingRevision(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                      <div>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">제목</h4>
                          <p className="text-slate-800 font-bold">{viewingRevision.previousState.title}</p>
                      </div>
                      <div>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">상세 설명</h4>
                          <div className="manual-content" dangerouslySetInnerHTML={{ __html: viewingRevision.previousState.description }} />
                      </div>
                      <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                          <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>전산 처리 방법</h4>
                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-bold text-sm">{viewingRevision.previousState.processMethod}</p>
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50/50 flex justify-end">
                      <button onClick={() => setViewingRevision(null)} className="px-8 py-3 bg-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-300 transition-all">닫기</button>
                  </div>
              </div>
          </div>
      )}

      {/* Manual Detail Modal */}
      {isManualDetailOpen && selectedManual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-5xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up border border-white">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${selectedManual.category === '전산' ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'}`}>{selectedManual.category}</span>
                <h2 className="font-extrabold text-lg tracking-tight">{selectedManual.title}</h2>
              </div>
              <button onClick={() => setIsManualDetailOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">상세 설명</h4>
                <div className="manual-content" dangerouslySetInnerHTML={{ __html: selectedManual.description }} />
              </div>
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>전산 처리 방법</h4>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-bold text-sm">{selectedManual.processMethod}</p>
              </div>
              {revisionHistory.length > 0 && (
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        수정 이력
                    </h4>
                    <ul className="space-y-3">
                        {revisionHistory.map(rev => (
                            <li key={rev.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-200/60">
                                <div>
                                    <span className="font-bold text-slate-700 text-sm">{rev.editorName}</span>
                                    <span className="text-xs text-slate-400 ml-2">{rev.editedAt.toDate().toLocaleString('ko-KR')}</span>
                                </div>
                                <button onClick={() => setViewingRevision(rev)} className="text-xs font-bold text-indigo-500 hover:underline">
                                    변경내용 보기
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50/50 flex justify-end">
              <button onClick={() => setIsManualDetailOpen(false)} className="px-8 py-3 bg-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-300 transition-all">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add/Edit Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-5xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up border border-white">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <h2 className="font-extrabold text-lg tracking-tight">{editingManualId ? '메뉴얼 수정' : '새 메뉴얼 등록'}</h2>
              <button onClick={() => setIsManualModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmitManual} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">제목</label>
                  <input required type="text" placeholder="메뉴얼 제목을 입력하세요" value={newManual.title} onChange={e => setNewManual({...newManual, title: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-indigo-200 focus:bg-white transition-all" />
                </div>
                {editingManualId && (
                  <div>
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">수정자 이름 (필수)</label>
                    <input required type="text" placeholder="수정자 이름을 입력하세요" value={newManual.editorName} onChange={e => setNewManual({...newManual, editorName: e.target.value})} className="w-full bg-rose-50 border-2 border-rose-100 rounded-2xl px-5 py-3 font-bold text-rose-900 outline-none focus:border-rose-300 focus:bg-white transition-all" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">카테고리</label>
                  <select value={newManual.category} onChange={e => setNewManual({...newManual, category: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-indigo-200 focus:bg-white transition-all appearance-none"><option value="일반">일반</option><option value="전산">전산</option><option value="접수">접수</option><option value="해지">해지</option></select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">상세 설명</label>
                  <ReactQuill
                    theme="snow"
                    value={newManual.description}
                    onChange={(content) => setNewManual(prev => ({ ...prev, description: content }))}
                    modules={quillModules}
                    formats={quillFormats}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">전산 처리 방법</label>
                  <textarea required rows={4} placeholder="전산 처리 절차 및 주의사항을 입력하세요" value={newManual.processMethod} onChange={e => setNewManual({...newManual, processMethod: e.target.value})} className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-5 py-3 font-bold text-indigo-900 outline-none focus:border-indigo-300 focus:bg-white transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95">{editingManualId ? '수정 완료' : '메뉴얼 등록'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Summary Footer (only for calculator) */}
      {activeTab === 'calculator' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50">
          <div className="glass border border-white/40 shadow-[0_30px_60px_-15px_rgba(139,92,246,0.3)] rounded-4xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center md:items-start gap-3 shrink-0">
              {activeDiscounts.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-x-2 gap-y-0.5 py-1.5 px-3 bg-rose-50/40 rounded-2xl border border-rose-100/50 animate-fade-in-up">
                  {activeDiscounts.map((disc, idx) => (
                    <div key={idx} className="flex items-center gap-1"><span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter">{disc.name}</span><span className="text-[10px] font-black text-rose-500">-{disc.amount.toLocaleString()}원</span>{idx < activeDiscounts.length - 1 && <span className="w-0.5 h-0.5 rounded-full bg-rose-100 hidden md:block ml-1"></span>}</div>
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
              {quotedPriceAnalysis && (
                <div className="flex flex-col md:flex-row flex-wrap justify-center md:justify-end gap-3 items-center w-full mb-4">
                  <span className={`text-[10px] px-3 py-1.5 rounded-full font-black border transition-all ${quotedPriceAnalysis.status === 'impossible' ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : quotedPriceAnalysis.status === 'possible' ? 'bg-amber-400 text-white border-amber-500' : 'bg-emerald-500 text-white border-emerald-600'}`}>{quotedPriceAnalysis.text}</span>
                  {quotedPriceAnalysis.recs && (
                    <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-2xl border border-indigo-100"><span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mr-1">선납권 추천:</span><div className="flex gap-2">
                      {quotedPriceAnalysis.recs.internet > 0 && (<div className="flex flex-col items-center"><span className="text-[8px] text-slate-400 font-bold">인터넷</span><span className="text-[10px] text-indigo-600 font-black">{quotedPriceAnalysis.recs.internet.toLocaleString()}</span></div>)}
                      {quotedPriceAnalysis.recs.tv1 > 0 && (<div className="flex flex-col items-center"><span className="text-[8px] text-slate-400 font-bold">TV 1</span><span className="text-[10px] text-indigo-600 font-black">{quotedPriceAnalysis.recs.tv1.toLocaleString()}</span></div>)}
                      {quotedPriceAnalysis.recs.tv2 > 0 && (<div className="flex flex-col items-center"><span className="text-[8px] text-slate-400 font-bold">TV 2</span><span className="text-[10px] text-indigo-600 font-black">{quotedPriceAnalysis.recs.tv2.toLocaleString()}</span></div>)}
                    </div></div>
                  )}
                </div>
              )}
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-end gap-3 md:gap-8">
                <div className="flex items-baseline gap-2"><span className="text-xs md:text-sm font-bold text-slate-400 mr-1">최종 월 납부액</span><span className="text-3xl md:text-5xl font-black text-pastel-600 tracking-tighter tabular-nums">{totalPrice.toLocaleString()}</span><span className="text-lg font-black text-slate-800">원</span></div>
                <button onClick={() => setIsShareModalOpen(true)} className="group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-2xl text-white shadow-xl hover:bg-black transition-all active:scale-95 shrink-0" title="설계 내역 복사"><svg className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3M12 11l3 3m0 0l-3 3m3-3H9" /></svg></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-5xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up border border-white">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white"><h2 className="font-extrabold text-lg tracking-tight">설계 리포트</h2><button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="p-8">
              <div className="bg-slate-50 p-6 rounded-3xl text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap mb-8 max-h-[45vh] overflow-y-auto border border-slate-100/50">{shareSummaryText}</div>
              <button onClick={() => { navigator.clipboard.writeText(shareSummaryText); alert("클립보드에 복사되었습니다."); setIsShareModalOpen(false); }} className="w-full bg-pastel-500 hover:bg-pastel-600 text-white py-6 rounded-3xl font-black shadow-xl shadow-pastel-100 transition-all flex items-center justify-center gap-4 active:scale-95">복사하여 전달하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-5xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up border border-white">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white"><h2 className="font-extrabold text-lg tracking-tight">{editingPromoId ? '프로모션 수정' : '프로모션 등록'}</h2><button onClick={() => setIsPromoModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSubmitPromotion} className="p-8 space-y-6">
              <div className="space-y-4">
                <input required type="text" placeholder="프로모션 제목" value={newPromo.title} onChange={e => setNewPromo({...newPromo, title: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-pastel-200" />
                <select value={newPromo.category} onChange={e => setNewPromo({...newPromo, category: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none"><option value="전체">전체</option><option value="인터넷">인터넷</option><option value="B tv">B tv</option><option value="결합">결합</option></select>
                <textarea required rows={3} placeholder="설명" value={newPromo.description} onChange={e => setNewPromo({...newPromo, description: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="date" value={newPromo.startDate} onChange={e => setNewPromo({...newPromo, startDate: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700" />
                  <input required type="date" value={newPromo.endDate} onChange={e => setNewPromo({...newPromo, endDate: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700" />
                </div>
              </div>
              <button type="submit" className="w-full bg-pastel-500 hover:bg-pastel-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-pastel-100 transition-all">{editingPromoId ? '수정 완료' : '등록하기'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
