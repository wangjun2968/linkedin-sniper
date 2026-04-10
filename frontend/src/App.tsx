import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import {
  Target,
  Zap,
  CheckCircle2,
  Copy,
  User,
  LogOut,
  Lock,
  CreditCard,
  Crown,
  ChevronDown,
  X,
  Radar,
  Users,
  MessageSquare,
  ListTodo,
  Flag,
  ArrowRight,
  ShieldCheck,
  Menu,
  X as CloseIcon,
  Sparkles,
  HelpCircle,
  Layers,
} from 'lucide-react';
import HistoryManager from './HistoryManager.tsx';

const GOOGLE_CLIENT_ID = '717774353715-hup70oee1bvvq0c5g69c327vggro9qp2.apps.googleusercontent.com';
const API_URL = 'https://linkedin-api-sandbox.soundxy9.workers.dev';

type PlanType = 'starter' | 'pro' | 'ultra';
type OptimizationMode = 'job' | 'client';
type RoutePath = '/' | '/audit' | '/pricing' | '/sample-report' | '/faq' | '/how-it-works' | '/features';

const routes: { path: RoutePath; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/audit', label: 'Free Audit' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/sample-report', label: 'Sample Report' },
  { path: '/how-it-works', label: 'How It Works' },
  { path: '/features', label: 'Features' },
  { path: '/faq', label: 'FAQ' },
];

const pricingCards = [
  {
    plan: 'starter' as PlanType,
    badge: 'Starter',
    title: 'Starter',
    subtitle: 'Low-risk first step with one paid baseline audit credit.',
    price: '$0.99',
    bullets: ['Guided audit access', 'Core visibility issues', 'Trust and conversion blockers', 'Quick improvement direction'],
    theme: 'light' as const,
    cta: 'Choose Starter',
    billingLabel: 'one-time',
  },
  {
    plan: 'pro' as PlanType,
    badge: 'Pro',
    title: 'Pro',
    subtitle: 'Monthly profile upgrade with full rewrites and 30 generations every 30 days.',
    price: '$19',
    bullets: [
      'Full profile audit',
      'SEO Sniper Report',
      'Positioning review',
      'Trust and credibility review',
      'CTA recommendations',
      'Headline rewrite',
      'About rewrite',
      'Clear action plan',
    ],
    theme: 'blue' as const,
    cta: 'Choose Pro',
    billingLabel: '30 generations / 30 days',
  },
  {
    plan: 'ultra' as PlanType,
    badge: 'Ultra',
    title: 'Ultra',
    subtitle: 'High-access monthly plan with DM / follow-up assets and 200 generations every 30 days.',
    price: '$149+',
    bullets: [
      'Everything in Pro',
      'DM opener scripts',
      'Connection request scripts',
      'Follow-up scripts',
      'Outreach-ready messaging assets',
      'Higher-touch client acquisition support',
    ],
    theme: 'dark' as const,
    cta: 'Choose Ultra',
    billingLabel: '200 generations / 30 days',
  },
];

const featureItems = [
  {
    title: 'Visibility',
    desc: 'Improve how quickly the right people can find you and understand what you do.',
    bullets: ['Keyword coverage', 'Headline clarity', 'Search visibility signals'],
    icon: <Radar className="w-5 h-5" />,
  },
  {
    title: 'Trust',
    desc: 'Strengthen credibility so your profile feels more convincing to buyers.',
    bullets: ['Trust gaps', 'Authority cues', 'Credibility improvements'],
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    title: 'Conversion',
    desc: 'Turn more profile visits into clear next steps instead of passive browsing.',
    bullets: ['CTA review', 'Conversion blockers', 'Action-oriented improvements'],
    icon: <ArrowRight className="w-5 h-5" />,
  },
  {
    title: 'DM / Follow-up',
    desc: 'Know what to say after the profile works, with message assets built for real conversations.',
    bullets: ['DM openers', 'Inbound replies', 'Follow-up messages'],
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    title: 'Client Acquisition',
    desc: 'Connect profile quality, trust, conversion, and messaging into a stronger client acquisition system.',
    bullets: ['Profile-to-conversation flow', 'Outreach readiness', 'Higher-value acquisition support'],
    icon: <Target className="w-5 h-5" />,
  },
];

const faqItems = [
  {
    q: 'Who is LinkedIn-Sniper for?',
    a: 'LinkedIn-Sniper is built for consultants, freelancers, agency owners, coaches, and B2B founders who want stronger visibility, trust, and client acquisition from LinkedIn.',
  },
  {
    q: 'Is this for job seekers or client acquisition?',
    a: 'The product is positioned primarily for client acquisition, not just job search optimization. It helps users improve how their LinkedIn profiles attract attention, build trust, and support more inbound opportunities.',
  },
  {
    q: 'What do I get in the free audit?',
    a: 'The free audit gives you a quick review of your LinkedIn profile, including an overall score, top issues affecting performance, and fast suggestions to improve visibility, positioning, trust, and conversion.',
  },
  {
    q: 'What do I get in the paid plans?',
    a: 'Paid plans unlock deeper support such as the full SEO Sniper Report, headline rewrite, About rewrite, CTA recommendations, and client acquisition scripts like DM openers, connection requests, and follow-up messages.',
  },
  {
    q: 'Do I need a LinkedIn URL?',
    a: 'You can provide the profile details required by the tool. If your workflow uses a LinkedIn URL, you can position that as the easiest input method.',
  },
  {
    q: 'Is this generic AI feedback?',
    a: 'No. The goal is to provide structured, conversion-focused feedback around positioning, trust, CTA strength, and client acquisition readiness — not just generic writing advice.',
  },
];

