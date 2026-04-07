import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { 
  Target, Search, Zap, CheckCircle2, Copy, History as HistoryIcon, 
  User, LogOut, ArrowRight, ShieldCheck, Lock, CreditCard, 
  Settings, Crown, ChevronDown, Activity
} from 'lucide-react';
import HistoryManager from './HistoryManager.tsx';

const GOOGLE_CLIENT_ID = "717774353715-hup70oee1bvvq0c5g69c327vggro9qp2.apps.googleusercontent.com";
const API_URL = "https://linkedin-api.soundxy9.workers.dev";

function App() {
  const [profileData, setProfileData] = useState('');
  const [style, setStyle] = useState('Story (故事导向)');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('gh_token'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 1. JWT 解析基础信息
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        setUser(payload);
        fetchFullProfile(token);
      } catch (e) {
        handleLogout();
      }
    }
  }, [token]);

  // 2. 从后端 D1 获取完整的用户体系数据 (Plan/Credits)
  const fetchFullProfile = async (jwt: string) => {
    try {
      const response = await fetch(`${API_URL}/user/me`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFullProfile(data);
      }
    } catch (e) {
      console.error("Failed to fetch full profile");
    }
  };

  // 监听点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleOptimize = async () => {
    if (!profileData) return;
    
    const isProPlan = fullProfile?.plan === 'pro' || fullProfile?.plan === 'lifetime';
    if (!token && style !== 'Story (故事导向)') {
      alert("🔒 该模式为精英狙击手专属，请先登录解锁！");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData, style, token: token || undefined }),
      });
      const data = await response.json();
      
      const formattedData = {
        aboutVersions: Array.isArray(data.aboutVersions) ? data.aboutVersions : [],
        headlines: Array.isArray(data.headlines) ? data.headlines : [],
        seoKeywords: Array.isArray(data.seoKeywords) ? data.seoKeywords : ["LinkedIn", "Optimization"],
        postTopics: Array.isArray(data.postTopics) ? data.postTopics : []
      };

      if (!token) {
        formattedData.aboutVersions = formattedData.aboutVersions.slice(0, 1);
        formattedData.seoKeywords = formattedData.seoKeywords.slice(0, 2);
      }
      
      setResult(formattedData);
      // 优化完刷新下个人数据（可能扣了点数）
      if (token) fetchFullProfile(token);
    } catch (e) {
      alert("优化请求失败，请检查后端配置。");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("已复制到剪贴板！");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm shadow-slate-100">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-200">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                LinkedIn <span className="text-indigo-600">Sniper</span>
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold uppercase">Pro Beta</span>
              </span>
            </div>

            <div className="flex items-center gap-4 relative" ref={menuRef}>
              {user ? (
                <>
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 p-1 pr-3 rounded-full border border-slate-200 transition-all active:scale-95"
                  >
                    <img src={user.picture} className="w-8 h-8 rounded-full border border-white" alt={user.name} />
                    <span className="text-xs font-bold text-slate-700 hidden sm:inline">{user.name.split(' ')[0]}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 个人中心下拉面板 */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                        <img src={user.picture} className="w-10 h-10 rounded-full" alt="" />
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="px-4 py-3 space-y-3">
                        <div className="flex justify-between items-center bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
                          <div className="flex items-center gap-2">
                            <Crown className={`w-4 h-4 ${fullProfile?.plan !== 'free' ? 'text-amber-500' : 'text-slate-300'}`} />
                            <span className="text-xs font-bold text-slate-600">当前方案</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${fullProfile?.plan !== 'free' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                            {fullProfile?.plan || 'Free'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center px-2">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs font-medium">剩余狙击次数</span>
                          </div>
                          <span className="text-sm font-black text-indigo-600">{fullProfile?.credits ?? 0}</span>
                        </div>
                      </div>

                      <div className="px-2 py-2 border-t border-slate-100">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                          <Settings className="w-4 h-4" /> 账户设置
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> 退出登录
                        </button>
                      </div>
                      
                      {fullProfile?.plan === 'free' && (
                        <div className="px-3 pb-2">
                          <button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                            <Zap className="w-3 h-3 fill-current" />
                            升级精英方案 ($4.9)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} useOneTap theme="outline" shape="pill" size="medium" />
              )}
            </div>
          </div>
        </header>

        {!user && (
          <div className="bg-indigo-600 text-white text-center py-2 px-4 text-xs font-bold tracking-wide flex items-center justify-center gap-2 animate-pulse">
            <Zap className="w-3 h-3 fill-current" />
            限时福利：立即登录，免费解锁 [成果导向] 模式与全量 SEO 报告！
          </div>
        )}

        <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><User className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">数据注入</h2>
                  <p className="text-xs text-slate-500">粘贴你的 LinkedIn 个人主页内容</p>
                </div>
              </div>
              <textarea 
                className="w-full h-64 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none placeholder:text-slate-400 font-medium"
                placeholder="Ctrl+A 全选并复制你的 LinkedIn 主页，粘贴到这里..."
                value={profileData}
                onChange={(e) => setProfileData(e.target.value)}
              />
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px] relative">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">策略模式</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                  >
                    <option>Story (故事导向)</option>
                    <option value="Sniper (成果导向)">Sniper (成果导向) 🔒</option>
                    <option value="Tech (技能导向)">Tech (技能导向) 🔒</option>
                    <option value="Values (价值观导向)">Values (价值观导向) 🔒</option>
                    <option value="Future (未来导向)">Future (未来导向) 🔒</option>
                  </select>
                  <div className="absolute right-4 bottom-3 pointer-events-none text-slate-400"><Lock className="w-4 h-4" /></div>
                </div>
                <button onClick={handleOptimize} disabled={loading || !profileData} className="flex-[0.5] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95">
                  {loading ? <Zap className="w-5 h-5 animate-spin" /> : <><Target className="w-5 h-5" /><span>狙击优化</span></>}
                </button>
              </div>
            </section>

            {result && (
              <section className="bg-indigo-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><Search className="w-24 h-24" /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4 text-indigo-300">
                    <Target className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-widest">SEO Sniper Report</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">已完成核心关键词埋伏</h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {result.seoKeywords?.map((k: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-semibold border border-white/20">#{k}</span>
                    ))}
                    {!user && <span className="px-3 py-1 bg-indigo-500/30 backdrop-blur-md rounded-lg text-xs font-bold border border-dashed border-white/30 text-indigo-200">+3 more locked 🔒</span>}
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-indigo-300"><Zap className="w-4 h-4" /><span className="text-xs">预计被搜索权重提升</span></div>
                    <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">{user ? "+42.8%" : "+12.5%"}</span>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <HistoryManager token={token || undefined} currentStyle={style} onSelectHistory={(content) => setResult(content)} />
            {result ? (
              <div className="space-y-6">
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
                    {!user && <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center"><Lock className="w-6 h-6 text-slate-200 mb-2" /><p className="text-xs text-slate-400 font-bold">还有 4 个版本已锁定</p></div>}
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
