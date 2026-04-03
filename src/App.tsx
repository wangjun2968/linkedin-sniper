import React, { useState } from 'react';

const Header = () => (
  <header className="bg-[#004182] p-6 text-white shadow-md">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold flex items-center gap-2">
        LinkedIn Profile Sniper 🦞
      </h1>
      <p className="mt-2 text-blue-100 opacity-90">One-click optimization for high-impact professional profiles.</p>
    </div>
  </header>
);

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (!input) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('https://linkedin-api.soundxy9.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: input }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Worker error. Check API Key or URL.');
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef] text-[#000000e6] font-sans pb-12">
      <Header />
      
      <main className="max-w-2xl mx-auto mt-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">
            LinkedIn Profile Data
          </label>
          <textarea 
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004182] focus:border-transparent outline-none transition-all resize-none text-sm"
            placeholder="Paste your profile 'About', 'Experience', or the whole page text here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            onClick={handleOptimize}
            disabled={loading || !input}
            className="mt-6 w-full bg-[#004182] hover:bg-[#00356a] active:scale-[0.98] text-white font-bold py-4 rounded-full transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? "Optimizing Profile..." : "Analyze & Optimize"}
          </button>
          {error && <p className="mt-4 text-red-600 text-sm font-medium">⚠️ {error}</p>}
        </div>

        {result && (
          <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-[#004182]">
              <h3 className="text-lg font-bold text-[#004182] mb-4 flex items-center gap-2">
                🎯 Optimized Headlines
              </h3>
              <div className="space-y-3">
                {result.headlines?.map((h: string, i: number) => (
                  <div key={i} className="group p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex justify-between items-center hover:bg-blue-50 transition-colors">
                    <span className="text-sm font-medium pr-4 leading-relaxed">{h}</span>
                    <button 
                      onClick={() => copyToClipboard(h, `h-${i}`)}
                      className="shrink-0 text-xs font-bold text-[#004182] bg-white px-3 py-1 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                      {copyStatus === `h-${i}` ? "COPIED ✅" : "COPY"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-6">📝 About Section Versions</h3>
              <div className="space-y-4">
                {['Results-Driven', 'Storyteller', 'Skill-Focused', 'Value-Driven', 'Future-Ready'].map((label, i) => (
                  <details key={i} className="group border rounded-lg overflow-hidden bg-gray-50/50 open:bg-white transition-all">
                    <summary className="cursor-pointer p-4 font-bold text-sm bg-gray-100/80 group-open:bg-blue-50/30 flex justify-between items-center">
                      <span>{label} Version</span>
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-4 border-t relative">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-12">
                        {result.aboutVersions?.[i]}
                      </p>
                      <button 
                        onClick={() => copyToClipboard(result.aboutVersions[i], `a-${i}`)}
                        className="absolute top-4 right-4 text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        {copyStatus === `a-${i}` ? "✅" : "COPY"}
                      </button>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">💡 Content Pillars for You</h3>
              <ul className="space-y-3">
                {result.postTopics?.map((t: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm items-start">
                    <span className="text-blue-500 font-bold">•</span>
                    <span className="text-gray-600">{t}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-gradient-to-br from-[#004182] to-[#0073b1] rounded-2xl p-8 text-center text-white shadow-xl">
              <h3 className="text-xl font-bold mb-2">Want a full Resume AI Audit?</h3>
              <p className="text-blue-100 text-sm mb-6 opacity-90">We're launching a Pro version with ATS optimization soon.</p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-1 p-3 rounded-full text-gray-900 text-sm outline-none focus:ring-4 focus:ring-blue-400/30"
                />
                <button className="bg-white text-[#004182] px-6 py-3 rounded-full font-extrabold hover:bg-blue-50 transition-colors whitespace-nowrap shadow-lg">
                  Join Waitlist
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