const sampleInsights = [
  {
    title: 'Weak positioning',
    desc: 'Your profile talks about skills and experience, but it does not quickly tell buyers who you help, what outcome you deliver, and why you are different.',
  },
  {
    title: 'Low trust signals',
    desc: 'There are not enough proof elements such as specific outcomes, niche focus, or authority cues to create confidence fast.',
  },
  {
    title: 'Weak CTA',
    desc: 'Visitors can understand your background but still do not know what action to take next or what kind of conversation to start.',
  },
  {
    title: 'Generic messaging',
    desc: 'Your headline and About section sound broad, which makes the profile feel credible but not compelling enough to message.',
  },
];

const sampleReportIssues = [
  {
    title: 'Headline lacks buyer clarity',
    impact: 'High Impact',
    why: 'A visitor cannot tell in 3 seconds who you help, what result you deliver, or why they should care.',
    fix: 'Lead with audience + result + credibility cue instead of generic role labels.',
  },
  {
    title: 'About section builds background, not demand',
    impact: 'High Impact',
    why: 'The profile explains experience but does not convert that experience into a clear client-facing promise.',
    fix: 'Reframe the About section around problems solved, outcomes created, and the next step to contact you.',
  },
  {
    title: 'CTA is too weak or invisible',
    impact: 'Medium Impact',
    why: 'Interested profile visitors may leave because the profile does not tell them what to do next.',
    fix: 'Add a direct CTA for consultation, intro call, or message trigger in the headline/About/featured areas.',
  },
];

const sampleReportQuickWins = [
  'Rewrite the headline to show audience + outcome + authority.',
  'Add one concrete proof point in the About section.',
  'Insert a direct CTA telling visitors what to message you about.',
];

const sampleReportBeforeAfter = {
  beforeHeadline: 'Frontend Engineer | SaaS Builder | AI Enthusiast',
  afterHeadline: 'I help SaaS founders turn product ideas into conversion-focused web apps with faster launch cycles and cleaner execution.',
  beforeAbout:
    'I am a frontend engineer with experience in React, Node.js, and product development. I enjoy building digital products and solving business problems.',
  afterAbout:
    'I help SaaS founders, consultants, and service businesses ship faster, cleaner, conversion-focused products without wasting cycles on bloated builds. My work focuses on fast execution, sharp positioning, and production-ready delivery. If you need a builder who can turn messy product ideas into working assets that sell, send me a message with your current bottleneck.',
  cta: 'Message me if you want help improving product positioning, shipping faster, or turning your website/profile into a stronger conversion asset.',
};

const sampleReportScripts = {
  connection: 'Hey Sarah — your work around B2B SaaS positioning caught my eye. I help founders tighten product messaging and conversion flow. Thought it made sense to connect.',
  followUp: 'Thanks for connecting. Quick question — are you currently more focused on improving traffic quality, profile conversion, or outbound response rates?',
};


const trustProofItems = [
  {
    title: 'Built for client acquisition, not generic profile polishing',
    desc: 'The audit focuses on visibility, trust, positioning, CTA strength, and inbound lead potential — not just making your profile sound nicer.',
  },
  {
    title: 'Structured output, not vague AI advice',
    desc: 'Users get scores, top issues, priority fixes, example rewrites, and message scripts they can actually use.',
  },
  {
    title: 'Designed for consultants, founders, and service businesses',
    desc: 'The messaging and recommendations are aimed at people who want LinkedIn to support offers, conversations, and client acquisition.',
  },
];

const howItWorksSteps = [
  {
    title: 'Paste your LinkedIn profile details',
    desc: 'Add your LinkedIn profile content so the system can review how your profile presents your offer, credibility, and conversion potential.',
    icon: <Copy className="w-5 h-5" />,
  },
  {
    title: 'Get your audit results',
    desc: 'See your overall score, top conversion issues, and quick recommendations to improve visibility, trust, and positioning.',
    icon: <Radar className="w-5 h-5" />,
  },
  {
    title: 'Upgrade for deeper fixes',
    desc: 'Unlock a full report, stronger rewrites, CTA improvements, and client acquisition scripts when you want more than diagnosis.',
    icon: <Sparkles className="w-5 h-5" />,
  },
];

