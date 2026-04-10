import React, { useState, useEffect } from 'react';
import { History, CreditCard, CheckCircle2 } from 'lucide-react';

interface HistoryRecord {
  id: number;
  user_email: string;
  style: string;
  result: any;
  created_at: number;
}

interface PaymentRecord {
  id: number;
  order_id: string;
  plan: string;
  amount: string;
  currency: string;
  status: string;
  created_at: number;
}

interface HistoryManagerProps {
  currentStyle: string;
  onSelectHistory: (content: any) => void;
  token?: string;
}

const API_BASE = 'https://linkedin-api-sandbox.soundxy9.workers.dev';

const HistoryManager: React.FC<HistoryManagerProps> = ({ currentStyle, onSelectHistory, token }) => {
  const [histories, setHistories] = useState<HistoryRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'history' | 'payments'>('history');

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [historyRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/history`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/payments`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const historyData = await historyRes.json();
      const paymentsData = await paymentsRes.json();
      setHistories(Array.isArray(historyData) ? historyData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } catch (e) {
      console.error('Fetch history/payments failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  if (!token) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 border border-dashed border-gray-300">
        Sign in to view your saved history and payment records
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('history')}
            className={`text-sm font-semibold flex items-center gap-2 px-3 py-1.5 rounded-lg ${tab === 'history' ? 'bg-white text-slate-800 border border-slate-200' : 'text-slate-500'}`}
          >
            <History className="w-4 h-4 text-indigo-600" />
            Saved History
          </button>
          <button
            onClick={() => setTab('payments')}
            className={`text-sm font-semibold flex items-center gap-2 px-3 py-1.5 rounded-lg ${tab === 'payments' ? 'bg-white text-slate-800 border border-slate-200' : 'text-slate-500'}`}
          >
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Payment Records
          </button>
        </div>
        <button onClick={fetchAll} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Refresh</button>
      </div>

      <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Syncing...</div>
        ) : tab === 'history' ? (
          histories.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No history yet</div>
          ) : (
            histories.map((h) => (
              <div
                key={h.id}
                onClick={() => onSelectHistory(JSON.parse(h.result))}
                className="p-3 hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 px-1.5 py-0.5 bg-indigo-50 rounded">
                    {h.style}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 pr-4">
                  {JSON.parse(h.result).headlines?.[0] || 'Untitled version'}
                </p>
              </div>
            ))
          )
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No payment records yet</div>
        ) : (
          payments.map((p) => (
            <div key={p.id} className="p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <div className="text-sm font-bold text-slate-800 uppercase">{p.plan}</div>
                  <div className="text-[11px] text-slate-400">Order: {p.order_id}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600">{p.currency} {p.amount}</div>
                  <div className="text-[11px] text-slate-400">{new Date(p.created_at).toLocaleString()}</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> {p.status}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryManager;
