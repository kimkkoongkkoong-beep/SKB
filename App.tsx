
import React, { useState, useMemo, useEffect } from 'react';
// Firebase SDK 표준 임포트
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  QuerySnapshot,
  DocumentData,
  FirestoreError,
  QueryDocumentSnapshot,
  CollectionReference
} from "firebase/firestore";

import { 
  INTERNET_PLANS, 
  INTERNET_ADD_ONS,
  TV_PLANS, 
  STB_OPTIONS, 
  MOBILE_COMBINATION_DISCOUNTS 
} from './constants';
import { SelectionState } from './types';

// ==========================================================
// Firebase 설정 (사용자 제공 설정)
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyAKi2cV9hG2TBhRbsO9gx4xQ0DxxUnF_8o",
  authDomain: "skbb-4ec15.firebaseapp.com",
  projectId: "skbb-4ec15",
  storageBucket: "skbb-4ec15.firebasestorage.app",
  messagingSenderId: "902628972456",
  appId: "1:902628972456:web:8466535c4554feabaf6f9d"
};

// Firebase 초기화
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";
const app = isConfigValid ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

interface Promotion {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  longDescription: string;
  badge: string;
  type: string;
  benefits: string[];
  terms: string[];
  createdAt?: any;
}

const INITIAL_PROMOTIONS = [
  {
    title: "봄 맞이 인터넷+TV 결합 사은품 증정 프로모션",
    startDate: "2024-03-01",
    endDate: "2025-04-30",
    description: "신규 가입 고객 대상 백화점 상품권 또는 최신 가전 증정. 상담 시 '봄맞이 사은품' 확인 필수!",
    longDescription: "따뜻한 봄을 맞아 SK브로드밴드에서 준비한 특별한 선물! 인터넷과 B tv를 동시에 신규 가입하시는 모든 고객님께 역대급 사은품 혜택을 드립니다.",
    badge: "HOT",
    type: "사은품",
    benefits: ["신세계/신한/롯데 백화점 상품권 최대 45만원권 증정", "또는 삼성/LG 최신 가전 (건조기, 공기청정기 등) 지원", "인터넷 500M 이상 가입 시 추가 할인 혜택"],
    terms: ["3년 약정 가입 고객에 한함", "가입 후 1년 이내 해지 시 사은품 반환금이 발생할 수 있음", "타 프로모션과 중복 적용이 제한될 수 있음"]
  },
  {
    title: "B tv All+ 업그레이드 요금 할인",
    startDate: "2024-02-15",
    endDate: "2025-05-31",
    description: "All 요금제 가격으로 All+ 시청 가능한 한정 프로모션. 3년 약정 시 적용 가능합니다.",
    longDescription: "콘텐츠의 끝판왕 All+ 요금제를 더 가볍게 즐기세요. 258개 전 채널 시청은 물론, 인기 VOD까지 무제한으로 감상할 수 있는 기회입니다.",
    badge: "EVENT",
    type: "요금할인",
    benefits: ["B tv All+ 요금제 월 5,500원 즉시 할인", "매월 최신 영화 유료 VOD 1편 무료 쿠폰 증정", "AI 셋톱박스 임대료 추가 할인 적용"],
    terms: ["B tv All+ 신규 가입 또는 업그레이드 고객 대상", "중도 요금제 하향 시 할인 혜택이 중단됨", "결합 할인과 별도로 추가 중복 적용 가능"]
  }
];

const CATV_TV_PLANS = [
  { id: 'pop_100', name: 'B tv pop 100', price: 7700, channels: 100, description: '가성비 중심의 실속 케이블 방송' },
  { id: 'pop_180', name: 'B tv pop 180', price: 7700, channels: 180, description: '다양한 채널을 즐기는 합리적 선택' },
  { id: 'pop_230', name: 'B tv pop 230', price: 9900, channels: 230, description: '전 채널을 시청하는 프리미엄 케이블' },
];

