import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import {
  Target, Zap, CheckCircle2, Copy,
  User, LogOut, Lock, CreditCard,
  Crown, ChevronDown, X, Radar, Users, MessageSquare, ListTodo, Flag,
  ArrowRight, Search, ShieldCheck
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
  const toolRef = useRef<HTMLDivElement>(null);

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

  const scrollToTool = () => toolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
        actionPlan: typeof data.actionPlan === 'object' && data.actionPlan ? data.actionPlan : { today: [], thisWeek: [] },
        connectionRequests: Array.isArray(data.connectionRequests) ? data.connectionRequests : [],
        inboundReplies: Array.isArray(data.inboundReplies) ? data.inboundReplies : [],
        followUpMessages: Array.isArray(data.followUpMessages) ? data.followUpMessages : []
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
        formattedData.connectionRequests = formattedData.connectionRequests.slice(0, 1);
        formattedData.inboundReplies = formattedData.inboundReplies.slice(0, 1);
        formattedData.followUpMessages = formattedData.followUpMessages.slice(0, 1);
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

  const sectionTitle = (eyebrow: string, title: string, icon: React.ReactNode) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-1">
        {icon}
        {eyebrow}
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
    </div>
  );

  const featureCard = (icon: React.ReactNode, title: string, desc: string) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-600">{icon}</div>
      <h4 className="text-base font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  );

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
                  <h2 className="text-3xl font-black text-slate-900 mb-4">Start free. Upgrade when you’re ready.</h2>
                  <p className="text-slate-500 max-w-lg mx-auto font-medium">Pick the level that matches how serious you are about turning LinkedIn profile views into conversations.</p>
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
                  {planCard('starter', 'Free Profile Audit', '$0.99', 'Quick preview access', ['Basic profile audit', 'Missing keyword detection', '1 CTA suggestion', '1 DM preview'], 'light')}
                  {planCard('pro', 'Client Acquisition Report', '$19', 'Main conversion offer', ['Full profile audit', 'Priority fixes', 'Action plan', 'Full CTA suggestions', 'Full DM Conversion Kit'], 'blue')}
                  {planCard('ultra', 'Done-for-You Upgrade', '$149+', 'Hands-on support', ['Manual profile rewrite', 'Custom positioning', 'Personalized DM scripts', 'Conversion-focused optimization'], 'dark')}
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
              </div>
            </div>
          </div>
        )}

        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm shadow-slate-100">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-200"><Target className="w-5 h-5 text-white" /></div>
              <span className="font-bold text-lg tracking-tight text-slate-900">LinkedIn <span className="text-indigo-600">Sniper</span></span>
            </div>
            <div className="flex items-center gap-4 relative" ref={menuRef}>
              <button onClick={() => setShowPricing(true)} className="hidden sm:flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 hover:bg-amber-100 transition-colors">Pricing</button>
              <button onClick={scrollToTool} className="hidden sm:flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors">Get Free Audit</button>
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

        <main>
          <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700 mb-5">
                  <Target className="w-3.5 h-3.5" /> LinkedIn Client Acquisition Optimization
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                  Turn Your LinkedIn Profile Into a <span className="text-indigo-600">Client-Generating Asset</span>
                </h1>
                <p className="mt-5 text-lg text-slate-600 max-w-xl leading-relaxed">
                  Get a profile audit, stronger positioning, better CTA, and DM scripts that help turn profile views into real client conversations.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={scrollToTool} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors">
                    Get Free Profile Audit <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowPricing(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                    See Pricing
                  </button>
                </div>
                <p className="mt-5 text-sm text-slate-500 max-w-xl">
                  Built for founders, freelancers, consultants, and service operators who want LinkedIn to bring opportunities — not just impressions.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">What you get</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <div className="text-xs font-bold text-slate-400 mb-1">Audit</div>
                      <div className="text-sm font-semibold text-slate-800">See what kills profile-to-message conversion</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <div className="text-xs font-bold text-slate-400 mb-1">Fix First</div>
                      <div className="text-sm font-semibold text-slate-800">Know exactly what to fix first</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <div className="text-xs font-bold text-slate-400 mb-1">Positioning</div>
                      <div className="text-sm font-semibold text-slate-800">Turn vague skills into a clear offer</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <div className="text-xs font-bold text-slate-400 mb-1">DM Kit</div>
                      <div className="text-sm font-semibold text-slate-800">Start better conversations without sounding robotic</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 py-20">
            <div className="max-w-3xl mb-10">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Pain + Solution</div>
              <h2 className="text-3xl font-black text-slate-900">Why your LinkedIn profile isn’t bringing clients — and how to fix it</h2>
              <p className="mt-4 text-slate-600 text-lg">LinkedIn-Sniper helps you audit your profile, fix your positioning, improve your CTA, and generate message scripts that feel human.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featureCard(<Search className="w-5 h-5" />, 'You look skilled, but not buyable', 'Your profile says what you do, but not why someone should message you.')}
              {featureCard(<Users className="w-5 h-5" />, 'Your positioning is too vague', 'People visit your profile and still can’t tell who you help or what problem you solve.')}
              {featureCard(<MessageSquare className="w-5 h-5" />, 'Views don’t turn into conversations', 'No CTA, no trust signals, no messaging flow — so profile traffic dies on the page.')}
            </div>
          </section>

          <section className="bg-white border-y border-slate-200">
            <div className="max-w-7xl mx-auto px-4 py-20">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">How it works</div>
                <h2 className="text-3xl font-black text-slate-900">Three steps from profile copy to client conversations</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {featureCard(<Copy className="w-5 h-5" />, 'Paste your LinkedIn profile', 'Drop in your current profile content.')}
                {featureCard(<Radar className="w-5 h-5" />, 'Get your client acquisition audit', 'See conversion issues, missing trust signals, and priority fixes.')}
                {featureCard(<ArrowRight className="w-5 h-5" />, 'Upgrade your profile and conversations', 'Use optimized copy and DM scripts to turn more views into opportunities.')}
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Output Preview</div>
                <h2 className="text-3xl font-black text-slate-900">What you’ll get</h2>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="font-bold text-slate-900">Profile Audit</div><p className="mt-2 text-sm text-slate-600">See what is hurting your profile-to-message conversion.</p></div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="font-bold text-slate-900">Priority Fixes</div><p className="mt-2 text-sm text-slate-600">Know exactly what to fix first.</p></div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="font-bold text-slate-900">Positioning + CTA</div><p className="mt-2 text-sm text-slate-600">Turn vague skills into a clear, client-facing offer.</p></div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="font-bold text-slate-900">DM Conversion Kit</div><p className="mt-2 text-sm text-slate-600">Get connection requests, replies, and follow-ups that sound natural.</p></div>
                </div>
                <p className="mt-6 text-slate-600">This is not just profile polishing. It is built to help move people from profile views to conversations.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Why it’s different</div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Most LinkedIn tools help you write better. LinkedIn-Sniper helps you get messaged.</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <div className="text-sm font-bold text-slate-900 mb-3">Most LinkedIn tools</div>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li>• Rewrite your headline</li>
                      <li>• Rewrite your about section</li>
                      <li>• Suggest keywords</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
                    <div className="text-sm font-bold text-indigo-900 mb-3">LinkedIn-Sniper</div>
                    <ul className="space-y-2 text-sm text-indigo-800">
                      <li>• Audit why your profile doesn’t convert</li>
                      <li>• Sharpen your positioning</li>
                      <li>• Improve CTA</li>
                      <li>• Generate DM scripts</li>
                      <li>• Move views into conversations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border-y border-slate-200">
            <div className="max-w-7xl mx-auto px-4 py-20">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Pricing</div>
                <h2 className="text-3xl font-black text-slate-900">Start free. Upgrade when you’re ready.</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {planCard('starter', 'Free Profile Audit', '$0.99', 'Quick preview access', ['Basic profile audit', 'Missing keyword detection', '1 CTA suggestion', '1 DM preview'], 'light')}
                {planCard('pro', 'Client Acquisition Report', '$19', 'Main conversion offer', ['Full profile audit', 'Priority fixes', 'Action plan', 'Full CTA suggestions', 'Full DM Conversion Kit'], 'blue')}
                {planCard('ultra', 'Done-for-You Upgrade', '$149+', 'Hands-on support', ['Manual profile rewrite', 'Custom positioning', 'Personalized DM scripts', 'Conversion-focused optimization'], 'dark')}
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">FAQ</div>
                <h2 className="text-3xl font-black text-slate-900">Questions before you try it?</h2>
                <div className="mt-8 space-y-4">
                  {[
                    ['Is this for job seekers or client acquisition?', 'It supports both, but it is optimized for client acquisition, positioning, and inbound conversations.'],
                    ['Do I need LinkedIn Premium?', 'No. This focuses on profile positioning, conversion copy, CTA, and message flow.'],
                    ['Is this another AI writing tool?', 'No. It helps diagnose why your profile doesn’t convert, improve positioning, and generate message scripts for better client conversations.'],
                    ['Can I try it for free?', 'Yes. Start with a free audit and upgrade only if you want the full report and message kit.']
                  ].map(([q, a], i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="font-bold text-slate-900">{q}</div>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 mb-4">
                  Final CTA
                </div>
                <h2 className="text-3xl font-black leading-tight">Your LinkedIn profile should bring clients — not just look polished</h2>
                <p className="mt-4 text-white/70 text-lg leading-relaxed">Start with a free audit and see what is stopping your profile from turning views into conversations.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={scrollToTool} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 transition-colors">
                    Get Free Profile Audit <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowPricing(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors">
                    See Pricing
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section ref={toolRef} className="max-w-7xl mx-auto px-4 pb-16">
            <div className="mb-8">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Free Audit Tool</div>
              <h2 className="text-3xl font-black text-slate-900">Run your LinkedIn client audit</h2>
              <p className="mt-3 text-slate-600 max-w-2xl">Paste your current LinkedIn profile, generate the audit, and see exactly what is blocking profile views from turning into client conversations.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-5">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><User className="w-5 h-5" /></div>
                    <div><h2 className="text-lg font-bold text-slate-900">Data Input</h2><p className="text-xs text-slate-500">Paste your LinkedIn profile content</p></div>
                  </div>
                  <textarea className="w-full h-64 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none placeholder:text-slate-400 font-medium" placeholder="Copy your LinkedIn profile and paste it here..." value={profileData} onChange={(e) => setProfileData(e.target.value)} />
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-[200px] relative">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Tone</label>
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
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <button onClick={handleOptimize} disabled={loading || !profileData} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95">
                      {loading ? <Zap className="w-5 h-5 animate-spin" /> : <><Target className="w-5 h-5" /><span>{mode === 'client' ? 'Run Free Audit' : 'Start Job Optimization'}</span></>}
                    </button>
                  </div>
                </section>

                {result && (
                  <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-1">Search Signals</div>
                        <h3 className="text-base font-bold text-slate-900">SEO keywords snapshot</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Visibility lift</div>
                        <div className="text-xl font-black text-emerald-500">{user ? '+42.8%' : '+12.5%'}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {result.seoKeywords?.map((k: string, i: number) => (<span key={i} className="px-3 py-1 rounded-lg text-xs font-semibold border bg-slate-50 border-slate-200 text-slate-700">#{k}</span>))}
                      {!user && <span className="px-3 py-1 rounded-lg text-xs font-bold border border-dashed bg-slate-50 text-slate-400">more locked</span>}
                    </div>
                  </section>
                )}
              </div>

              <div className="lg:col-span-6 space-y-5">
                <HistoryManager token={token || undefined} currentStyle={style} onSelectHistory={(content) => setResult(content)} />
                {result ? (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      {sectionTitle('Audit', 'Profile health check', <Radar className="w-3.5 h-3.5" />)}
                      <div className="mb-5 grid grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Audit Score</div>
                          <div className={`text-3xl font-black ${scoreTone(result.auditScore)}`}>{result.auditScore ?? '--'}<span className="text-base text-slate-400">/100</span></div>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mode</div>
                          <div className="text-sm font-bold text-slate-700">{mode === 'client' ? 'Client Acquisition' : 'Job Hunt'}</div>
                        </div>
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
                        {!user && (
                          <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowPricing(true)}>
                            <p className="text-xs text-slate-500 font-bold">Unlock full audit and conversion strategy</p>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      {sectionTitle('Fix First', 'Highest-impact changes', <Flag className="w-3.5 h-3.5" />)}
                      <div className="space-y-3">
                        {result.priorityFixes?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{i + 1}. {item}</div>)}
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      {sectionTitle('Do Next', 'Action plan', <ListTodo className="w-3.5 h-3.5" />)}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Today</div>
                          <div className="space-y-2">
                            {result.actionPlan?.today?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700">• {item}</div>)}
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">This Week</div>
                          <div className="space-y-2">
                            {result.actionPlan?.thisWeek?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700">• {item}</div>)}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      {sectionTitle('Positioning', 'Offer and audience', <Users className="w-3.5 h-3.5" />)}
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Positioning Statement</div>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">{result.positioningStatement || 'No positioning generated yet.'}</p>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Target Audience</div>
                          <div className="flex flex-wrap gap-2">
                            {result.targetAudience?.map((item: string, i: number) => <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">{item}</span>)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            <MessageSquare className="w-3.5 h-3.5" /> CTA Suggestions
                          </div>
                          <div className="space-y-2">
                            {result.ctaSuggestions?.map((item: string, i: number) => <div key={i} className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">{item}</div>)}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      {sectionTitle('DM Conversion Kit', 'Messages that move the conversation', <MessageSquare className="w-3.5 h-3.5" />)}
                      <div className="space-y-5">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Connection Requests</div>
                          <div className="space-y-3">
                            {result.connectionRequests?.map((item: string, i: number) => (
                              <div key={i} className="group p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all cursor-pointer relative" onClick={() => copyToClipboard(item)}>
                                <p className="text-sm font-medium leading-relaxed text-slate-800 pr-8">{item}</p>
                                <Copy className="w-4 h-4 absolute top-4 right-4 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Inbound Replies</div>
                          <div className="space-y-3">
                            {result.inboundReplies?.map((item: string, i: number) => (
                              <div key={i} className="group p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all cursor-pointer relative" onClick={() => copyToClipboard(item)}>
                                <p className="text-sm font-medium leading-relaxed text-slate-800 pr-8">{item}</p>
                                <Copy className="w-4 h-4 absolute top-4 right-4 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Follow-up Messages</div>
                          <div className="space-y-3">
                            {result.followUpMessages?.map((item: string, i: number) => (
                              <div key={i} className="group p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all cursor-pointer relative" onClick={() => copyToClipboard(item)}>
                                <p className="text-sm font-medium leading-relaxed text-slate-800 pr-8">{item}</p>
                                <Copy className="w-4 h-4 absolute top-4 right-4 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white/50 border border-dashed border-slate-300 rounded-3xl">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mb-4" /><h3 className="text-lg font-bold text-slate-400">Run your first audit to see results here</h3>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
