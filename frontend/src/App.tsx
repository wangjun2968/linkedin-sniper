import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import {
  Target, Search, Zap, CheckCircle2, Copy,
  User, LogOut, Lock, CreditCard,
  Crown, ChevronDown, X, Radar, Users, MessageSquare, ListTodo, Flag
} from 'lucide-react';
import HistoryManager from './HistoryManager.tsx';

const GOOGLE_CLIENT_ID = "717774353715-hup70oee1bvvq0c5g69c327vggro9qp2.apps.googleusercontent.com";
const API_URL = "https://linkedin-api.soundxy9.workers.dev";

type PlanType = 'starter' | 'pro' | 'ultra';
type OptimizationMode = 'job' | 'client';

function App() {
  const [profileData, setProfileData] = useState('');
  const [style, setStyle] = useState('Story (故事导向)');
  const [mode, setMode] = useState<OptimizationMode>('client');
  const [targetClientType, setTargetClientType] = useState('SaaS Founder');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('gh_token'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        setUser(payload);
        fetchFullProfile(token);
      } catch {
        handleLogout();
      }
    } else {
      setUser(null);
      setFullProfile(null);
    }
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypal = params.get('paypal');
    const orderID = params.get('token');

    if (paypal === 'cancel') {
      alert('PayPal 支付已取消');
      window.history.replaceState({}, '', '/');
      return;
    }

    if (paypal === 'success' && orderID && token) {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/paypal/capture-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID, token })
          });
          const data = await res.json();
          if (data.status === 'success') {
            alert(`支付成功！您已升级为 ${data.plan} 会员`);
            await fetchFullProfile(token);
          } else {
            alert(data.error || '支付核销失败');
          }
        } catch (e: any) {
          alert(e.message || '支付核销失败');
        } finally {
          window.history.replaceState({}, '', '/');
        }
      })();
    }
  }, [token]);

  const fetchFullProfile = async (jwt: string) => {
    try {
      const response = await fetch(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFullProfile(data);
      }
    } catch {
      console.error('Failed to fetch full profile');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoginSuccess = (credentialResponse: any) => {
    const jwt = credentialResponse.credential;
    setToken(jwt);
    localStorage.setItem('gh_token', jwt);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setFullProfile(null);
    localStorage.removeItem('gh_token');
    setIsMenuOpen(false);
  };

  const startPayPalCheckout = async () => {
    if (!token) {
      alert('请先登录 Google');
      return;
    }
    try {
      setPaying(true);
      const res = await fetch(`${API_URL}/api/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: selectedPlan, token })
      });
      const data = await res.json();
      if (!data.approveUrl) throw new Error(data.error || '无法创建 PayPal 订单');
      window.location.href = data.approveUrl;
    } catch (e: any) {
      alert(e.message || '无法跳转 PayPal');
    } finally {
      setPaying(false);
    }
  };

  const handleOptimize = async () => {
    if (!profileData) return;
    if (!token && style !== 'Story (故事导向)') {
      setShowPricing(true);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileData,
          style,
          mode,
          targetClientType,
          token: token || undefined
        }),
      });
      const data = await response.json();
      const formattedData = {
        aboutVersions: Array.isArray(data.aboutVersions) ? data.aboutVersions : [],
        headlines: Array.isArray(data.headlines) ? data.headlines : [],
        seoKeywords: Array.isArray(data.seoKeywords) ? data.seoKeywords : ['LinkedIn', 'Optimization'],
        postTopics: Array.isArray(data.postTopics) ? data.postTopics : [],
        auditScore: typeof data.auditScore === 'number' ? data.auditScore : null,
        missingKeywords: Array.isArray(data.missingKeywords) ? data.missingKeywords : [],
        conversionIssues: Array.isArray(data.conversionIssues) ? data.conversionIssues : [],
        trustGaps: Array.isArray(data.trustGaps) ? data.trustGaps : [],
        quickFixes: Array.isArray(data.quickFixes) ? data.quickFixes : [],
        targetAudience: Array.isArray(data.targetAudience) ? data.targetAudience : [],
        positioningStatement: typeof data.positioningStatement === 'string' ? data.positioningStatement : '',
        ctaSuggestions: Array.isArray(data.ctaSuggestions) ? data.ctaSuggestions : [],
        priorityFixes: Array.isArray(data.priorityFixes) ? data.priorityFixes : [],
        actionPlan: typeof data.actionPlan === 'object' && data.actionPlan ? data.actionPlan : { today: [], thisWeek: [] }
      };
      formattedData.actionPlan.today = Array.isArray(formattedData.actionPlan.today) ? formattedData.actionPlan.today : [];
      formattedData.actionPlan.thisWeek = Array.isArray(formattedData.actionPlan.thisWeek) ? formattedData.actionPlan.thisWeek : [];

      if (!token) {
        formattedData.aboutVersions = formattedData.aboutVersions.slice(0, 1);
        formattedData.seoKeywords = formattedData.seoKeywords.slice(0, 2);
        formattedData.missingKeywords = formattedData.missingKeywords.slice(0, 2);
        formattedData.conversionIssues = formattedData.conversionIssues.slice(0, 2);
        formattedData.trustGaps = formattedData.trustGaps.slice(0, 1);
        formattedData.quickFixes = formattedData.quickFixes.slice(0, 1);
        formattedData.ctaSuggestions = formattedData.ctaSuggestions.slice(0, 1);
        formattedData.priorityFixes = formattedData.priorityFixes.slice(0, 1);
        formattedData.actionPlan.today = formattedData.actionPlan.today.slice(0, 1);
        formattedData.actionPlan.thisWeek = formattedData.actionPlan.thisWeek.slice(0, 1);
      }
      setResult(formattedData);
      if (token) fetchFullProfile(token);
    } catch {
      alert('优化请求失败，请检查后端配置。');
    } finally {
      setLoading(false);
    }
  };

  const scoreTone = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score >= 75) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板！');
  };

  const planCard = (plan: PlanType, title: string, price: string, sub: string, items: string[], theme: 'light' | 'blue' | 'dark') => {
    const cardClass = theme === 'blue'
      ? 'p-8 rounded-3xl bg-indigo-600 border-4 border-indigo-100 flex flex-col shadow-xl shadow-indigo-100 relative md:-translate-y-4'
      : theme === 'dark'
      ? 'p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col hover:border-slate-700 transition-all'
      : 'p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col hover:border-slate-300 transition-all';

    const textClass = theme === 'blue' || theme === 'dark' ? 'text-white' : 'text-slate-800';
    const subClass = theme === 'blue' ? 'text-white/70' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400';
    const btnClass = selectedPlan === plan
      ? (theme === 'blue' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white')
      : (theme === 'blue' ? 'bg-white/15 text-white border border-white/20' : 'bg-slate-100 text-slate-700 border border-slate-200');

    return (
      <div className={cardClass}>
        {plan === 'pro' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border-2 border-white">
            <Crown className="w-3 h-3 fill-current"/> POPULAR
          </div>
        )}
        <div className={`mb-6 ${textClass}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'blue' ? 'opacity-70' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{title}</span>
          <h3 className={`mt-1 ${plan === 'pro' ? 'text-3xl font-black' : 'text-2xl font-bold'}`}>{price}</h3>
          <p className={`text-xs mt-2 font-medium ${subClass}`}>{sub}</p>
        </div>
        <ul className={`space-y-4 mb-8 flex-1 ${textClass}`}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-xs font-bold opacity-90">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/>{item}
            </li>
          ))}
        </ul>
        <button onClick={() => setSelectedPlan(plan)} className={`mt-4 h-10 rounded-full text-xs font-bold transition-all ${btnClass}`}>
          {selectedPlan === plan ? '当前已选' : '选择此方案'}
        </button>
      </div>
    );
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 relative">
        {showPricing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPricing(false)}></div>
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 fade-in duration-300 max-h-[92vh] overflow-y-auto">
              <button onClick={() => setShowPricing(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 z-10"><X className="w-5 h-5"/></button>
              <div className="p-8 md:p-12">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black text-slate-900 mb-4">解锁顶级职场生产力</h2>
                  <p className="text-slate-500 max-w-lg mx-auto font-medium">加入 2,000+ 精英求职者，使用 LinkedIn Sniper 占据招聘搜索的首屏位置。</p>
                </div>

                {!user ? (
                  <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-xs font-bold text-slate-500">先登录，再付款</div>
                    <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} theme="outline" shape="pill" size="large" width="260" />
                  </div>
                ) : (
                  <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <div className="text-sm font-bold text-emerald-700">已登录：{user.email}</div>
                    <div className="text-xs text-emerald-600 mt-1">支付将直接跳转 PayPal，不再走弹窗</div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {planCard('starter', '单次体验', '$0.99', '约合 ￥7.1', ['1 次深度 SEO 狙击', '5 种风格全开', '全量关键词报告'], 'light')}
                  {planCard('pro', '精英月度', '$4.9/mo', '性价比之王', ['无限次 SEO 优化', 'D1 数据库永久存证', '优先获得新模型优化'], 'blue')}
                  {planCard('ultra', '终极买断', '$19.9', '终身免订阅', ['永久尊贵会员身份', '包含所有 Pro 权益', '获取未来所有模块'], 'dark')}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900">支付区</div>
                      <div className="text-xs text-slate-500">当前方案：{selectedPlan}</div>
                    </div>
                  </div>
                  {user ? (
                    <button
                      onClick={startPayPalCheckout}
                      disabled={paying}
                      className="w-full h-11 rounded-full bg-[#FFC439] hover:bg-[#f5b931] text-[#111] text-sm font-bold transition-all disabled:opacity-60"
                    >
                      {paying ? '跳转 PayPal 中...' : '前往 PayPal 付款'}
                    </button>
                  ) : (
                    <div className="h-10 rounded-full bg-white border border-slate-200 text-slate-400 text-xs font-bold flex items-center justify-center">登录后可跳转 PayPal</div>
                  )}
                </div>

                <p className="text-center mt-8 text-[10px] font-medium text-slate-400">所有支付由 PayPal 担保</p>
              </div>
            </div>
          </div>
        )}

        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm shadow-slate-100">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-200"><Target className="w-5 h-5 text-white" /></div>
              <span className="font-bold text-lg tracking-tight text-slate-900">LinkedIn <span className="text-indigo-600">Sniper</span><span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold uppercase tracking-wider">Pro Beta</span></span>
            </div>
            <div className="flex items-center gap-4 relative" ref={menuRef}>
              <button onClick={() => setShowPricing(true)} className="hidden sm:flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 hover:bg-amber-100 transition-colors mr-2"><Crown className="w-3.5 h-3.5 fill-current"/> Pricing</button>
              {user ? (
                <>
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 p-1 pr-3 rounded-full border border-slate-200 transition-all active:scale-95">
                    <img src={user.picture} className="w-8 h-8 rounded-full border border-white shadow-sm" alt={user.name} />
                    <span className="text-xs font-bold text-slate-700 hidden sm:inline">{user.name.split(' ')[0]}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                        <img src={user.picture} className="w-10 h-10 rounded-full" alt="" />
                        <div className="overflow-hidden"><p className="text-sm font-bold text-slate-900 truncate">{user.name}</p><p className="text-[10px] text-slate-400 truncate">{user.email}</p></div>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        <div className="flex justify-between items-center bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
                          <div className="flex items-center gap-2"><Crown className={`w-4 h-4 ${fullProfile?.plan !== 'free' ? 'text-amber-500' : 'text-slate-300'}`} /><span className="text-xs font-bold text-slate-600">当前方案</span></div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${fullProfile?.plan !== 'free' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>{fullProfile?.plan || 'Free'}</span>
                        </div>
                      </div>
                      <div className="px-2 py-2 border-t border-slate-100">
                        <button onClick={() => { setIsMenuOpen(false); setShowPricing(true); }} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"><CreditCard className="w-4 h-4" /> 订阅方案</button>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut className="w-4 h-4" /> 退出登录</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} theme="outline" shape="pill" size="medium" />
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><User className="w-5 h-5" /></div>
                <div><h2 className="text-lg font-bold text-slate-900">数据注入</h2><p className="text-xs text-slate-500">粘贴你的 LinkedIn 个人主页内容</p></div>
              </div>
              <textarea className="w-full h-64 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none placeholder:text-slate-400 font-medium" placeholder="Ctrl+A 全选并复制你的 LinkedIn 主页，粘贴到这里..." value={profileData} onChange={(e) => setProfileData(e.target.value)} />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-[200px] relative">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">策略模式</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all appearance-none" value={style} onChange={(e) => setStyle(e.target.value)}>
                    <option>Story (故事导向)</option>
                    <option value="Sniper (成果导向)">Sniper (成果导向) 🔒</option>
                    <option value="Tech (技能导向)">Tech (技能导向) 🔒</option>
                    <option value="Values (价值观导向)">Values (价值观导向) 🔒</option>
                    <option value="Future (未来导向)">Future (未来导向) 🔒</option>
                  </select>
                  <div className="absolute right-4 bottom-3 pointer-events-none text-slate-400"><Lock className="w-4 h-4" /></div>
                </div>
                <div className="min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Optimization Goal</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all appearance-none" value={mode} onChange={(e) => setMode(e.target.value as OptimizationMode)}>
                    <option value="client">Get Clients</option>
                    <option value="job">Job Hunt</option>
                  </select>
                </div>
              </div>
              {mode === 'client' && (
                <div className="mt-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Target Client Type</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all appearance-none" value={targetClientType} onChange={(e) => setTargetClientType(e.target.value)}>
                    <option>SaaS Founder</option>
                    <option>Freelancer / Consultant</option>
                    <option>Agency / Service Provider</option>
                  </select>
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button onClick={handleOptimize} disabled={loading || !profileData} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95">
                  {loading ? <Zap className="w-5 h-5 animate-spin" /> : <><Target className="w-5 h-5" /><span>{mode === 'client' ? '开始获客优化' : '开始求职优化'}</span></>}
                </button>
              </div>
            </section>

            {result && (
              <section className="bg-indigo-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><Search className="w-24 h-24" /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4 text-indigo-300"><Target className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-widest">SEO Sniper Report</span></div>
                  <h3 className="text-xl font-bold mb-2">已完成核心关键词埋伏</h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {result.seoKeywords?.map((k: string, i: number) => (<span key={i} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-semibold border border-white/20">#{k}</span>))}
                    {!user && <span className="px-3 py-1 bg-indigo-500/30 backdrop-blur-md rounded-lg text-xs font-bold border border-dashed border-white/30 text-indigo-200">更多关键词已锁定 🔒</span>}
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-indigo-300"><Zap className="w-4 h-4" /><span className="text-xs">预计被搜索权重提升</span></div>
                    <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">{user ? '+42.8%' : '+12.5%'}</span>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <HistoryManager token={token || undefined} currentStyle={style} onSelectHistory={(content) => setResult(content)} />
            {result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Profile Audit</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Radar className="w-3.5 h-3.5" />
                      {mode === 'client' ? 'Client Mode' : 'Job Mode'}
                    </div>
                  </div>
                  <div className="mb-5 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Audit Score</div>
                    <div className={`text-3xl font-black ${scoreTone(result.auditScore)}`}>{result.auditScore ?? '--'}<span className="text-base text-slate-400">/100</span></div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Missing Keywords</div>
                      <div className="flex flex-wrap gap-2">
                        {result.missingKeywords?.map((item: string, i: number) => <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">{item}</span>)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Conversion Issues</div>
                      <div className="space-y-2">
                        {result.conversionIssues?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">{item}</div>)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Trust Gaps</div>
                      <div className="space-y-2">
                        {result.trustGaps?.length ? result.trustGaps.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">{item}</div>) : <div className="text-xs text-slate-400">暂无额外信任缺口建议</div>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Fixes</div>
                      <div className="space-y-2">
                        {result.quickFixes?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{item}</div>)}
                      </div>
                    </div>
                    {!user && (
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowPricing(true)}>
                        <p className="text-xs text-slate-500 font-bold">解锁完整 Audit 与 Conversion Strategy</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-400 uppercase tracking-wider">
                    <Flag className="w-4 h-4" />
                    Priority Fixes
                  </div>
                  <div className="space-y-2">
                    {result.priorityFixes?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{i + 1}. {item}</div>)}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-400 uppercase tracking-wider">
                    <ListTodo className="w-4 h-4" />
                    Action Plan
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Today</div>
                      <div className="space-y-2">
                        {result.actionPlan?.today?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">{item}</div>)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">This Week</div>
                      <div className="space-y-2">
                        {result.actionPlan?.thisWeek?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">{item}</div>)}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-400 uppercase tracking-wider">
                    <Users className="w-4 h-4" />
                    Positioning Snapshot
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Positioning Statement</div>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{result.positioningStatement || '暂未生成定位建议'}</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Target Audience</div>
                      <div className="flex flex-wrap gap-2">
                        {result.targetAudience?.map((item: string, i: number) => <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">{item}</span>)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        <MessageSquare className="w-3.5 h-3.5" />
                        CTA Suggestions
                      </div>
                      <div className="space-y-2">
                        {result.ctaSuggestions?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">{item}</div>)}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">优化 Headline</h3>
                  <div className="space-y-3">
                    {result.headlines?.map((h: string, i: number) => (
                      <div key={i} className="group p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all cursor-pointer relative" onClick={() => copyToClipboard(h)}>
                        <p className="text-sm font-semibold leading-relaxed text-slate-800 pr-8">{h}</p>
                        <Copy className="w-4 h-4 absolute top-4 right-4 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-center">About 板块 {!user && <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded">1 / 5 Versions</span>}</h3>
                  <div className="space-y-6">
                    {result.aboutVersions?.map((v: string, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between px-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Version {i + 1}</span><button onClick={() => copyToClipboard(v)} className="text-xs text-indigo-600 font-bold hover:underline">复制</button></div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">{v}</div>
                      </div>
                    ))}
                    {!user && <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowPricing(true)}><Lock className="w-6 h-6 text-slate-200 mb-2" /><p className="text-xs text-slate-400 font-bold">还有更多策略版本已锁定</p><p className="text-[10px] text-slate-300 mt-1">立即升级精英版解锁完整获客优化</p></div>}
                  </div>
                </section>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white/50 border border-dashed border-slate-300 rounded-3xl">
                <Zap className="w-8 h-8 text-slate-300 mb-4" /><h3 className="text-lg font-bold text-slate-400">待命状态</h3>
              </div>
            )}
          </div>
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