const CATV_STB_OPTIONS = [
  { id: 'stb_smart3_pop', name: 'Smart 3_POP', price: 2200, description: 'pop 전용 스마트 톱박스' },
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
  const [currentView, setCurrentView] = useState<'calculator' | 'promotions'>('calculator');
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  
  const [firebaseStatus, setFirebaseStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [firebaseErrorMessage, setFirebaseErrorMessage] = useState<string>('');

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isPromoFormOpen, setIsPromoFormOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // Firestore 실시간 동기화
  useEffect(() => {
    if (!db) {
      setFirebaseStatus('error');
      setFirebaseErrorMessage('Firebase Config가 올바르지 않습니다.');
      return;
    }

    setFirebaseStatus('connecting');
    const promosRef = collection(db, "promotions") as CollectionReference<DocumentData>;
    const q = query(promosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      setFirebaseStatus('connected');
      if (snapshot.empty) {
        // 데이터가 아예 없을 때만 초기 데이터 생성
        INITIAL_PROMOTIONS.forEach(async (item) => {
          try {
            await addDoc(promosRef, { ...item, createdAt: serverTimestamp() });
          } catch (e) {
            console.error("Initial Seeding Error:", e);
          }
        });
      } else {
        const promoData = snapshot.docs.map((docItem: QueryDocumentSnapshot<DocumentData>) => ({
          id: docItem.id,
          ...(docItem.data() as Omit<Promotion, 'id'>)
        })) as Promotion[];
        setPromotions(promoData);
      }
    }, (error: FirestoreError) => {
      console.error("Firestore Sync Error:", error);
      setFirebaseStatus('error');
      // 권한 에러인 경우 더 명확한 가이드 제공
      if (error.code === 'permission-denied') {
        setFirebaseErrorMessage('Firebase 보안 규칙 설정이 필요합니다 (권한 거부됨)');
      } else {
        setFirebaseErrorMessage(error.message);
      }
    });

    return () => unsubscribe();
  }, []);

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

    const totalPrepaid = (selections.prepaidInternet || 0) + (selections.prepaidTv1 || 0) + (selections.prepaidTv2 || 0);
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
      if (hasTv && tvType !== 'CATV') breakdown.mobile += (MOBILE_COMBINATION_DISCOUNTS.TV || 1100);
      if (internet) breakdown.mobile += (MOBILE_COMBINATION_DISCOUNTS.INTERNET as any)[internet.id] || 0;
    }

    return { 
      totalPrice: Math.max(0, base - breakdown.bundle - breakdown.mobile - breakdown.prepaid - breakdown.stb - breakdown.family), 
      discountBreakdown: breakdown,
      isTvSelected: hasTv,
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

    return `[SKB 업셀 내역서]
타입: ${tvType}
인터넷: ${internet?.name} (${internet?.speed})
TV 1: ${tv1 ? `${tv1.name} (${stb?.name})` : '없음'}
부가서비스: ${currentAddOns.length > 0 ? currentAddOns.join(', ') : '없음'}
결합상태: ${selections.isFamilyPlan ? '패밀리결합' : selections.mobileLineCount > 0 ? '휴대폰결합' : '기본결합'}
선납권 적용: ${discountBreakdown.prepaid.toLocaleString()}원

▶ 월 예상 납부액: ${totalPrice.toLocaleString()}원
▶ 선납권 추천: ${recommendedPrepaid.toLocaleString()}원`;
  }, [selections, tvType, currentAddOns, totalPrice, recommendedPrepaid, discountBreakdown]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareSummaryText);
    alert('설계 내역이 복사되었습니다.');
    setIsShareModalOpen(false);
  };

  const isBothAddOnsSelected = useMemo(() => {
    return selections.addOnIds.includes('addon_wings') && selections.addOnIds.includes('addon_relief');
  }, [selections.addOnIds]);

  const filteredPromotions = useMemo(() => {
    if (!promoSearchQuery.trim()) return promotions;
    const query = promoSearchQuery.toLowerCase();
    return promotions.filter(p => 
      p.title.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query) ||
      p.type.toLowerCase().includes(query)
    );
  }, [promoSearchQuery, promotions]);

  const selectedPromotion = useMemo(() => {
    return promotions.find(p => p.id === selectedPromoId);
  }, [selectedPromoId, promotions]);

  const handleDeletePromo = async (id: string) => {
    if (window.confirm('이 프로모션을 클라우드에서 완전히 삭제하시겠습니까? 다른 PC에서도 삭제됩니다.')) {
      try {
        if (db) {
          await deleteDoc(doc(db, "promotions", id));
          if (selectedPromoId === id) setSelectedPromoId(null);
          alert("삭제가 완료되었습니다.");
        }
      } catch (e) {
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleSavePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || isSaving) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const benefitsStr = formData.get('benefits') as string;
    const termsStr = formData.get('terms') as string;

    const promoData = {
      title: formData.get('title') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      type: formData.get('type') as string,
      badge: formData.get('badge') as string,
      description: formData.get('description') as string,
      longDescription: formData.get('longDescription') as string,
      benefits: benefitsStr.split('\n').filter(s => s.trim() !== ''),
      terms: termsStr.split('\n').filter(s => s.trim() !== ''),
      createdAt: editingPromo ? editingPromo.createdAt : serverTimestamp()
    };

    try {
      if (editingPromo) {
        await updateDoc(doc(db, "promotions", editingPromo.id), promoData);
      } else {
        await addDoc(collection(db, "promotions"), promoData);
      }
      setIsPromoFormOpen(false);
      setEditingPromo(null);
      alert("클라우드 서버에 저장이 완료되었습니다! 이제 다른 PC에서도 확인 가능합니다.");
    } catch (e: any) {
      console.error("Save Error:", e);
      if (e.code === 'permission-denied') {
        alert("Firebase 보안 규칙에 의해 쓰기 작업이 거부되었습니다. Firebase Console에서 규칙을 확인해주세요.");
      } else {
        alert("저장 중 오류가 발생했습니다: " + e.message);
      }
    } finally {
      setIsSaving(false);
    }
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-600 rounded flex items-center justify-center shadow-sm"><span className="text-white font-black text-xs">SK</span></div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 hidden md:block">SKB업셀 계산기</h1>
            </div>
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => { setCurrentView('calculator'); setSelectedPromoId(null); }} 
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${currentView === 'calculator' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                요금 계산기
              </button>
              <button 
                onClick={() => { setCurrentView('promotions'); setSelectedPromoId(null); }} 
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${currentView === 'promotions' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                프로모션 게시판
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-colors border ${
              firebaseStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              firebaseStatus === 'connecting' ? 'bg-amber-50 text-amber-600 border-amber-100' :
              'bg-red-50 text-red-600 border-red-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                firebaseStatus === 'connected' ? 'bg-emerald-500' :
                firebaseStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-red-500'
              }`}></span>
              {firebaseStatus === 'connected' ? 'Cloud Connected' : firebaseStatus === 'connecting' ? 'Connecting...' : 'Connection Error'}
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">Logout</button>
          </div>
        </div>
      </header>

      {firebaseStatus === 'error' && (
        <div className="bg-red-600 text-white text-[10px] font-bold py-2 text-center animate-fade-in px-4">
          Cloud Error: {firebaseErrorMessage} (Firebase 콘솔의 보안 규칙 설정 확인 필요)
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 pt-8">
        {currentView === 'calculator' ? (
          <div className="space-y-12 animate-fade-in">
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

            <section>
              <SectionHeader title="인터넷 부가서비스" step="1-1" />
              {isBothAddOnsSelected && (
                <div className="mb-4 p-4 bg-violet-50 rounded-xl border border-violet-100 flex items-center gap-3 animate-fade-in">
                  <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">!</div>
                  <p className="text-xs font-bold text-violet-700">윙즈 + 안심서비스 동시 선택 시 윙즈 요금이 1,100원으로 할인됩니다.</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTERNET_ADD_ONS.map((addon) => (
                  <PlanCard key={addon.id} selected={selections.addOnIds.includes(addon.id)} onClick={() => toggleAddOn(addon.id)} title={addon.name} price={addon.id === 'addon_wings' && isBothAddOnsSelected ? 1100 : addon.price} description={addon.description}/>
                ))}
              </div>
            </section>

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

            <section className="pb-10">
              <SectionHeader title="선납권 할인" step={4} />
              <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">i</div>
                <p className="text-xs font-bold text-indigo-700">-8,800원 선납권은 골든대구만 사용가능합니다.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
                {['prepaidInternet', 'prepaidTv1', 'prepaidTv2'].map((key, idx) => (
                  <div key={key} className="space-y-4">
                    <label className="block font-bold text-slate-700 text-sm">{idx === 0 ? '인터넷' : `B tv ${idx}`} 선납권</label>
                    <select value={(selections as any)[key]} onChange={(e) => setSelections(prev => ({ ...prev, [key]: Number(e.target.value) }))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-violet-500 cursor-pointer">
                      <option value={0}>할인 없음</option>
                      {Array.from({ length: 8 }, (_, i) => (i + 1) * 1100).map(val => (
                        <option key={val} value={val}>-{val.toLocaleString()}원 {val === 8800 ? '(골든대구)' : ''}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : selectedPromoId && selectedPromotion ? (
          /* 프로모션 상세 페이지 */
          <div className="animate-fade-in space-y-8 pb-32">
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => setSelectedPromoId(null)}
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-500 hover:text-violet-600 hover:border-violet-200 transition-all active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">상세 정보</h2>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-6 right-6 flex gap-2 z-10">
                <button onClick={() => { setEditingPromo(selectedPromotion); setIsPromoFormOpen(true); }} className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-3 rounded-2xl border border-white/30 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button onClick={() => handleDeletePromo(selectedPromotion.id)} className="bg-white/20 hover:bg-red-500 backdrop-blur-md text-white p-3 rounded-2xl border border-white/30 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-10 md:p-16 text-white relative">
                <div className="max-w-2xl">
                  <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/30 mb-6">
                    {selectedPromotion.type}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black mb-6 leading-tight">{selectedPromotion.title}</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 text-sm font-bold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      {selectedPromotion.startDate.replace(/-/g, '.')} ~ {selectedPromotion.endDate.replace(/-/g, '.')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-10 md:p-16 space-y-12">
                <section>
                  <h4 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><span className="w-2 h-6 bg-violet-600 rounded-full"></span>프로모션 소개</h4>
                  <p className="text-slate-600 leading-relaxed font-medium text-lg">{selectedPromotion.longDescription}</p>
                </section>
                <div className="pt-8 border-t border-slate-100 flex justify-center">
                  <button onClick={() => setSelectedPromoId(null)} className="bg-slate-900 hover:bg-black text-white px-12 py-4 rounded-2xl font-black text-lg">목록으로 돌아가기</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 프로모션 목록 페이지 */
          <div className="animate-fade-in space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
              <div className="max-w-xl">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">프로모션 게시판</h2>
                <p className="text-slate-500 mt-2 font-medium">현재 진행 중인 SK브로드밴드 주요 프로모션 정보를 확인하세요.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <button onClick={() => { setEditingPromo(null); setIsPromoFormOpen(true); }} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg shadow-violet-100 flex items-center gap-2 whitespace-nowrap active:scale-95">
                  새 프로모션 등록
                </button>
                <input 
                  type="text" 
                  placeholder="프로모션 제목이나 혜택 검색" 
                  value={promoSearchQuery}
                  onChange={(e) => setPromoSearchQuery(e.target.value)}
                  className="block w-full md:w-80 px-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 text-sm focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>
            </div>
            {firebaseStatus === 'connecting' ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold animate-pulse">클라우드 데이터 불러오는 중...</p>
              </div>
            ) : filteredPromotions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPromotions.map((promo) => (
                  <div key={promo.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all">
                    <div className="p-8 flex-grow">
                      <div className="flex items-center justify-between mb-4">
                        <span className="bg-violet-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{promo.type}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{promo.title}</h3>
                      
                      {/* 이벤트 기간 표시 추가 */}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-4">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <span>{promo.startDate.replace(/-/g, '.')} ~ {promo.endDate.replace(/-/g, '.')}</span>
                      </div>

                      <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-2">{promo.description}</p>
                    </div>
                    <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex items-center justify-between">
                      <button onClick={() => { setEditingPromo(promo); setIsPromoFormOpen(true); }} className="text-[10px] font-black text-slate-400 hover:text-violet-600">Edit</button>
                      <button onClick={() => setSelectedPromoId(promo.id)} className="text-[11px] font-black text-violet-600 border-2 border-violet-100 px-4 py-1.5 rounded-xl transition-all hover:bg-violet-600 hover:text-white hover:border-violet-600 active:scale-95">Details</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100">
                <h4 className="text-xl font-black text-slate-800 mb-2">게시물이 없습니다</h4>
                <p className="text-slate-400 font-medium">새로운 프로모션을 가장 먼저 등록해보세요.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {isPromoFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsPromoFormOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="bg-violet-600 p-8 flex justify-between items-center flex-shrink-0 text-white">
              <h3 className="font-black text-xl">{editingPromo ? '프로모션 수정' : '새 프로모션 등록'}</h3>
              <button disabled={isSaving} onClick={() => setIsPromoFormOpen(false)} className="text-white/60 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <form onSubmit={handleSavePromo} className="p-8 space-y-6 overflow-y-auto">
              <input required name="title" defaultValue={editingPromo?.title} placeholder="제목 (필수)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none"/>
              <input required name="type" defaultValue={editingPromo?.type} placeholder="유형 (예: 사은품, 요금할인)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none"/>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">시작일</label>
                  <input required type="date" name="startDate" defaultValue={editingPromo?.startDate} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1">종료일</label>
                  <input required type="date" name="endDate" defaultValue={editingPromo?.endDate} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none"/>
                </div>
              </div>
              <textarea required name="longDescription" defaultValue={editingPromo?.longDescription} placeholder="상세 설명 (필수)" rows={3} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold resize-none focus:border-violet-500 outline-none"/>
              <button 
                type="submit" 
                disabled={isSaving}
                className={`w-full bg-violet-600 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-violet-700'}`}
              >
                {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {editingPromo ? '수정사항 저장하기' : '클라우드에 등록하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {currentView === 'calculator' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-xl z-40 backdrop-blur-md bg-white/95">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1 w-full md:w-auto">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{INTERNET_PLANS.find(p => p.id === selections.internetId)?.name}</span>
                  {selections.isFamilyPlan && <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded font-bold">패밀리</span>}
                  <span className="bg-violet-600 text-white px-2 py-0.5 rounded font-black text-[10px] uppercase">{tvType}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end">
                <div className="flex flex-col items-end pl-6">
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">월 예상 납부액</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-violet-600 tracking-tighter">{totalPrice.toLocaleString()}</span>
                    <span className="text-xl font-bold text-slate-900">원</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="bg-violet-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