function App() {
  const [profileData, setProfileData] = useState('');
  const [style, setStyle] = useState('Story');
  const [mode, setMode] = useState<OptimizationMode>('client');
  const [targetClientType, setTargetClientType] = useState('SaaS Founder');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const access = fullProfile?.access || null;
  const [token, setToken] = useState<string | null>(localStorage.getItem('gh_token'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');
  const [currentPath, setCurrentPath] = useState<RoutePath>(() => {
    const path = window.location.pathname as RoutePath;
    return routes.some((route) => route.path === path) ? path : '/';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'history' | 'payments'>(() => new URLSearchParams(window.location.search).get('tab') === 'payments' ? 'payments' : 'history');
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
      alert('PayPal payment was cancelled');
      window.history.replaceState({}, '', currentPath);
      return;
    }

    if (paypal === 'success' && orderID && token) {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/paypal/capture-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID, token }),
          });
          const data = await res.json();
          if (data.status === 'success') {
            alert(`Payment successful! Your plan has been upgraded to ${data.plan}`);
            await fetchFullProfile(token);
          } else {
            alert(data.error || 'Payment capture failed');
          }
        } catch (e: any) {
          alert(e.message || 'Payment capture failed');
        } finally {
          window.history.replaceState({}, '', currentPath);
        }
      })();
    }
  }, [token, currentPath]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handlePopState = () => {
      const path = window.location.pathname as RoutePath;
      setCurrentPath(routes.some((route) => route.path === path) ? path : '/');
      setHistoryTab(new URLSearchParams(window.location.search).get('tab') === 'payments' ? 'payments' : 'history');
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('popstate', handlePopState);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const fetchFullProfile = async (jwt: string) => {
    try {
      const response = await fetch(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFullProfile(data);
      }
    } catch {
      console.error('Failed to fetch full profile');
    }
  };

  const navigateTo = (path: RoutePath, options?: { preserveScroll?: boolean; query?: Record<string, string | null> }) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.pathname = path;
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value === null) nextUrl.searchParams.delete(key);
        else nextUrl.searchParams.set(key, value);
      });
    } else if (path !== currentPath) {
      nextUrl.search = '';
    }
    window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
    setCurrentPath(path);
    setHistoryTab(nextUrl.searchParams.get('tab') === 'payments' ? 'payments' : 'history');
    setMobileNavOpen(false);
    setIsMenuOpen(false);
    if (!options?.preserveScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToTool = () => {
    if (currentPath !== '/') {
      navigateTo('/', { preserveScroll: true });
      setTimeout(() => toolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260);
      return;
    }
    toolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      alert('Please sign in with Google first');
      return;
    }
    try {
      setPaying(true);
      const res = await fetch(`${API_URL}/api/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: selectedPlan, token }),
      });
      const data = await res.json();
      if (!data.approveUrl) throw new Error(data.error || 'Unable to create PayPal order');
      window.location.href = data.approveUrl;
    } catch (e: any) {
      alert(e.message || 'Unable to redirect to PayPal');
    } finally {
      setPaying(false);
    }
  };

  const handleOptimize = async () => {
    if (!profileData) return;
    if (!token) {
      alert('Please sign in first. Free access is login-gated.');
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
          token: token || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Optimization request failed');
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
        followUpMessages: Array.isArray(data.followUpMessages) ? data.followUpMessages : [],
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
      alert('Optimization request failed. Please check the backend configuration.');
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
    alert('Copied to clipboard!');
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



  const formatAccessTime = (value?: number | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

  const planLimitText = !access
    ? 'Sign in required to load plan limits'
    : access.currentPlan === 'pro'
      ? 'Pro limit: 30 generations every 30 days'
      : access.currentPlan === 'ultra'
        ? 'Ultra limit: 200 generations every 30 days'
        : access.currentPlan === 'starter'
          ? 'Starter limit: single-use paid audit credit'
          : 'Free limit: 1 lifetime generation';

  const unlockedFeatures = [
    access ? `Plan: ${String(access.currentPlan || 'free').toUpperCase()}` : 'Plan: GUEST',
    access ? `Usage: ${Number(access.generationsUsed || 0)}/${Number(access.generationLimit || 0)} (${String(access.quotaPeriod || 'lifetime')})` : 'Usage: sign in required',
    access?.quotaResetAt ? `Next quota reset: ${formatAccessTime(access.quotaResetAt)}` : `Current cycle ends: ${formatAccessTime(access?.cycleEndsAt)}`,
    access?.includeFullRewrite ? 'Full rewrites unlocked' : 'Full rewrites locked',
    access?.includeDmAssets ? 'DM / follow-up assets unlocked' : 'DM / follow-up assets locked',
  ];


  const planCard = (
    plan: PlanType,
    title: string,
    subtitle: string,
    price: string,
    items: string[],
    theme: 'light' | 'blue' | 'dark',
    cta: string,
    billingLabel: string,
    compact?: boolean,
  ) => {
    const cardClass =
      theme === 'blue'
        ? 'p-8 rounded-3xl bg-indigo-600 border-4 border-indigo-100 flex flex-col shadow-xl shadow-indigo-100 relative'
        : theme === 'dark'
          ? 'p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col hover:border-slate-700 transition-all'
          : 'p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col hover:border-slate-300 transition-all';

    const textClass = theme === 'blue' || theme === 'dark' ? 'text-white' : 'text-slate-800';
    const subClass = theme === 'blue' ? 'text-white/75' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
    const btnClass =
      selectedPlan === plan
        ? theme === 'blue'
          ? 'bg-white text-indigo-700'
          : 'bg-indigo-600 text-white'
        : theme === 'blue'
          ? 'bg-white/15 text-white border border-white/20'
          : 'bg-white text-slate-700 border border-slate-200';

    return (
      <div className={cardClass}>
        {plan === 'pro' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border-2 border-white">
            <Crown className="w-3 h-3 fill-current" /> MOST POPULAR
          </div>
        )}
        <div className={`mb-6 ${textClass}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'blue' ? 'opacity-70' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            {title}
          </span>
          <h3 className={`mt-2 ${compact ? 'text-2xl font-black' : 'text-3xl font-black'}`}>{title}</h3>
          <div className={`mt-3 ${theme === 'blue' ? 'text-white' : theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <span className={`${compact ? 'text-3xl' : 'text-4xl'} font-black tracking-tight`}>{price}</span>
            <span className={`ml-2 text-sm font-bold ${subClass}`}>{billingLabel}</span>
          </div>
          <p className={`text-sm mt-3 font-medium leading-relaxed ${subClass}`}>{subtitle}</p>
        </div>
        <ul className={`space-y-3 mb-8 flex-1 ${textClass}`}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm font-medium opacity-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
        <button onClick={() => setSelectedPlan(plan)} className={`mt-4 h-11 rounded-full text-sm font-bold transition-all ${btnClass}`}>
          {selectedPlan === plan ? 'Selected' : cta}
        </button>
      </div>
    );
  };

  const renderPricingCards = (compact?: boolean) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {pricingCards.map((card) =>
        planCard(card.plan, card.title, card.subtitle, card.price, card.bullets, card.theme, card.cta, card.billingLabel, compact),
      )}
    </div>
  );

  const pageHero = (eyebrow: string, title: string, subtitle: string, actions?: React.ReactNode) => (
    <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700 mb-5">
            <Layers className="w-3.5 h-3.5" /> {eyebrow}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">{title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 max-w-2xl">{subtitle}</p>
          {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
        </div>
      </div>
    </section>
  );

  const ctaButtons = (primaryLabel = 'Get Free Audit') => (
    <>
      <button onClick={() => navigateTo('/audit')} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
        {primaryLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </>
  );

  const toolSection = (
    <section ref={toolRef} className="max-w-7xl mx-auto px-4 pb-16">
      <div className="mb-8">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Free Client Audit</div>
        <h2 className="text-3xl font-black text-slate-900">Run your LinkedIn client acquisition audit</h2>
        <p className="mt-3 text-slate-600 max-w-2xl">Paste your profile and see what is stopping it from attracting trust, driving replies, and turning profile views into real conversations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-5">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Profile Input</h2>
                <p className="text-xs text-slate-500">Paste your LinkedIn profile content to audit visibility, trust, and conversion quality</p>
              </div>
            </div>
            <textarea
              className="w-full h-64 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none placeholder:text-slate-400 font-medium"
              placeholder="Copy your LinkedIn profile and paste it here..."
              value={profileData}
              onChange={(e) => setProfileData(e.target.value)}
            />
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="min-w-[200px] relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Tone</label>
                <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all appearance-none" value={style} onChange={(e) => setStyle(e.target.value)}>
                  <option>Story</option>
                  <option value="Sniper">Sniper 🔒</option>
                  <option value="Tech">Tech 🔒</option>
                  <option value="Values">Values 🔒</option>
                  <option value="Future">Future 🔒</option>
                </select>
                <div className="absolute right-4 bottom-3 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
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
                {loading ? <Zap className="w-5 h-5 animate-spin" /> : <><Target className="w-5 h-5" /><span>{mode === 'client' ? 'Run Free Client Audit' : 'Start Job Optimization'}</span></>}
              </button>
            </div>
            {!token && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Sign in first. Free access is login-gated and includes 1 generation per account.
              </div>
            )}
            {token && access && access.currentPlan !== 'free' && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Current access: <span className="font-bold uppercase">{access.currentPlan}</span> · Remaining quota: <span className="font-bold">{access.generationsRemaining} / {access.generationLimit}</span> ({access.quotaPeriod}) · {access.quotaResetAt ? `Resets ${formatAccessTime(access.quotaResetAt)}` : `Cycle ends ${formatAccessTime(access.cycleEndsAt)}`}
              </div>
            )}
          </section>

          {result && (
            <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-1">Search Signals</div>
                  <h3 className="text-base font-bold text-slate-900">Search visibility snapshot</h3>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Visibility lift</div>
                  <div className="text-xl font-black text-emerald-500">{user ? '+42.8%' : '+12.5%'}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {result.seoKeywords?.map((k: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-lg text-xs font-semibold border bg-slate-50 border-slate-200 text-slate-700">#{k}</span>
                ))}
                {!access?.includeFullRewrite && <span className="px-3 py-1 rounded-lg text-xs font-bold border border-dashed bg-slate-50 text-slate-400">more locked</span>}
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-6 space-y-5">
          <HistoryManager token={token || undefined} currentStyle={style} initialTab={historyTab} onSelectHistory={(content) => setResult(content)} />
          {result ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                {sectionTitle('Conversion Audit', 'Profile performance snapshot', <Radar className="w-3.5 h-3.5" />)}
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
                <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 mb-3">Current access status</div>
                  <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-bold text-indigo-900 mb-3">{planLimitText}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {unlockedFeatures.map((item) => (
                      <div key={item} className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-medium text-slate-700">{item}</div>
                    ))}
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
                      <p className="text-xs text-slate-500 font-bold">Unlock deeper conversion guidance and messaging assets</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                {sectionTitle('Priority Fixes', 'Highest-impact changes first', <Flag className="w-3.5 h-3.5" />)}
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
                {sectionTitle('Positioning', 'Offer clarity and target audience', <Users className="w-3.5 h-3.5" />)}
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
                {sectionTitle('DM / Follow-up', 'Messages that help move conversations forward', <MessageSquare className="w-3.5 h-3.5" />)}
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
              <ShieldCheck className="w-8 h-8 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-400">Run your first audit to see results here</h3>
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const homePage = (
    <>
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700 mb-5">
              <Target className="w-3.5 h-3.5" /> LinkedIn Client Acquisition Framework
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              LinkedIn tools for <span className="text-indigo-600">visibility, trust, and client acquisition</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-3xl leading-relaxed">
              Improve visibility, trust, conversion, and outreach readiness — so more profile views can turn into real business conversations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigateTo('/audit')} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                Get Free Audit <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigateTo('/sample-report')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                View Sample Report
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="max-w-3xl mb-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Popular paths</div>
          <h2 className="text-3xl font-black text-slate-900">Start with the path that matches your goal</h2>
          <p className="mt-4 text-slate-600 text-lg">Use the audit to find what is hurting performance, the sample report to see what stronger output looks like, and pricing to choose the right depth of support.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => navigateTo('/audit')} className="text-left rounded-3xl border border-slate-200 bg-white p-7 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Best for finding your biggest blockers</div>
            <div className="font-black text-slate-900 text-xl">Free Client Acquisition Audit</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">See what is weakening your visibility, trust, and conversion potential — before you pay for deeper support.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">Run Free Audit <ArrowRight className="w-4 h-4" /></div>
          </button>

          <button onClick={() => navigateTo('/sample-report')} className="text-left rounded-3xl border border-slate-200 bg-white p-7 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Best for seeing output quality</div>
            <div className="font-black text-slate-900 text-xl">Sample Report</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">See how weak positioning becomes clearer messaging, stronger trust signals, and more conversion-ready profile assets.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">View Sample Report <ArrowRight className="w-4 h-4" /></div>
          </button>

          <button onClick={() => navigateTo('/pricing')} className="text-left rounded-3xl border border-slate-200 bg-white p-7 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Best for choosing your support level</div>
            <div className="font-black text-slate-900 text-xl">Pricing</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Compare audit access, profile upgrade depth, and client acquisition support before you buy.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">Compare Plans <ArrowRight className="w-4 h-4" /></div>
          </button>

          <button onClick={() => navigateTo('/features')} className="text-left rounded-3xl border border-slate-200 bg-white p-7 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Best for understanding the framework</div>
            <div className="font-black text-slate-900 text-xl">Features</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Explore the 5 layers behind the product: visibility, trust, conversion, messaging, and client acquisition readiness.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">Explore Framework <ArrowRight className="w-4 h-4" /></div>
          </button>
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Who it’s for</div>
              <h2 className="text-3xl font-black text-slate-900">Built for professionals who use LinkedIn to win business</h2>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Consultants', 'Freelancers', 'Agency owners', 'B2B founders', 'Coaches', 'Service businesses'].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 shadow-sm">{item}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">What it helps with</div>
              <h2 className="text-3xl font-black text-slate-900">The 5 layers of client acquisition improvement</h2>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Visibility', 'Trust', 'Conversion', 'DM / Follow-up', 'Client Acquisition'].map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <div className="text-base font-black text-slate-900">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Why trust it</div>
            <h2 className="text-3xl font-black text-slate-900">Built like a strategist, not a generic AI rewrite tool</h2>
            <div className="mt-6 space-y-4">
              {trustProofItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="font-bold text-slate-900">{item.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Recommended flow</div>
            <h3 className="text-2xl font-black text-slate-900">Recommended starting path</h3>
            <div className="mt-6 space-y-4">
              <button onClick={() => navigateTo('/audit')} className="w-full text-left rounded-2xl bg-slate-50 border border-slate-100 p-5 hover:border-indigo-200 transition-all">
                <div className="font-bold text-slate-900">1. Run the free audit</div>
                <p className="mt-2 text-sm text-slate-600">Find the biggest visibility, trust, and conversion issues holding your profile back.</p>
              </button>
              <button onClick={() => navigateTo('/sample-report')} className="w-full text-left rounded-2xl bg-slate-50 border border-slate-100 p-5 hover:border-indigo-200 transition-all">
                <div className="font-bold text-slate-900">2. Review the sample report</div>
                <p className="mt-2 text-sm text-slate-600">See what stronger positioning, rewrites, and messaging assets actually look like.</p>
              </button>
              <button onClick={() => navigateTo('/pricing')} className="w-full text-left rounded-2xl bg-slate-50 border border-slate-100 p-5 hover:border-indigo-200 transition-all">
                <div className="font-bold text-slate-900">3. Compare plans</div>
                <p className="mt-2 text-sm text-slate-600">Choose the level of audit, profile support, and client acquisition depth you need.</p>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Light CTA</div>
            <h2 className="text-3xl font-black text-slate-900">Start with a free audit. Upgrade when you need deeper client acquisition support.</h2>
            <p className="mt-4 text-slate-600 text-lg">Begin with a guided audit, understand your biggest blockers, and upgrade when you want stronger rewrites, conversion support, and outreach assets.</p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <button onClick={() => navigateTo('/audit')} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                Get Free Audit <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const auditPage = (
    <>
      {pageHero(
        'Free Audit',
        'Run your LinkedIn client acquisition audit',
        'Check what is weakening your visibility, trust, conversion, and profile-to-conversation readiness.',
        <>
          <button onClick={scrollToTool} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            Start Audit <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigateTo('/sample-report')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
            View Sample Report
          </button>
        </>
      )}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['Visibility blockers', 'Trust gaps', 'Conversion issues', 'Action priorities'].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm font-bold text-slate-700">{item}</div>
          ))}
        </div>
      </section>
      {toolSection}
    </>
  );

  const pricingPage = (
    <>
      {pageHero(
        'Pricing',
        'Choose how deeply you want to optimize LinkedIn for client acquisition',
        'Start with a guided audit, move into a stronger conversion-ready profile, or unlock fuller client acquisition assets and messaging support.',
        <>
          <button onClick={startPayPalCheckout} disabled={paying} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFC439] px-6 py-3 text-sm font-black text-[#111] hover:bg-[#f5b931] transition-colors shadow-lg disabled:opacity-60">
            {paying ? 'Redirecting to PayPal...' : 'Continue to PayPal'}
          </button>
        </>
      )}

      <section className="max-w-7xl mx-auto px-4 py-16">
        {renderPricingCards()}
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Unified checkout</div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">Selected plan: <span className="text-indigo-600 uppercase">{selectedPlan}</span></h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">Price: {pricingCards.find((card) => card.plan === selectedPlan)?.price}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700">Secure checkout with PayPal</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">Start with guided diagnosis</span>
              </div>
            </div>
            <div className="md:min-w-[320px]">
              {user ? (
                <button onClick={startPayPalCheckout} disabled={paying} className="w-full h-14 rounded-full bg-[#FFC439] hover:bg-[#f5b931] text-[#111] text-base font-black transition-all disabled:opacity-60 shadow-lg">
                  {paying ? 'Redirecting to PayPal...' : 'Continue to PayPal'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-500 text-center">Sign in first, then continue to PayPal</div>
                  <div className="flex justify-center md:justify-end">
                    <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} theme="outline" shape="pill" size="large" width="260" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Which plan is right for you</div>
              <h2 className="text-3xl font-black text-slate-900">Choose the depth of support that matches your goal</h2>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="font-bold text-slate-900">Starter — $0.99</div>
                  <p className="mt-2 text-sm text-slate-600">Best if you want a low-risk first step with one paid baseline audit credit.</p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                  <div className="font-bold text-indigo-900">Pro — $19</div>
                  <p className="mt-2 text-sm text-indigo-800">Best for users who want a stronger conversion-ready profile with a 30 / 30-day quota.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="font-bold text-slate-900">Ultra — $149+</div>
                  <p className="mt-2 text-sm text-slate-600">Best if you want fuller messaging assets and a 200 / 30-day quota.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-slate-900 p-8 text-white shadow-xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60 mb-3">Why people pay</div>
              <h3 className="text-2xl font-black">Different plans unlock different depth</h3>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-bold text-white">Starter</div>
                  <p className="mt-2 text-sm text-white/70">Get one paid baseline audit credit without moving into a monthly plan.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-bold text-white">Pro</div>
                  <p className="mt-2 text-sm text-white/70">Unlock full rewrites and 30 generations every 30 days.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-bold text-white">Ultra</div>
                  <p className="mt-2 text-sm text-white/70">Unlock DM / follow-up assets and 200 generations every 30 days.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="max-w-3xl mb-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Plan access</div>
          <h2 className="text-3xl font-black text-slate-900">What each plan actually unlocks</h2>
          <p className="mt-4 text-slate-600 text-lg">The difference is not just price. Each tier maps to a real access model already enforced by the backend.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Free {access?.currentPlan === 'free' && <span className="text-indigo-600">• Current</span>}</div>
            <h3 className="text-xl font-black text-slate-900">Preview access</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Login-gated preview with 1 lifetime generation.</p>
            <ul className="mt-5 space-y-3">
              {['Login required', '1 lifetime generation', 'Preview visibility / trust / conversion issues', 'Limited output depth', 'No DM or follow-up assets'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Starter {access?.currentPlan === 'starter' && <span className="text-indigo-600">• Current</span>}</div>
            <h3 className="text-xl font-black text-slate-900">One low-risk full audit</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Single-use paid credits for users who want one baseline audit at a time.</p>
            <ul className="mt-5 space-y-3">
              {['Single-use paid audit credit', 'Core visibility findings', 'Core trust and conversion blockers', 'Quick wins and action direction', 'No DM or follow-up assets'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 mb-2">Pro {access?.currentPlan === 'pro' && <span className="text-indigo-800">• Current</span>}</div>
            <h3 className="text-xl font-black text-indigo-950">Main profile upgrade</h3>
            <p className="mt-3 text-sm leading-relaxed text-indigo-900/80">Monthly profile upgrade plan with full rewrites and 30 generations every 30 days.</p>
            <ul className="mt-5 space-y-3">
              {['30 generations every 30 days', 'Full rewrites unlocked', 'Headline rewrite', 'About rewrite', 'Positioning + trust review'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-indigo-950"><CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-900 bg-slate-900 p-6 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60 mb-2">Ultra {access?.currentPlan === 'ultra' && <span className="text-emerald-300">• Current</span>}</div>
            <h3 className="text-xl font-black text-white">Full client acquisition assets</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">Monthly high-access plan with DM / follow-up assets and 200 generations every 30 days.</p>
            <ul className="mt-5 space-y-3">
              {['200 generations every 30 days', 'Everything in Pro', 'DM opener scripts', 'Connection request templates', 'Follow-up message assets'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-white/90"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-700 shadow-sm">Start with guided diagnosis</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-700 shadow-sm">Secure checkout with PayPal</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-700 shadow-sm">Upgrade when you need deeper support</div>
        </div>
      </section>
    </>
  );

  const sampleReportPage = (
    <>
      {pageHero(
        'Sample Report',
        'See what a real LinkedIn client acquisition audit looks like',
        'This sample shows how vague profile feedback becomes clearer positioning, stronger trust signals, better conversion structure, and more usable messaging assets.',
        ctaButtons(),
      )}
      <section className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Sample summary</div>
              <h2 className="text-2xl font-black text-slate-900">Client Acquisition Readiness</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 max-w-lg">
                Strong technical credibility, but weak buyer clarity and CTA reduce the chance of turning profile views into conversations.
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 min-w-[180px]">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 mb-2">Overall Score</div>
              <div className="text-4xl font-black text-amber-500">62<span className="text-lg text-amber-300">/100</span></div>
              <div className="mt-2 text-xs font-bold text-amber-800">Needs stronger positioning and CTA</div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Visibility</div>
              <div className="text-lg font-black text-slate-900">68/100</div>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Trust</div>
              <div className="text-lg font-black text-slate-900">64/100</div>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Conversion</div>
              <div className="text-lg font-black text-slate-900">54/100</div>
            </div>
          </div>

          <div className="mt-8">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">Top 3 issues</div>
            <div className="space-y-4">
              {sampleReportIssues.map((item, index) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="font-bold text-slate-900">{index + 1}. {item.title}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] rounded-full bg-amber-100 px-3 py-1 text-amber-700">{item.impact}</div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600"><span className="font-bold text-slate-800">Why it hurts:</span> {item.why}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600"><span className="font-bold text-slate-800">Suggested fix:</span> {item.fix}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Fast wins</div>
            <h2 className="text-3xl font-black text-slate-900">What to fix first</h2>
            <div className="mt-6 space-y-4">
              {sampleReportQuickWins.map((item, index) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-900">Priority {index + 1}</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Example positioning</div>
            <h3 className="text-2xl font-black text-slate-900">Recommended positioning angle</h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Position this profile around helping founders and service businesses move faster from idea to launch while improving conversion quality, not just shipping code.
            </p>
            <div className="mt-5 rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 mb-2">Positioning statement</div>
              <p className="text-sm font-medium leading-relaxed text-indigo-900">
                I help SaaS founders and service businesses build faster, conversion-focused digital products that make their positioning clearer and their growth assets more effective.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="max-w-3xl mb-10">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Before / After</div>
            <h2 className="text-3xl font-black text-slate-900">How audit insight becomes usable profile assets</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">Headline rewrite</div>
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4">
                <div className="text-xs font-bold text-rose-700 mb-2">Before</div>
                <p className="text-sm text-rose-900">{sampleReportBeforeAfter.beforeHeadline}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 mt-4">
                <div className="text-xs font-bold text-emerald-700 mb-2">After</div>
                <p className="text-sm text-emerald-900">{sampleReportBeforeAfter.afterHeadline}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">About rewrite</div>
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4">
                <div className="text-xs font-bold text-rose-700 mb-2">Before</div>
                <p className="text-sm leading-relaxed text-rose-900">{sampleReportBeforeAfter.beforeAbout}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 mt-4">
                <div className="text-xs font-bold text-emerald-700 mb-2">After</div>
                <p className="text-sm leading-relaxed text-emerald-900">{sampleReportBeforeAfter.afterAbout}</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 mt-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">CTA improvement</div>
            <p className="text-sm leading-relaxed text-slate-700">{sampleReportBeforeAfter.cta}</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">Sample DM opener</div>
          <p className="text-sm leading-relaxed text-slate-700">{sampleReportScripts.connection}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">Sample follow-up</div>
          <p className="text-sm leading-relaxed text-slate-700">{sampleReportScripts.followUp}</p>
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="max-w-3xl mb-10">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">What this proves</div>
            <h2 className="text-3xl font-black text-slate-900">Why this goes beyond generic AI rewrites</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sampleInsights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="font-bold text-slate-900">{item.title}</div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="max-w-3xl mb-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Trust proof</div>
          <h2 className="text-3xl font-black text-slate-900">Why this sample feels more credible</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {trustProofItems.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="font-bold text-slate-900">{item.title}</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-3xl bg-slate-900 p-8 md:p-10 text-white shadow-xl">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60 mb-2">Upgrade</div>
          <h2 className="text-3xl font-black">Want your own full client acquisition report?</h2>
          <p className="mt-4 text-white/70 max-w-2xl text-sm leading-relaxed">
            Start with the free audit, then upgrade for deeper rewrites, stronger conversion guidance, and messaging assets built for real outreach.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Full SEO Sniper Report', 'Headline rewrite', 'About rewrite', 'CTA improvements', 'DM opener scripts', 'Follow-up scripts'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-medium text-white/85">{item}</div>
            ))}
          </div>
          <div className="mt-8">{ctaButtons('Unlock Full Report')}</div>
        </div>
      </section>
    </>
  );

  const howItWorksPage = (
    <>
      {pageHero(
        'How It Works',
        'From quick diagnosis to deeper rewrites and client acquisition support',
        'Here’s how LinkedIn-Sniper moves users from a free audit into deeper profile improvements and conversation assets.',
        ctaButtons(),
      )}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {howItWorksSteps.map((step, index) => (
            <div key={step.title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-600 mb-4">{step.icon}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Step {index + 1}</div>
              <h3 className="text-xl font-black text-slate-900">{step.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="max-w-3xl mb-10">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">What the audit helps you spot</div>
            <h2 className="text-3xl font-black text-slate-900">The main blockers behind weak LinkedIn client acquisition</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {['Unclear positioning', 'Weak trust signals', 'Missing or weak CTA', 'Generic profile messaging', 'Low client acquisition readiness'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm font-semibold text-slate-700">{item}</div>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const featuresPage = (
    <>
      {pageHero(
        'Features',
        'A 5-layer framework for LinkedIn client acquisition',
        'Explore how LinkedIn-Sniper improves visibility, trust, conversion, DM / Follow-up readiness, and overall client acquisition performance.',
        ctaButtons(),
      )}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {featureItems.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-600 mb-4">{item.icon}</div>
              <h3 className="text-xl font-black text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              <ul className="mt-5 space-y-3">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm text-slate-700 font-medium"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  const faqPage = (
    <>
      {pageHero(
        'FAQ',
        'Frequently asked questions',
        'Everything you need to know before running your LinkedIn profile audit.',
        ctaButtons(),
      )}
      <section className="max-w-5xl mx-auto px-4 py-16 space-y-5">
        {faqItems.map((item) => (
          <div key={item.q} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-indigo-600"><HelpCircle className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{item.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </>
  );

  const renderPage = () => {
    switch (currentPath) {
      case '/audit':
        return auditPage;
      case '/pricing':
        return pricingPage;
      case '/sample-report':
        return sampleReportPage;
      case '/faq':
        return faqPage;
      case '/how-it-works':
        return howItWorksPage;
      case '/features':
        return featuresPage;
      case '/':
      default:
        return homePage;
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 relative">
        {showPricing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPricing(false)}></div>
            <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 fade-in duration-300 max-h-[92vh] overflow-y-auto">
              <button onClick={() => setShowPricing(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 z-10"><X className="w-5 h-5" /></button>
              <div className="p-8 md:p-12">
                <div className="text-center mb-10 max-w-2xl mx-auto">
                  <h2 className="text-3xl font-black text-slate-900 mb-4">Choose how deeply you want to optimize LinkedIn for client acquisition</h2>
                  <p className="text-slate-500 font-medium">Start with a free audit, then upgrade for deeper fixes, stronger positioning, and client acquisition support.</p>
                </div>

                {!user ? (
                  <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-xs font-bold text-slate-500">Sign in first, then pay</div>
                    <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} theme="outline" shape="pill" size="large" width="260" />
                  </div>
                ) : (
                  <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <div className="text-sm font-bold text-emerald-700">Signed in: {user.email}</div>
                    <div className="text-xs text-emerald-600 mt-1">Payment will redirect directly to PayPal</div>
                  </div>
                )}

                {renderPricingCards()}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Checkout</div>
                      <div className="text-xs text-slate-500">Current plan: {selectedPlan}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><CreditCard className="w-4 h-4" /> PayPal</div>
                  </div>
                  {user ? (
                    <button onClick={startPayPalCheckout} disabled={paying} className="w-full h-11 rounded-full bg-[#FFC439] hover:bg-[#f5b931] text-[#111] text-sm font-bold transition-all disabled:opacity-60">
                      {paying ? 'Redirecting to PayPal...' : 'Continue to PayPal'}
                    </button>
                  ) : (
                    <div className="h-10 rounded-full bg-white border border-slate-200 text-slate-400 text-xs font-bold flex items-center justify-center">Sign in to continue to PayPal</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm shadow-slate-100">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <button className="flex items-center gap-2" onClick={() => navigateTo('/')}>
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-200"><Target className="w-5 h-5 text-white" /></div>
              <span className="font-bold text-lg tracking-tight text-slate-900">LinkedIn <span className="text-indigo-600">Sniper</span></span>
            </button>

            <nav className="hidden lg:flex items-center gap-1">
              {routes.map((route) => (
                <button key={route.path} onClick={() => navigateTo(route.path)} className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${currentPath === route.path ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {route.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3 relative" ref={menuRef}>
              <button onClick={() => setMobileNavOpen((prev) => !prev)} className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700">
                {mobileNavOpen ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
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
                          <div className="flex items-center gap-2"><Crown className={`w-4 h-4 ${fullProfile?.plan !== 'free' ? 'text-amber-500' : 'text-slate-300'}`} /><span className="text-xs font-bold text-slate-600">Current Plan</span></div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${fullProfile?.plan !== 'free' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>{fullProfile?.plan || 'Free'}</span>
                        </div>
                        {access && access.currentPlan !== 'free' && (
                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <div className="text-xs font-bold text-slate-600">Remaining quota / cycle</div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{access.generationsRemaining} / {access.generationLimit}</span>
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-2 border-t border-slate-100">
                        <button onClick={() => { setIsMenuOpen(false); setHistoryTab('payments'); navigateTo('/audit', { query: { tab: 'payments' } }); }} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"><CreditCard className="w-4 h-4" /> Payment Records</button>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut className="w-4 h-4" /> Sign Out</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="hidden sm:block"><GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} theme="outline" shape="pill" size="medium" /></div>
              )}
            </div>
          </div>
          {mobileNavOpen && (
            <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
              {routes.map((route) => (
                <button key={route.path} onClick={() => navigateTo(route.path)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold ${currentPath === route.path ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {route.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <main>{renderPage()}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
            <div>
              <div className="font-black text-slate-900">LinkedIn Sniper</div>
              <p className="mt-2 text-sm text-slate-500 max-w-xl">Built to improve visibility, trust, positioning, and client acquisition readiness on LinkedIn.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {routes.map((route) => (
                <button key={route.path} onClick={() => navigateTo(route.path)} className="text-sm font-bold text-slate-500 hover:text-slate-900">
                  {route.label}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
